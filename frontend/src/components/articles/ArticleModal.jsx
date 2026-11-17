import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createArticle, updateArticle, THEMATIC_LINES } from '../../api/articleApi';


export default function ArticleModal({ isOpen, onClose, onSaved, articleToEdit = null }) {
    const isEditing = !!articleToEdit;

    const [formData, setFormData] = useState({
        title: '',
        thematic_line: THEMATIC_LINES[0],
        abstract: '',
    });

    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (articleToEdit) {
            setFormData({
                title: articleToEdit.title || '',
                thematic_line: articleToEdit.thematic_line || THEMATIC_LINES[0],
                abstract: articleToEdit.abstract || '',
            });
        } else {
            setFormData({
                title: '',
                thematic_line: THEMATIC_LINES[0],
                abstract: '',
            });
        }
    }, [articleToEdit, isOpen]);
    if (!isOpen) return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.abstract.trim()) {
            toast.error('El título y el resumen son obligatorios.');
            return;
        }
        setLoading(true);
        try {
            if (isEditing) {
                await updateArticle(articleToEdit.id, formData);
                toast.success('Artículo actualizado exitosamente.');
            } else {
                await createArticle(formData);
                toast.success('Artículo propuesto exitosamente.');
            }
            onSaved();
            onClose();
        } catch (err) {
            const errorMsg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'Ocurrió un error al guardar el artículo.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <h3 className="text-xl font-bold text-gray-800">
                        {isEditing ? 'Modificar Artículo' : 'Proponer Nuevo Artículo'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Título */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Título del Artículo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej. Arquitecturas Modernas en Sistemas Distribuidos"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                    {/* Línea Temática */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Línea Temática <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.thematic_line}
                            onChange={(e) => setFormData({ ...formData, thematic_line: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            {THEMATIC_LINES.map((line) => (
                                <option key={line} value={line}>
                                    {line}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Resumen / Abstract */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Resumen (Abstract) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            rows={6}
                            value={formData.abstract}
                            onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                            placeholder="Describe los objetivos, metodología, resultados y conclusiones del artículo..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                    {/* Botones de acción */}
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
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Proponer Artículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}