// Página temporal para los módulos que aún no están construidos
export default function ComingSoon({ title }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="mt-2 text-gray-500">Este módulo está en construcción.</p>
        </div>
    )
}
