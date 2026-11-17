import { useState } from 'react';
import toast from 'react-hot-toast';
import { disableArticle } from '../../api/articleApi';


export default function DisableArticleModal({ isOpen, onClose, onUpdated, article }) {
    if (!isOpen || !article) return null;

    const isCurrentlyActive = article.is_active;

    const [reason, setReason] = useState(article.deactivation_reason || '');

    const [loading, setLoading] = useState(false);

    const handleAction = async (e) => {
        e.preventDefault();
        
        // Si se va a deshabilitar, requerimos un motivo claro
        if (isCurrentlyActive && !reason.trim()) {
            toast.error('Por favor indique el motivo de la deshabilitación.');
            return;
        }
        setLoading(true);
        try {
            await disableArticle(article.id, {
                is_active: !isCurrentlyActive, // Invierte el estado actual
                deactivation_reason: isCurrentlyActive ? reason : '',
            });
            toast.success(
                isCurrentlyActive
                    ? 'Artículo deshabilitado para la conferencia.'
                    : 'Artículo reactivado exitosamente.'
            );
            onUpdated();
            onClose();
        } catch (err) {
            const errorMsg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'No se pudo actualizar el estado del artículo.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl transition-all">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                        {isCurrentlyActive ? 'Deshabilitar Artículo' : 'Reactivar Artículo'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Artículo: <span className="font-semibold text-gray-700">{article.title}</span>
                    </p>
                </div>
                <form onSubmit={handleAction} className="flex flex-col gap-4">
                    {isCurrentlyActive ? (
                        <>
                            <p className="text-sm text-gray-600">
                                Al deshabilitar este artículo, no formará parte del programa de la conferencia.
                            </p>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Motivo de deshabilitación <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Indique el motivo (ej. fuera de plazo, formato no válido, etc.)"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-600">
                            ¿Deseas habilitar nuevamente este artículo para que participe en la conferencia?
                        </p>
                    )}
                    <div className="mt-4 flex justify-end gap-3 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                                isCurrentlyActive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {loading
                                ? 'Procesando...'
                                : isCurrentlyActive
                                ? 'Deshabilitar Artículo'
                                : 'Habilitar Artículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}