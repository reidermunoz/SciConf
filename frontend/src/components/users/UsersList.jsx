import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getUsers, getRoles, deleteUser, updateUser } from "../../api/userApi";
import useAuth, { ROLES, updateAuthUser } from "../../hooks/useAuth";

export default function UserList({ refreshTrigger, onLoadingChange }) {
    const { user: currentUser, isAdmin, isCommittee, canManageUsers, canChangeRoles } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [openRoleMenuUserId, setOpenRoleMenuUserId] = useState(null);

    // Estado del modal de edición
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        institution: "",
        roles: [],
        is_active: true,
    });

    const adminRoleId = roles.find((r) => r.name === ROLES.ADMIN)?.id;
    const isTargetAdmin = (targetUser) =>
        Boolean(
            targetUser?.roles_detail?.some((r) => r.name === ROLES.ADMIN) ||
            (adminRoleId && (targetUser?.roles || []).includes(adminRoleId))
        );
    const canModifyTarget = (targetUser) =>
        isAdmin || (canManageUsers && !isTargetAdmin(targetUser));
    const assignableRoles = isAdmin
        ? roles
        : isCommittee
        ? roles.filter((r) => r.name !== ROLES.ADMIN)
        : [];

    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async (isManual = false) => {
        setLoading(true);
        if (onLoadingChange) onLoadingChange(true);
        setError(false);
        try {
            const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
            setUsers(usersResponse.data);
            setRoles(rolesResponse.data);
            if (isManual) {
                toast.success("Lista de usuarios actualizada");
            }
        } catch {
            setError(true);
            if (isManual) {
                toast.error("Error al actualizar la lista de usuarios");
            }
        } finally {
            setLoading(false);
            if (onLoadingChange) onLoadingChange(false);
        }
    }, [onLoadingChange]);

    useEffect(() => {
        fetchData(Boolean(refreshTrigger && refreshTrigger > 0));
    }, [fetchData, refreshTrigger]);

    const userRoleNames = (userRoleIds = []) =>
        roles.filter((role) => userRoleIds.includes(role.id)).map((role) => role.name);

    // Filtros locales en la tabla
    const filteredUsers = users.filter((u) => {
        const text = search.toLowerCase();
        const matchesText =
            u.username.toLowerCase().includes(text) ||
            u.email.toLowerCase().includes(text) ||
            (u.first_name && u.first_name.toLowerCase().includes(text)) ||
            (u.last_name && u.last_name.toLowerCase().includes(text));
        const userRoles = u.roles || [];
        const matchesRole =
            roleFilter === ""
                ? true
                : roleFilter === "none"
                ? userRoles.length === 0
                : userRoles.includes(Number(roleFilter));
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && u.is_active) ||
            (statusFilter === "inactive" && !u.is_active);
        return matchesText && matchesRole && matchesStatus;
    });

    // Eliminar usuario (solo Admin o Comité)
    const handleDelete = async (targetUser) => {
        if (targetUser.id === currentUser?.id) {
            toast.error("No puedes eliminar tu propia cuenta en uso.");
            return;
        }
        if (!window.confirm(`¿Estás seguro de eliminar al usuario "${targetUser.username}"?`)) return;
        try {
            await deleteUser(targetUser.id);
            setUsers((current) => current.filter((u) => u.id !== targetUser.id));
            toast.success("Usuario eliminado correctamente");
        } catch (err) {
            toast.error(err.response?.data?.error || "No se pudo eliminar el usuario");
        }
    };

    // Habilitar / Deshabilitar usuario (solo Admin o Comité)
    const handleToggleActive = async (targetUser) => {
        if (targetUser.id === currentUser?.id) {
            toast.error("No puedes deshabilitar tu propia cuenta.");
            return;
        }
        const newStatus = !targetUser.is_active;
        const actionText = newStatus ? "habilitar" : "deshabilitar";
        if (!window.confirm(`¿Estás seguro de ${actionText} la cuenta de "${targetUser.username}"?`)) return;

        try {
            await updateUser(targetUser.id, { is_active: newStatus });
            setUsers((current) =>
                current.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u))
            );
            toast.success(`Cuenta ${newStatus ? "habilitada" : "deshabilitada"} exitosamente`);
        } catch (err) {
            toast.error(err.response?.data?.error || `Error al ${actionText} la cuenta`);
        }
    };

    // Activar o desactivar un rol de un usuario desde la tabla (Admin o Comité según jerarquía)
    const handleToggleTableRole = async (targetUser, roleId) => {
        if (!canModifyTarget(targetUser)) {
            toast.error("No tienes permiso para modificar los roles de un Administrador.");
            return;
        }
        const currentRoleIds = targetUser.roles || [];
        const nextRoleIds = currentRoleIds.includes(roleId)
            ? currentRoleIds.filter((id) => id !== roleId)
            : [...currentRoleIds, roleId];
        try {
            const response = await updateUser(targetUser.id, { roles: nextRoleIds });
            setUsers((current) =>
                current.map((u) => (u.id === targetUser.id ? { ...u, ...response.data } : u))
            );
            if (targetUser.id === currentUser?.id) {
                updateAuthUser({
                    ...currentUser,
                    roles: (response.data.roles_detail || []).map((r) => r.name),
                });
            }
            toast.success("Roles actualizados exitosamente");
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al actualizar los roles");
        }
    };

    // Abrir modal de edición
    const handleOpenEdit = (targetUser) => {
        if (!canModifyTarget(targetUser)) {
            toast.error("No tienes permiso para editar a un Administrador del Sistema.");
            return;
        }
        setEditingUser(targetUser);
        setEditForm({
            username: targetUser.username || "",
            first_name: targetUser.first_name || "",
            last_name: targetUser.last_name || "",
            email: targetUser.email || "",
            phone: targetUser.phone || "",
            institution: targetUser.institution || "",
            roles: targetUser.roles || [],
            is_active: targetUser.is_active ?? true,
        });
    };

    const handleToggleEditRole = (roleId) => {
        setEditForm((prev) => ({
            ...prev,
            roles: prev.roles.includes(roleId)
                ? prev.roles.filter((id) => id !== roleId)
                : [...prev.roles, roleId],
        }));
    };

    // Guardar cambios del modal de edición
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                username: editForm.username,
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                phone: editForm.phone,
                institution: editForm.institution,
            };

            // Permitir modificar is_active solo si tiene permiso y no es su propia cuenta
            if (canManageUsers && editingUser.id !== currentUser?.id) {
                payload.is_active = editForm.is_active;
            }
            
            // Admin o Comité pueden cambiar roles según jerarquía
            if (canChangeRoles && canModifyTarget(editingUser)) {
                payload.roles = editForm.roles;
            }
            const response = await updateUser(editingUser.id, payload);
            setUsers((current) =>
                current.map((u) => (u.id === editingUser.id ? { ...u, ...response.data } : u))
            );
            if (editingUser.id === currentUser?.id) {
                updateAuthUser({
                    ...currentUser,
                    username: response.data.username,
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    email: response.data.email,
                    phone: response.data.phone,
                    institution: response.data.institution,
                    roles: (response.data.roles_detail || []).map((r) => r.name),
                });
            }
            toast.success("Usuario actualizado correctamente");
            setEditingUser(null);
        } catch (err) {
            const data = err.response?.data;
            const detailMsg = data?.error || (data && typeof data === "object" ? Object.values(data).flat().join(" ") : null);
            toast.error(detailMsg || "Error al actualizar los datos del usuario");
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="rounded-2xl border border-gray-200 bg-white">
            {/* Filtros */}
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row">
                <input
                    type="search"
                    placeholder="Buscar por nombre, usuario o correo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500 md:w-52"
                >
                    <option value="">Todos los roles</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                    <option value="none">Sin rol</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500 md:w-44"
                >
                    <option value="all">Todos los estados</option>
                    <option value="active">Solo Activos</option>
                    <option value="inactive">Solo Inactivos</option>
                </select>
            </div>
            {loading && <p className="p-6 text-center text-gray-500">Cargando usuarios...</p>}
            {error && (
                <p className="p-6 text-center text-red-500">
                    No se pudieron cargar los usuarios. Verifica que el backend esté encendido o vuelve a iniciar sesión.
                </p>
            )}
            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Usuario</th>
                                <th className="px-4 py-3 font-medium">Correo</th>
                                <th className="px-4 py-3 font-medium">Teléfono</th>
                                <th className="px-4 py-3 font-medium">Roles</th>
                                <th className="px-4 py-3 font-medium">Estado</th>
                                {canManageUsers && (
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-500">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-800">{u.username}</span>
                                                {(u.first_name || u.last_name) && (
                                                    <p className="text-xs text-gray-400">
                                                        {u.first_name} {u.last_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                                    <td className="px-4 py-3 text-gray-600">{u.phone || "—"}</td>
                                    {/* Columna Roles */}
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const names = userRoleNames(u.roles || []);
                                            const isOpen = openRoleMenuUserId === u.id;
                                            return (
                                                <div className="relative">
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {names.length > 0 ? (
                                                            names.map((name) => (
                                                                <span
                                                                    key={name}
                                                                    className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-200"
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                                                                Sin rol
                                                            </span>
                                                        )}
                                                        {canChangeRoles && canModifyTarget(u) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenRoleMenuUserId(isOpen ? null : u.id)}
                                                                className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                                                title="Asignar roles"
                                                            >
                                                                {isOpen ? "Cerrar" : "▾"}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {canChangeRoles && canModifyTarget(u) && isOpen && (
                                                        <div className="absolute left-0 z-20 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                                                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                                                Asignar roles
                                                            </p>
                                                            <div className="flex flex-col gap-1">
                                                                {assignableRoles.map((r) => {
                                                                    const checked = (u.roles || []).includes(r.id);
                                                                    return (
                                                                        <label
                                                                            key={r.id}
                                                                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => handleToggleTableRole(u, r.id)}
                                                                                className="size-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                                                            />
                                                                            <span>{r.name}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    {/* Columna Estado */}
                                    <td className="px-4 py-3">
                                        {u.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200">
                                                <span className="size-1.5 rounded-full bg-rose-500"></span>
                                                Inactivo
                                            </span>
                                        )}
                                    </td>
                                    {/* Acciones: Editar, Deshabilitar/Habilitar y Eliminar (Admin o Comité con jerarquía) */}
                                    {canManageUsers && (
                                        <td className="px-4 py-3 text-right">
                                            {(() => {
                                                const allowed = canModifyTarget(u);
                                                const isSelf = u.id === currentUser?.id;
                                                return (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleOpenEdit(u)}
                                                            disabled={!allowed}
                                                            title={!allowed ? "No puedes editar a un Administrador del Sistema" : ""}
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                !allowed
                                                                    ? "cursor-not-allowed opacity-40 text-gray-400"
                                                                    : "text-brand-600 hover:bg-brand-50"
                                                            }`}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(u)}
                                                            disabled={isSelf || !allowed}
                                                            title={
                                                                isSelf
                                                                    ? "No puedes deshabilitar tu propia cuenta"
                                                                    : !allowed
                                                                    ? "No puedes deshabilitar a un Administrador del Sistema"
                                                                    : ""
                                                            }
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                isSelf || !allowed
                                                                    ? "cursor-not-allowed opacity-40 text-gray-400"
                                                                    : u.is_active
                                                                    ? "text-amber-600 hover:bg-amber-50"
                                                                    : "text-emerald-600 hover:bg-emerald-50"
                                                            }`}
                                                        >
                                                            {u.is_active ? "Deshabilitar" : "Habilitar"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(u)}
                                                            disabled={isSelf || !allowed}
                                                            title={
                                                                isSelf
                                                                    ? "No puedes eliminar tu propia cuenta"
                                                                    : !allowed
                                                                    ? "No puedes eliminar a un Administrador del Sistema"
                                                                    : ""
                                                            }
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                isSelf || !allowed
                                                                    ? "cursor-not-allowed opacity-40 text-gray-400"
                                                                    : "text-red-600 hover:bg-red-50"
                                                            }`}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <p className="p-6 text-center text-gray-500">
                            No hay usuarios que coincidan con la búsqueda.
                        </p>
                    )}
                </div>
            )}
            {!loading && !error && (
                <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
                    Mostrando {filteredUsers.length} de {users.length} usuarios
                </p>
            )}
            {/* Modal de Edición de Usuario (Admin y Comité) */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Editar Usuario
                                </h3>
                                <p className="text-xs text-gray-500">
                                    @{editingUser.username}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Nombre de usuario</label>
                                <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    required
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Nombre</label>
                                    <input
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Apellido</label>
                                    <input
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    required
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="+57 300 123 4567"
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Institución</label>
                                    <input
                                        type="text"
                                        value={editForm.institution}
                                        onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                                        placeholder="Ej. Universidad"
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>
                            {/* Admin o Comité pueden cambiar los roles en el modal (Comité solo Autor o Comité) */}
                            {canChangeRoles && canModifyTarget(editingUser) && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Roles en el sistema</label>
                                    <div className="flex flex-col gap-2 rounded-lg border border-gray-300 p-3">
                                        {assignableRoles.map((r) => {
                                            const checked = editForm.roles.includes(r.id);
                                            return (
                                                <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => handleToggleEditRole(r.id)}
                                                        className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                                    />
                                                    <span>{r.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {/* Estado activo / inactivo en el modal si no es la propia cuenta */}
                            {canManageUsers && editingUser.id !== currentUser?.id && (
                                <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <input
                                        id="edit-is-active"
                                        type="checkbox"
                                        checked={editForm.is_active}
                                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                        className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                    />
                                    <label htmlFor="edit-is-active" className="cursor-pointer text-xs font-medium text-gray-700">
                                        Cuenta activa (permite al usuario iniciar sesión en el sistema)
                                    </label>
                                </div>
                            )}
                            <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                                >
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
