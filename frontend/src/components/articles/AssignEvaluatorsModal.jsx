import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { assignEvaluators, getSuggestedEvaluators } from '../../api/articleApi';
import useAuth from '../../hooks/useAuth';

export default function AssignEvaluatorsModal({ isOpen, onClose, onAssigned, article }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [suggestedIds, setSuggestedIds] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (!isOpen || !article) return;
        let active = true;
        setLoading(true);
        getSuggestedEvaluators(article.id)
            .then((res) => {
                if (!active) return;
                setCandidates(res.data.candidates || []);
                setSuggestedIds(res.data.suggested_ids || []);
                setSelectedIds(res.data.assigned_ids || []);
            })
            .catch(() => {
                if (!active) return;
                toast.error('No se pudieron cargar los miembros del comité.');
                setCandidates([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [isOpen, article]);

    if (!isOpen || !article) return null;

    const toggleCandidate = (id) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            }
            if (prev.length >= 3) {
                toast.error('Puedes asignar máximo 3 jurados por artículo.');
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleApplySuggested = () => {
        if (suggestedIds.length === 0) {
            toast.error('No hay suficientes jurados disponibles para sugerir.');
            return;
        }
        setSelectedIds(suggestedIds);
        toast.success('Sugerencia por línea temática aplicada');
    };

    const canSelfAssign =
        currentUser?.id &&
        currentUser.id !== article.author &&
        candidates.some((c) => c.id === currentUser.id);

    const handleSelfAssign = () => {
        if (!canSelfAssign) return;
        toggleCandidate(currentUser.id);
    };

    const handleRandomAssign = async () => {
        setSaving(true);
        try {
            const res = await assignEvaluators(article.id);
            toast.success(res.data?.message || 'Jurados asignados aleatoriamente');
            onAssigned();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'No se pudo realizar la asignación aleatoria.');
        } finally {
            setSaving(false);
        }
    };

    const handleClearAll = () => {
        setSelectedIds([]);
    };

    const handleSaveManual = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await assignEvaluators(article.id, selectedIds);
            toast.success(res.data?.message || 'Jurados actualizados correctamente');
            onAssigned();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al actualizar los jurados.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Asignar Jurados</h3>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{article.title}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                            {article.thematic_line}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Acciones rápidas: Sugerencia por temática, Autoasignarme, Aleatoria */}
                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleApplySuggested}
                        disabled={loading || saving}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition disabled:opacity-50"
                    >
                        ✨ Sugerir por temática
                    </button>
                    {canSelfAssign && (
                        <button
                            type="button"
                            onClick={handleSelfAssign}
                            disabled={loading || saving}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                selectedIds.includes(currentUser.id)
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {selectedIds.includes(currentUser.id) ? '✓ Autoasignado' : '🙋 Autoasignarme'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleRandomAssign}
                        disabled={loading || saving}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        🎲 Asignación aleatoria
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            disabled={loading || saving}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                        >
                            🗑️ Quitar todos
                        </button>
                    )}
                </div>

                <form onSubmit={handleSaveManual}>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-gray-500">Cargando miembros del comité...</p>
                    ) : candidates.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                            No hay miembros del comité científico disponibles para asignar a este artículo.
                        </p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto flex flex-col gap-2 pr-1">
                            {candidates.map((c) => {
                                const checked = selectedIds.includes(c.id);
                                const isSuggested = suggestedIds.includes(c.id);
                                return (
                                    <label
                                        key={c.id}
                                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                                            checked
                                                ? 'border-brand-500 bg-brand-50/60'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleCandidate(c.id)}
                                                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold text-gray-800">{c.full_name}</span>
                                                    {c.is_current_user && (
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                                                            Tú
                                                        </span>
                                                    )}
                                                    {isSuggested && (
                                                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                                            Sugerido
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{c.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right text-[11px] text-gray-500">
                                            <p className="font-medium text-gray-700">
                                                {c.thematic_reviews_count} en temática
                                            </p>
                                            <p>{c.total_assigned_count} asignados</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="text-xs text-gray-500">
                            Seleccionados: <strong>{selectedIds.length}</strong> / 3
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || loading}
                                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : `Guardar (${selectedIds.length}/3)`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
