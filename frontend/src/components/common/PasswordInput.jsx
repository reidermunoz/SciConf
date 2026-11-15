import { useState } from "react";

export default function PasswordInput({ className, ...inputProps }) {
    const [visible, setVisible] = useState(false);
    const actionLabel = visible ? "Ocultar contraseña" : "Mostrar contraseña";

    return (
        <div className="relative">
            <input
                {...inputProps}
                type={visible ? "text" : "password"}
                className={`${className} pl-3.5 pr-12`}
            />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={actionLabel}
                title={actionLabel}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500 transition hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                >
                    {visible ? (
                        <>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.9 5.2A10.9 10.9 0 0112 5c5 0 8.3 4.5 9 7-.3 1.1-1 2.3-2.1 3.4M6.2 6.2C3.9 7.6 2.4 9.8 2 12c.7 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5"
                            />
                        </>
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
                        />
                    )}
                    {!visible && (
                        <circle
                            cx="12"
                            cy="12"
                            r="3"
                            strokeWidth={2}
                        />
                    )}
                </svg>
            </button>
        </div>
    );
}
