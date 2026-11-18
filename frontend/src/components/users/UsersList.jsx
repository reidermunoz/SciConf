import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getUsers, getRoles, deleteUser, updateUser } from "../../api/userApi";
import useAuth from "../../hooks/useAuth";

export default function UserList({ refreshTrigger, onLoadingChange }) {
    const { user: currentUser, canManageUsers, canChangeRoles } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Estado del modal de edición
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        institution: "",
        role: "",
        is_active: true,
    });

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

    const roleName = (roleId) => roles.find((role) => role.id === roleId)?.name ?? "Sin rol";

    // Filtros locales en la tabla
    const filteredUsers = users.filter((u) => {
        const text = search.toLowerCase();
        const matchesText =
            u.username.toLowerCase().includes(text) ||
            u.email.toLowerCase().includes(text) ||
            (u.first_name && u.first_name.toLowerCase().includes(text)) ||
            (u.last_name && u.last_name.toLowerCase().includes(text));
        const matchesRole = roleFilter === "" || String(u.role ?? "none") === roleFilter;
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

    // Cambiar rol de un usuario desde el selector de la tabla (solo Admin)
    const handleRoleChange = async (userId, newRoleId) => {
        try {
            await updateUser(userId, { role: newRoleId ? Number(newRoleId) : null });
            setUsers((current) =>
                current.map((u) => (u.id === userId ? { ...u, role: newRoleId ? Number(newRoleId) : null } : u))
            );
            toast.success("Rol actualizado exitosamente");
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al actualizar el rol");
        }
    };

    // Abrir modal de edición
    const handleOpenEdit = (targetUser) => {
        setEditingUser(targetUser);
        setEditForm({
            first_name: targetUser.first_name || "",
            last_name: targetUser.last_name || "",
            email: targetUser.email || "",
            phone: targetUser.phone || "",
            institution: targetUser.institution || "",
            role: targetUser.role || "",
            is_active: targetUser.is_active ?? true,
        });
    };

    // Guardar cambios del modal de edición
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
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
            
            // Solo si es Admin se puede cambiar el rol en el modal
            if (canChangeRoles && editForm.role !== "") {
                payload.role = Number(editForm.role);
            }
            const response = await updateUser(editingUser.id, payload);
            setUsers((current) =>
                current.map((u) => (u.id === editingUser.id ? { ...u, ...response.data } : u))
            );
            toast.success("Usuario actualizado correctamente");
            setEditingUser(null);
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al actualizar los datos del usuario");
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
                                <th className="px-4 py-3 font-medium">Rol</th>
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
                                    {/* Columna Rol */}
                                    <td className="px-4 py-3">
                                        {canChangeRoles ? (
                                            <select
                                                value={u.role ?? ""}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-brand-500"
                                            >
                                                <option value="">Sin rol</option>
                                                {roles.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                                {roleName(u.role)}
                                            </span>
                                        )}
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
                                    {/* Acciones: Editar, Deshabilitar/Habilitar y Eliminar (Solo Admin o Comité) */}
                                    {canManageUsers && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleOpenEdit(u)}
                                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(u)}
                                                    disabled={u.id === currentUser?.id}
                                                    title={u.id === currentUser?.id ? "No puedes deshabilitar tu propia cuenta" : ""}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                        u.id === currentUser?.id
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
                                                    disabled={u.id === currentUser?.id}
                                                    title={u.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : ""}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                        u.id === currentUser?.id
                                                            ? "cursor-not-allowed opacity-40 text-gray-400"
                                                            : "text-red-600 hover:bg-red-50"
                                                    }`}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
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
                            {/* Solo el Administrador puede cambiar el rol en el modal */}
                            {canChangeRoles && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Rol en el sistema</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                                    >
                                        <option value="">Sin rol</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
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
