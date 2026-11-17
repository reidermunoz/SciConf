import { useState } from 'react';
import toast from 'react-hot-toast';
import { submitReviewEvaluation, endorsePresentation, endorsePublication } from '../../api/articleApi';

export default function ReviewModal({ isOpen, onClose, review, onSuccess }) {
    const [comments, setComments] = useState(review?.comments || '');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !review) return null;
    const article = review.article_detail || review.article;

    // Enviar evaluación inicial (Aprobado / Rechazado)
    const handleSubmitDecision = async (isApproved) => {
        if (!comments.trim()) {
            toast.error('Debes ingresar comentarios u observaciones de retroalimentación.');
            return;
        }
        
        setSubmitting(true);
        try {
            const res = await submitReviewEvaluation(review.id, {
                comments,
                is_approved: isApproved,
            });
            toast.success(res.data.message || 'Evaluación registrada exitosamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al guardar la evaluación');
        } finally {
            setSubmitting(false);
        }
    };

    // Dar aval para presentación
    const handleEndorsePresentation = async () => {
        setSubmitting(true);
        
        try {
            await endorsePresentation(review.id);
            toast.success('Aval para presentación emitido correctamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al emitir el aval');
        } finally {
            setSubmitting(false);
        }
    };

    // Dar aval para publicación
    const handleEndorsePublication = async () => {
        setSubmitting(true);

        try {
            await endorsePublication(review.id);
            toast.success('Aval para publicación emitido correctamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al emitir el aval');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                
                {/* Cabecera */}
                <div className="mb-4 flex items-start justify-between border-b pb-3">
                    <div>
                        <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            Evaluación de Artículo como Jurado
                        </span>
                        <h3 className="mt-1.5 text-xl font-bold text-gray-800">
                            {review.article_title || article?.title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex flex-col gap-5 text-sm">
                    
                    {/* Resumen de versiones enviadas para descargar */}
                    {article?.versions && article.versions.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <h4 className="font-semibold text-gray-800 mb-2">Documentos entregados por el autor:</h4>
                            <div className="flex flex-col gap-2">
                                {article.versions.map((ver) => (
                                    <div key={ver.id} className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-gray-200">
                                        <div>
                                            <p className="font-medium text-gray-800">{ver.version_type}</p>
                                            <p className="text-xs text-gray-400">
                                                Subido el {new Date(ver.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ver.file && (
                                                <a
                                                    href={ver.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-md bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition"
                                                >
                                                    Ver PDF
                                                </a>
                                            )}
                                            {ver.copyright_file && (
                                                <a
                                                    href={ver.copyright_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                                                >
                                                    Ver Copyright
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Sección 1: Evaluación Inicial */}
                    <div className="rounded-xl border border-gray-200 p-4">
                        <h4 className="font-semibold text-gray-800 mb-2">1. Evaluación y retroalimentación</h4>
                        <p className="text-xs text-gray-500 mb-3">
                            Ingresa tus observaciones técnicas sobre la propuesta y decide si el artículo debe ser aceptado para la conferencia.
                        </p>
                        <label className="block font-medium text-gray-700 mb-1">
                            Comentarios u observaciones para el autor:
                        </label>
                        <textarea
                            rows={4}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Escribe aquí los comentarios detallados..."
                            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                        
                        {/* Estado del voto actual */}
                        {review.is_approved !== null && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-gray-500">Tu voto registrado:</span>
                                <span
                                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                                        review.is_approved
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {review.is_approved ? '✓ Aprobado' : '✕ Rechazado'}
                                </span>
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSubmitDecision(true)}
                                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {submitting ? 'Guardando...' : '✓ Aceptar Artículo'}
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSubmitDecision(false)}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {submitting ? 'Guardando...' : '✕ Rechazar Artículo'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Sección 2: Avales posteriores */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">2. Avales de Corrección y Publicación</h4>
                        <div className="flex flex-col gap-3">
                            
                            {/* Aval presentación */}
                            <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-gray-200">
                                <div>
                                    <p className="font-medium text-gray-800">Aval para Presentación</p>
                                    <p className="text-xs text-gray-500">Verificar que el autor corrigió las observaciones.</p>
                                </div>
                                {review.presentation_endorsement ? (
                                    <span className="rounded-md bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                        ✓ Aval emitido
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={handleEndorsePresentation}
                                        className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition disabled:opacity-50"
                                    >
                                        Emitir Aval
                                    </button>
                                )}
                            </div>
                            
                            {/* Aval publicación */}
                            <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-gray-200">
                                <div>
                                    <p className="font-medium text-gray-800">Aval para Publicación</p>
                                    <p className="text-xs text-gray-500">Verificar versión final y documento de copyright.</p>
                                </div>
                                {review.publication_endorsement ? (
                                    <span className="rounded-md bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                        ✓ Aval emitido
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={handleEndorsePublication}
                                        className="rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition disabled:opacity-50"
                                    >
                                        Emitir Aval Final
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Pie */}
                <div className="mt-5 flex justify-end border-t pt-4">
                    <button
                        type="button"
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