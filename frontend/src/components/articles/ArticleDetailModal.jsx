export default function ArticleDetailModal({ isOpen, onClose, article }) {
    if (!isOpen || !article) return null;

    const formattedDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });

    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl transition-all">
                
                {/* Cabecera */}
                <div className="mb-4 flex items-start justify-between border-b pb-3">
                    <div>
                        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            {article.thematic_line}
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-gray-800">{article.title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido / Detalles */}
                <div className="flex flex-col gap-4 text-sm text-gray-700 max-h-[70vh] overflow-y-auto pr-1">

                    {/* Estado de Habilitación y Estado del Artículo */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">Estado en la conferencia:</span>
                            {article.is_active ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    Habilitado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                    Deshabilitado
                                </span>
                            )}
                        </div>
                        {article.status && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">Estado actual:</span>
                                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200">
                                    {article.status}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Si está deshabilitado, mostrar el motivo */}
                    {!article.is_active && article.deactivation_reason && (
                        <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                            <p className="font-semibold text-red-800 text-xs">Motivo de deshabilitación:</p>
                            <p className="text-red-700 mt-0.5">{article.deactivation_reason}</p>
                        </div>
                    )}

                    {/* Autor */}
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Autor principal</p>
                            <p className="font-semibold text-gray-800">{article.author_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Correo electrónico</p>
                            <p className="font-semibold text-gray-800">{article.author_email || 'No disponible'}</p>
                        </div>
                    </div>
                    
                    {/* Resumen */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1">Resumen (Abstract):</p>
                        <p className="whitespace-pre-line text-gray-600 bg-gray-50/50 p-3.5 rounded-lg border border-gray-100 leading-relaxed">
                            {article.abstract}
                        </p>
                    </div>

                    {/* Palabras clave */}
                    {article.keywords && (
                        <div>
                            <p className="font-semibold text-gray-900 mb-1">Palabras clave:</p>
                            <p className="text-xs text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                {article.keywords}
                            </p>
                        </div>
                    )}

                    {/* Coautores */}
                    {article.coauthors && article.coauthors.length > 0 && (
                        <div>
                            <p className="font-semibold text-gray-900 mb-1.5">Coautores:</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {article.coauthors.map((c, idx) => (
                                    <div key={c.id || idx} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs">
                                        <p className="font-semibold text-gray-800">{c.first_name} {c.last_name}</p>
                                        <p className="text-gray-500">{c.email}</p>
                                        <p className="text-gray-600 font-medium mt-0.5">{c.university}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Versiones cargadas */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Versiones cargadas:</p>
                        {article.versions && article.versions.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {article.versions.map((ver) => (
                                    <div key={ver.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                                        <div>
                                            <span className="font-semibold text-gray-800">{ver.version_type}</span>
                                            <span className="ml-2 text-gray-400">{formattedDate(ver.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ver.file && (
                                                <a
                                                    href={ver.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded border border-brand-200 bg-white px-2 py-0.5 font-medium text-brand-600 hover:bg-brand-50"
                                                >
                                                    PDF
                                                </a>
                                            )}
                                            {ver.copyright_file && (
                                                <a
                                                    href={ver.copyright_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded border border-amber-200 bg-white px-2 py-0.5 font-medium text-amber-700 hover:bg-amber-50"
                                                >
                                                    Copyright
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Aún no se han cargado versiones para este artículo.</p>
                        )}
                    </div>

                    {/* Evaluaciones recibidas (sin identidad del jurado) */}
                    <div>
                        <p className="font-semibold text-gray-900 mb-1.5">Evaluaciones recibidas:</p>
                        {article.reviews && article.reviews.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {article.reviews.map((rev, idx) => (
                                    <div key={rev.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-gray-800">Jurado {idx + 1}</span>
                                            {rev.is_approved === true && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Aprobado</span>
                                            )}
                                            {rev.is_approved === false && (
                                                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">Rechazado</span>
                                            )}
                                            {rev.is_approved === null && (
                                                <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-600">Pendiente</span>
                                            )}
                                        </div>
                                        {rev.comments && (
                                            <p className="mt-1.5 italic text-gray-600">"{rev.comments}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Aún no tiene evaluaciones asignadas.</p>
                        )}
                    </div>

                    {/* Metadatos de fecha */}
                    <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs text-gray-500">
                        <div>
                            <span className="font-medium">Fecha de postulación:</span> {formattedDate(article.created_at)}
                        </div>
                        <div>
                            <span className="font-medium">Última modificación:</span> {formattedDate(article.updated_at)}
                        </div>
                    </div>
                </div>

                {/* Pie de modal */}
                <div className="mt-5 flex justify-end border-t pt-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}