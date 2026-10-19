import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUsers, getRoles, deleteUser } from "../../api/userApi";


export default function UserList() {
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
    const filteredUsers = users.filter((user) => {
        const text = search.toLowerCase();
        const matchesText = user.username.toLowerCase().includes(text) || user.email.toLowerCase().includes(text);
        const matchesRole = roleFilter === "" || String(user.role ?? "none") === roleFilter;
        return matchesText && matchesRole;
    });

    const handleDelete = async (user) => {
        if (!window.confirm(`¿Eliminar al usuario "${user.username}"?`)) return;
        try {
            await deleteUser(user.id);
            setUsers((current) => current.filter((u) => u.id !== user.id));
            toast.success("Usuario eliminado");
        } catch {
            toast.error("No se pudo eliminar el usuario");
        }
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white">
            {/* Filtros */}
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row">
                <input
                    type="search"
                    placeholder="Buscar por usuario o correo..."
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
                        <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                    <option value="none">Sin rol</option>
                </select>
            </div>

            {loading && <p className="p-6 text-center text-gray-500">Cargando usuarios...</p>}

            {error && (
                <p className="p-6 text-center text-red-500">
                    No se pudieron cargar los usuarios. Verifica que el backend esté encendido.
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
                                <th className="px-4 py-3 text-right font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-500">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-800">{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                    <td className="px-4 py-3 text-gray-600">{user.phone || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                            {roleName(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(user)}
                                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <p className="p-6 text-center text-gray-500">No hay usuarios que coincidan con la búsqueda.</p>
                    )}
                </div>
            )}

            {!loading && !error && (
                <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
                    Mostrando {filteredUsers.length} de {users.length} usuarios
                </p>
            )}
        </div>
    )
}
