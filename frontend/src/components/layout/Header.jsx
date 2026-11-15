import { Link } from "react-router-dom";
import { MenuIcon } from "./icons";
import useAuth from "../../hooks/useAuth";

export default function Header({ onMenuClick }) {

    const { user, roleName, logout} = useAuth();

    const displayName = user?.first_name 
        ? `${user.first_name} ${user.last_name || ""}`.trim() 
        : user?.username || "Usuario";
    
    const initialLetter = displayName.charAt(0).toUpperCase();

    const handleLogout = () => {
        if (window.confirm("¿Estás seguro de que deseas cerrar tu sesión en SciConf?")) {
            logout();
        }
    };

    return (
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
            <button className="text-gray-600 lg:hidden" onClick={onMenuClick} aria-label="Abrir menú">
                <MenuIcon className="size-6" />
            </button>
            <h1 className="hidden text-lg font-semibold text-gray-800 lg:block">
                Gestión de la Conferencia
            </h1>
            {/* Datos del usuario autenticado y acceso a Mi Perfil */}
            <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-800">{displayName}</p>
                        <p className="text-xs font-semibold text-brand-600">{roleName || "Sin rol"}</p>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-500 font-semibold text-white shadow-sm">
                        {initialLetter}
                    </div>
                </Link>
                <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                >
                    Salir
                </button>
            </div>
        </header>
    );
}
