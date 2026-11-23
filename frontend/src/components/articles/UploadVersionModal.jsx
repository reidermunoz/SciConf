import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { uploadArticleVersion, downloadCopyrightTemplate, getDeadlines } from '../../api/articleApi';

const VERSION_OPTIONS = [
    { value: 'INICIAL', label: 'Propuesta inicial (PDF)' },
    { value: 'CORREGIDA', label: 'Versión corregida para presentación (PDF)' },
    { value: 'FINAL', label: 'Versión final para publicación (PDF + Copyright)' },
];

export default function UploadVersionModal({ isOpen, onClose, article, onSuccess, fixedVersionType = null, deadlines = null }) {
    const [versionType, setVersionType] = useState(fixedVersionType || 'INICIAL');
    const [file, setFile] = useState(null);
    const [copyrightFile, setCopyrightFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [hasTemplate, setHasTemplate] = useState(Boolean(deadlines?.copyright_template));

    useEffect(() => {
        if (isOpen) {
            setVersionType(fixedVersionType || 'INICIAL');
            setFile(null);
            setCopyrightFile(null);
            if (deadlines) {
                setHasTemplate(Boolean(deadlines.copyright_template));
            } else {
                getDeadlines()
                    .then((res) => setHasTemplate(Boolean(res.data?.copyright_template)))
                    .catch(() => setHasTemplate(false));
            }
        }
    }, [isOpen, fixedVersionType, deadlines]);

    if (!isOpen || !article) return null;

    const handleDownloadTemplate = async () => {
        try {
            await downloadCopyrightTemplate();
        } catch {
            toast.error('No se pudo descargar la plantilla oficial de copyright.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error('Debes seleccionar el archivo PDF del artículo.');
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
                        <h3 className="text-lg font-bold text-gray-800">
                            {fixedVersionType === 'CORREGIDA'
                                ? 'Subir Versión Corregida (PDF)'
                                : fixedVersionType === 'INICIAL'
                                ? 'Reemplazar PDF Inicial'
                                : fixedVersionType === 'FINAL'
                                ? 'Subir Versión Final y Copyright'
                                : 'Subir Versión de Artículo'}
                        </h3>
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
                    
                    {/* Selector de versión (oculto si fixedVersionType está definido) */}
                    {fixedVersionType ? (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800">
                            {fixedVersionType === 'CORREGIDA' ? (
                                <>Se registrará como <strong>Versión corregida para presentación (PDF)</strong> conservando la propuesta inicial en el historial.</>
                            ) : fixedVersionType === 'FINAL' ? (
                                <>Se registrará como <strong>Versión final para publicación</strong> conservando las versiones anteriores en el historial.</>
                            ) : (
                                <>Se cargará como <strong>Propuesta inicial (PDF)</strong> dentro del plazo de postulación.</>
                            )}
                        </div>
                    ) : (
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
                    )}
                    
                    {/* Plantilla oficial de Copyright en modo FINAL */}
                    {versionType === 'FINAL' && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 text-xs">
                            <p className="font-semibold text-brand-900 mb-1">1. Descarga la plantilla oficial de Copyright</p>
                            {hasTemplate ? (
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="rounded-lg bg-white border border-brand-200 px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-100 transition"
                                >
                                    📥 Descargar plantilla oficial de Copyright (PDF)
                                </button>
                            ) : (
                                <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    ℹ️ Aún no hay una plantilla oficial de copyright cargada por la organización.
                                </p>
                            )}
                        </div>
                    )}

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