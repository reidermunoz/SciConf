import { useState } from 'react';
import toast from 'react-hot-toast';
import { uploadArticleVersion } from '../../api/articleApi';

const VERSION_OPTIONS = [
    { value: 'INICIAL', label: 'Propuesta inicial (PDF)' },
    { value: 'CORREGIDA', label: 'Versión corregida para presentación (PDF)' },
    { value: 'FINAL', label: 'Versión final para publicación (PDF + Copyright)' },
];

export default function UploadVersionModal({ isOpen, onClose, article, onSuccess }) {
    const [versionType, setVersionType] = useState('INICIAL');
    const [file, setFile] = useState(null);
    const [copyrightFile, setCopyrightFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !article) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error('Debes seleccionar el archivo PDF del artículo.');
            return;
        }

        //HU-16: Solo se acepta PDF de 10 MB
        if (!file.name.toLowerCase().endsWith('.pdf'))
        {
            toast.error('El archivo debe ser un PDF.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            toast.error('El archivo supera el máximo de 10 MB.');
            return;
        }

        if (versionType === 'FINAL' && !copyrightFile) {
            toast.error('Para la versión final es obligatorio adjuntar la cesión de copyright en PDF.');
            return;
        }

        const formData = new FormData();
        formData.append('version_type', versionType);
        formData.append('file', file);
        if (copyrightFile) {
            formData.append('copyright_file', copyrightFile);
        }

        setSubmitting(true);
        try {
            const res = await uploadArticleVersion(article.id, formData);
            toast.success(res.data.message || 'Versión subida exitosamente');
            setFile(null);
            setCopyrightFile(null);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al subir la versión del artículo');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl transition-all">
                
                {/* Cabecera */}
                <div className="mb-4 flex items-start justify-between border-b pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Subir Versión de Artículo</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Artículo: <span className="font-medium text-gray-700">{article.title}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Formulario */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    
                    {/* Estado actual */}
                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                        <span className="text-xs text-gray-500">Estado actual del artículo: </span>
                        <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                            {article.status || 'POSTULADO'}
                        </span>
                    </div>
                    
                    {/* Selector de versión */}
                    <div>
                        <label className="mb-1 block font-medium text-gray-700">Tipo de versión</label>
                        <select
                            value={versionType}
                            onChange={(e) => setVersionType(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        >
                            {VERSION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Archivo PDF del artículo */}
                    <div>
                        <label className="mb-1 block font-medium text-gray-700">
                            Archivo PDF del artículo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setFile(e.target.files[0] || null)}
                            required
                            className="w-full rounded-lg border border-gray-300 p-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-600 hover:file:bg-brand-100"
                        />
                        <p className="mt-1 text-xs text-gray-400">Solo se permiten archivos en formato PDF (.pdf)</p>
                    </div>
                    
                    {/* Archivo de cesión de copyright (condicional) */}
                    {versionType === 'FINAL' && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                            <label className="mb-1 block font-medium text-amber-900">
                                Documento de Cesión de Copyright (PDF) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCopyrightFile(e.target.files[0] || null)}
                                required
                                className="w-full rounded-lg border border-amber-300 bg-white p-2 file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-800 hover:file:bg-amber-200"
                            />
                            <p className="mt-1 text-xs text-amber-700">
                                La conferencia exige la cesión de derechos firmada para autorizar la publicación.
                            </p>
                        </div>
                    )}
                    
                    {/* Botones de acción */}
                    <div className="mt-3 flex justify-end gap-2 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 transition disabled:opacity-50"
                        >
                            {submitting ? 'Subiendo...' : 'Subir versión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}