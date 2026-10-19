import { Link } from "react-router-dom";
import { ChartIcon, UsersIcon, DocumentIcon, LayersIcon, CalendarIcon } from "../components/layout/icons";

const modules = [
    { to: "/dashboard", title: "Dashboard", description: "Indicadores y gráficos de la conferencia.", icon: ChartIcon },
    { to: "/users", title: "Usuarios", description: "Administradores, miembros del comité científico y autores.", icon: UsersIcon },
    { to: "/articles", title: "Artículos", description: "Postulación y consulta de artículos por línea temática.", icon: DocumentIcon },
    { to: "/versions", title: "Versiones y revisiones", description: "Evaluación del comité y avales de cada versión.", icon: LayersIcon },
    { to: "/agenda", title: "Agenda", description: "Horarios de presentación de lunes a viernes.", icon: CalendarIcon },
];

const stages = [
    { title: "Postulación", description: "Los autores envían su artículo en PDF." },
    { title: "Revisión", description: "3 miembros del comité evalúan cada artículo." },
    { title: "Corrección", description: "Versión corregida para la presentación." },
    { title: "Publicación", description: "Versión final y cesión de copyright." },
];

export default function Home() {
    return (
        <div className="flex flex-col gap-6">
            {/* Bienvenida */}
            <section className="rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white md:p-8">
                <h2 className="text-2xl font-bold md:text-3xl">Bienvenido a ConfManager</h2>
                <p className="mt-2 max-w-2xl text-white/90">
                    Gestiona la parte científica de la conferencia: comité, autores, artículos y agenda del evento.
                </p>
                <Link to="/dashboard"
                    className="mt-5 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50">
                    Ver dashboard
                </Link>
            </section>

            {/* Accesos a los módulos */}
            <section>
                <h3 className="mb-3 text-lg font-semibold text-gray-800">Módulos</h3>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map(({ to, title, description, icon: ModuleIcon }) => (
                        <Link key={to} to={to}
                            className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-500 hover:shadow-sm">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                                <ModuleIcon className="size-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">{title}</p>
                                <p className="mt-1 text-sm text-gray-500">{description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Etapas del proceso de un artículo */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">Etapas de un artículo</h3>
                <ol className="grid gap-4 md:grid-cols-4">
                    {stages.map((stage, index) => (
                        <li key={stage.title} className="flex gap-3 md:flex-col">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                                {index + 1}
                            </span>
                            <div>
                                <p className="font-medium text-gray-800">{stage.title}</p>
                                <p className="text-sm text-gray-500">{stage.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    )
}
