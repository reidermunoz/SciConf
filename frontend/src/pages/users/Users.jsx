import { useState } from "react";
import { Link } from "react-router-dom";
import ListUsers from "../../components/users/UsersList";
import useAuth from "../../hooks/useAuth";

export default function Users() {
    const { canManageUsers } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [loading, setLoading] = useState(false);
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
                    <p className="text-sm text-gray-500">
                        Directorio de administradores, miembros del comité científico y autores.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setRefreshTrigger((prev) => prev + 1)}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:text-brand-600 transition disabled:opacity-60"
                        title="Actualizar datos desde la base de datos"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`size-4 ${loading ? "animate-spin text-brand-600" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>Actualizar</span>
                    </button>
                    {/* Solo Administradores y Miembros del Comité pueden ver el botón de crear */}
                    {canManageUsers && (
                        <Link
                            to="/create-user"
                            className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600 transition shadow-xs"
                        >
                            + Crear usuario
                        </Link>
                    )}
                </div>
            </div>
            <ListUsers refreshTrigger={refreshTrigger} onLoadingChange={setLoading} />
        </div>
    );
}
