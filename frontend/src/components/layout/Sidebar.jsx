import { NavLink } from "react-router-dom";
import { HomeIcon, ChartIcon, UsersIcon, DocumentIcon, LayersIcon, CalendarIcon, CloseIcon } from "./icons";

const menu = [
    { to: "/", label: "Inicio", icon: HomeIcon, end: true },
    { to: "/dashboard", label: "Dashboard", icon: ChartIcon },
    { to: "/users", label: "Usuarios", icon: UsersIcon },
    { to: "/articles", label: "Artículos", icon: DocumentIcon },
    { to: "/versions", label: "Versiones y revisiones", icon: LayersIcon },
    { to: "/agenda", label: "Agenda", icon: CalendarIcon },
];

export default function Sidebar({ open, onClose }) {
    return (
        <>
            {/* Fondo oscuro detrás del menú en celular */}
            {open && (
                <div className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white
                    transition-transform duration-300 lg:translate-x-0
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex h-16 items-center justify-between px-6">
                    <span className="text-xl font-bold text-gray-800">
                        Conf<span className="text-brand-500">Manager</span>
                    </span>
                    <button className="text-gray-500 lg:hidden" onClick={onClose} aria-label="Cerrar menú">
                        <CloseIcon />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4">
                    <p className="mb-3 px-3 text-xs font-medium uppercase text-gray-400">Menú</p>
                    <ul className="flex flex-col gap-1">
                        {menu.map(({ to, label, icon: ItemIcon, end }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    end={end}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive
                                            ? "bg-brand-50 text-brand-500"
                                            : "text-gray-700 hover:bg-gray-100"}`
                                    }
                                >
                                    <ItemIcon />
                                    {label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    )
}
