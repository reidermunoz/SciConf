export default function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmar acción',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'warning', // 'danger' | 'warning'
    loading = false,
}) {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';
    const styles = isDanger
        ? {
              iconBg: 'bg-rose-100 text-rose-600',
              icon: '⚠️',
              confirmBtn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30',
              border: 'border-rose-200',
          }
        : {
              iconBg: 'bg-amber-100 text-amber-700',
              icon: '⚠️',
              confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30',
              border: 'border-amber-200',
          };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <div className={`w-full max-w-md rounded-2xl border ${styles.border} bg-white p-6 shadow-2xl transition-all`}>
                <div className="flex items-start gap-3.5">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg ${styles.iconBg}`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900">{title}</h3>
                        <div className="mt-2 text-sm leading-relaxed text-gray-600">
                            {message}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-xs transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles.confirmBtn}`}
                    >
                        {loading ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
