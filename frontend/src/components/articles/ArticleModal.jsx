import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createArticle, updateArticle, THEMATIC_LINES } from '../../api/articleApi';

const EMPTY_COAUTHOR = {
    first_name: '',
    last_name: '',
    email: '',
    university: '',
};

export default function ArticleModal({ isOpen, onClose, onSaved, articleToEdit = null }) {
    const isEditing = !!articleToEdit;

    const [formData, setFormData] = useState({
        title: '',
        thematic_line: THEMATIC_LINES[0],
        keywords: '',
        abstract: '',
    });
    const [coauthors, setCoauthors] = useState([]);
    const [initialPdf, setInitialPdf] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (articleToEdit) {
            setFormData({
                title: articleToEdit.title || '',
                thematic_line: articleToEdit.thematic_line || THEMATIC_LINES[0],
                keywords: articleToEdit.keywords || '',
                abstract: articleToEdit.abstract || '',
            });
            setCoauthors(
                (articleToEdit.coauthors || []).map((c) => ({
                    first_name: c.first_name || '',
                    last_name: c.last_name || '',
                    email: c.email || '',
                    university: c.university || '',
                }))
            );
        } else {
            setFormData({
                title: '',
                thematic_line: THEMATIC_LINES[0],
                keywords: '',
                abstract: '',
            });
            setCoauthors([]);
        }
        setInitialPdf(null);
    }, [articleToEdit, isOpen]);

    if (!isOpen) return null;

    const existingInitialVersion = articleToEdit?.versions?.find((v) => v.version_type === 'INICIAL');

    const handleAddCoauthor = () => {
        setCoauthors((prev) => [...prev, { ...EMPTY_COAUTHOR }]);
    };

    const handleRemoveCoauthor = (index) => {
        setCoauthors((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleCoauthorChange = (index, field, value) => {
        setCoauthors((prev) =>
            prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.keywords.trim() || !formData.abstract.trim()) {
            toast.error('Título, palabras clave y resumen son obligatorios.');
            return;
        }
        if (!isEditing && !initialPdf) {
            toast.error('Debes adjuntar el archivo PDF inicial del artículo.');
            return;
        }

        for (let i = 0; i < coauthors.length; i += 1) {
            const c = coauthors[i];
            if (!c.first_name.trim() || !c.last_name.trim() || !c.email.trim() || !c.university.trim()) {
                toast.error(`Completa todos los campos obligatorios del coautor ${i + 1}.`);
                return;
            }
        }

        const payload = new FormData();
        payload.append('title', formData.title.trim());
        payload.append('thematic_line', formData.thematic_line);
        payload.append('keywords', formData.keywords.trim());
        payload.append('abstract', formData.abstract.trim());
        payload.append(
            'coauthors',
            JSON.stringify(
                coauthors.map((c) => ({
                    first_name: c.first_name.trim(),
                    last_name: c.last_name.trim(),
                    email: c.email.trim(),
                    university: c.university.trim(),
                }))
            )
        );
        if (initialPdf) {
            payload.append('initial_pdf', initialPdf);
        }

        setLoading(true);
        try {
            if (isEditing) {
                await updateArticle(articleToEdit.id, payload);
                toast.success('Artículo actualizado exitosamente.');
            } else {
                await createArticle(payload);
                toast.success('Artículo propuesto exitosamente.');
            }
            onSaved();
            onClose();
        } catch (err) {
            const data = err.response?.data;
            const errorMsg =
                data?.detail ||
                data?.error ||
                (data?.coauthors ? 'Revisa los datos de los coautores.' : null) ||
                'Ocurrió un error al guardar el artículo.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <h3 className="text-xl font-bold text-gray-800">
                        {isEditing ? 'Modificar Artículo' : 'Proponer Nuevo Artículo'}
                    </h3>
                    <button
                        type="button"
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                        {/* Palabras clave */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Palabras clave <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.keywords}
                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                placeholder="Ej. IA, Microservicios, Cloud"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    {/* Resumen / Abstract */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Resumen (Abstract) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={formData.abstract}
                            onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                            placeholder="Describe los objetivos, metodología, resultados y conclusiones del artículo..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    {/* Archivo PDF inicial */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Archivo PDF inicial {!isEditing && <span className="text-red-500">*</span>}
                        </label>
                        {isEditing && existingInitialVersion?.file && (
                            <p className="mb-1.5 text-xs text-gray-500">
                                Archivo actual:{' '}
                                <a
                                    href={existingInitialVersion.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-brand-600 hover:underline"
                                >
                                    Ver PDF inicial cargado
                                </a>{' '}
                                (selecciona otro archivo solo si deseas reemplazarlo)
                            </p>
                        )}
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            required={!isEditing}
                            onChange={(e) => setInitialPdf(e.target.files?.[0] || null)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                        />
                    </div>

                    {/* Coautores */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">Coautores</h4>
                                <p className="text-xs text-gray-500">
                                    No necesitan estar registrados en el sistema. Todos los campos son obligatorios por coautor.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCoauthor}
                                className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
                            >
                                + Agregar coautor
                            </button>
                        </div>

                        {coauthors.length === 0 ? (
                            <p className="text-xs text-gray-400">Sin coautores agregados.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {coauthors.map((coauthor, idx) => (
                                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-700">
                                                Coautor {idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCoauthor(idx)}
                                                className="text-xs font-medium text-red-600 hover:underline"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Nombre *"
                                                value={coauthor.first_name}
                                                onChange={(e) => handleCoauthorChange(idx, 'first_name', e.target.value)}
                                                className="h-9 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-brand-500"
                                            />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Apellido *"
                                                value={coauthor.last_name}
                                                onChange={(e) => handleCoauthorChange(idx, 'last_name', e.target.value)}
                                                className="h-9 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-brand-500"
                                            />
                                            <input
                                                type="email"
                                                required
                                                placeholder="Correo electrónico *"
                                                value={coauthor.email}
                                                onChange={(e) => handleCoauthorChange(idx, 'email', e.target.value)}
                                                className="h-9 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-brand-500"
                                            />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Universidad de afiliación *"
                                                value={coauthor.university}
                                                onChange={(e) => handleCoauthorChange(idx, 'university', e.target.value)}
                                                className="h-9 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-brand-500"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="mt-2 flex justify-end gap-3 border-t pt-4">
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
