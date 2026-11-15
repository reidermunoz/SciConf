import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUsers, getRoles, deleteUser, updateUser } from "../../api/userApi";
import useAuth from "../../hooks/useAuth";


export default function UserList() {

    const { user: currentUser, canManageUsers, canChangeRoles } = useAuth();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
                setUsers(usersResponse.data);
                setRoles(rolesResponse.data);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const roleName = (roleId) => roles.find((role) => role.id === roleId)?.name ?? "Sin rol";

    // Filtros: texto (usuario o correo) y rol
    const filteredUsers = users.filter((u) => {
        const text = search.toLowerCase();
        const matchesText =
            u.username.toLowerCase().includes(text) ||
            u.email.toLowerCase().includes(text) ||
            (u.first_name && u.first_name.toLowerCase().includes(text)) ||
            (u.last_name && u.last_name.toLowerCase().includes(text));
        const matchesRole = roleFilter === "" || String(u.role ?? "none") === roleFilter;
        return matchesText && matchesRole;
    });

    // Eliminar usuario, solo admin y comite
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

    // Cambiar rol de un usuario (exclusivo para el administrador del sistema)
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
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500 md:w-56"
                >
                    <option value="">Todos los roles</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                    <option value="none">Sin rol</option>
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
                                    {/* Columna Rol: Selector para Admin, texto para los demás */}
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
                                    {/* Acciones: Solo visibles si canManageUsers es true */}
                                    {canManageUsers && (
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(u)}
                                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                                            >
                                                Eliminar
                                            </button>
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
        </div>
    );
}
