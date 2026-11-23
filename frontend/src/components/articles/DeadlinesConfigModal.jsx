import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { updateDeadlines, downloadCopyrightTemplate } from '../../api/articleApi';

const toLocalInputValue = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
};

export default function DeadlinesConfigModal({ isOpen, onClose, deadlines, onSaved }) {
    const [form, setForm] = useState({
        submissions_deadline: '',
        reviews_deadline: '',
        corrections_deadline: '',
        final_deadline: '',
    });
    const [templateFile, setTemplateFile] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm({
            submissions_deadline: toLocalInputValue(deadlines?.submissions_deadline),
            reviews_deadline: toLocalInputValue(deadlines?.reviews_deadline),
            corrections_deadline: toLocalInputValue(deadlines?.corrections_deadline),
            final_deadline: toLocalInputValue(deadlines?.final_deadline),
        });
        setTemplateFile(null);
    }, [isOpen, deadlines]);

    if (!isOpen) return null;

    const handleDownloadCurrent = async () => {
        try {
            await downloadCopyrightTemplate();
        } catch {
            toast.error('No se pudo descargar la plantilla de copyright.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (
            !form.submissions_deadline ||
            !form.reviews_deadline ||
            !form.corrections_deadline ||
            !form.final_deadline
        ) {
            toast.error('Debes configurar todas las fechas límite de la conferencia.');
            return;
        }

        const payload = new FormData();
        payload.append('submissions_deadline', new Date(form.submissions_deadline).toISOString());
        payload.append('reviews_deadline', new Date(form.reviews_deadline).toISOString());
        payload.append('corrections_deadline', new Date(form.corrections_deadline).toISOString());
        payload.append('final_deadline', new Date(form.final_deadline).toISOString());
        if (templateFile) {
            payload.append('copyright_template', templateFile);
        }

        setSaving(true);
        try {
            await updateDeadlines(payload);
            toast.success('Plazos y plantilla de copyright actualizados');
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            toast.error(
                err.response?.data?.copyright_template?.[0] ||
                    err.response?.data?.error ||
                    'Error al guardar la configuración.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Configuración de Plazos y Copyright</h3>
                        <p className="text-xs text-gray-500">
                            Define las fechas límite de cada etapa y la plantilla oficial de cesión de derechos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-sm">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Límite postulación inicial *</label>
                            <input
                                type="datetime-local"
                                required
                                value={form.submissions_deadline}
                                onChange={(e) => setForm({ ...form, submissions_deadline: e.target.value })}
                                className="h-10 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Límite revisiones jurados *</label>
                            <input
                                type="datetime-local"
                                required
                                value={form.reviews_deadline}
                                onChange={(e) => setForm({ ...form, reviews_deadline: e.target.value })}
                                className="h-10 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Límite correcciones *</label>
                            <input
                                type="datetime-local"
                                required
                                value={form.corrections_deadline}
                                onChange={(e) => setForm({ ...form, corrections_deadline: e.target.value })}
                                className="h-10 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Límite entrega final *</label>
                            <input
                                type="datetime-local"
                                required
                                value={form.final_deadline}
                                onChange={(e) => setForm({ ...form, final_deadline: e.target.value })}
                                className="h-10 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                        <label className="mb-1 block text-xs font-semibold text-amber-900">
                            Plantilla oficial de Copyright (PDF)
                        </label>
                        {deadlines?.copyright_template && (
                            <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs">
                                <span className="text-gray-600">Plantilla vigente cargada</span>
                                <button
                                    type="button"
                                    onClick={handleDownloadCurrent}
                                    className="font-semibold text-brand-600 hover:underline"
                                >
                                    📥 Descargar vigente
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                            className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-800 hover:file:bg-amber-200"
                        />
                    </div>

                    <div className="mt-3 flex justify-end gap-2 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar configuración'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
