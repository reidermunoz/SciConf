import { MenuIcon } from "./icons";

export default function Header({ onMenuClick }) {
    return (
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
            <button className="text-gray-600 lg:hidden" onClick={onMenuClick} aria-label="Abrir menú">
                <MenuIcon className="size-6" />
            </button>

            <h1 className="hidden text-lg font-semibold text-gray-800 lg:block">
                Gestión de la Conferencia
            </h1>

            {/* Datos del usuario: se conectarán con el login (AuthContext) */}
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">Usuario</p>
                    <p className="text-xs text-gray-500">Rol</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
                    U
                </div>
            </div>
        </header>
    )
}
