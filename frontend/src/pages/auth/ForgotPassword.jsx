import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset, confirmPasswordReset } from "../../api/userApi";
import PasswordInput from "../../components/common/PasswordInput";

export default function ForgotPassword() {
    const navigate = useNavigate();

    // Controla si estamos en el paso 1 o 2
    const [step, setStep] = useState(1);

    // Datos del formulario
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Estados de carga y mensajes
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // --- PASO 1: Solicitar el PIN ---
    const handleRequestPin = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const response = await requestPasswordReset(email);
            setMessage(response.data.message || "Se ha enviado un PIN de 6 dígitos a tu correo.");
            setStep(2); // Avanzamos automáticamente al paso 2
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al solicitar el código. Revisa el correo ingresado.");
        } finally {
            setLoading(false);
        }
    };

    // --- PASO 2: Confirmar PIN y cambiar contraseña ---
    const handleConfirmReset = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        // Validaciones
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }
        setLoading(true);
        try {
            await confirmPasswordReset({
                email,
                code,
                new_password: newPassword,
            });
            alert("¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión con tu nueva clave.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al restablecer la contraseña. Verifica el PIN.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                {/* Logo y Encabezado */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        Sci<span className="text-brand-500">Conf</span>
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Recuperación de acceso al sistema
                    </p>
                </div>

                {/* Tarjeta del Formulario */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-800">
                            Recuperar Contraseña
                        </h2>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${step === 1 ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                                1
                            </span>
                            <span className="text-xs text-gray-500">Solicitar PIN</span>
                            <span className="text-xs text-gray-300">→</span>
                            <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${step === 2 ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                                2
                            </span>
                            <span className="text-xs text-gray-500">Nueva clave</span>
                        </div>
                    </div>

                    {/* Mensajes de éxito o error */}
                    {message && (
                        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <form onSubmit={step === 1 ? handleRequestPin : handleConfirmReset} className="flex flex-col gap-5">
                        {/* PASO 1: Ingreso de correo */}
                        {step === 1 && (
                            <>
                                <p className="text-sm text-gray-600">
                                    Ingresa tu correo registrado para recibir un PIN de seguridad de 6 dígitos.
                                </p>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-1.5 block text-sm font-medium text-gray-700"
                                    >
                                        Correo Electrónico
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                                >
                                    {loading ? "Enviando código..." : "Enviar código de seguridad"}
                                </button>
                            </>
                        )}

                        {/* PASO 2: Ingreso de PIN y nueva contraseña */}
                        {step === 2 && (
                            <>
                                <p className="text-sm text-gray-600">
                                    Ingresa el PIN que enviamos a <strong>{email}</strong> y define tu nueva contraseña.
                                </p>

                                <div>
                                    <label
                                        htmlFor="code"
                                        className="mb-1.5 block text-sm font-medium text-gray-700"
                                    >
                                        PIN de seguridad (6 dígitos)
                                    </label>
                                    <input
                                        id="code"
                                        type="text"
                                        maxLength="6"
                                        placeholder="Ej. 123456"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        className="h-11 w-full text-center tracking-widest font-mono text-lg rounded-lg border border-gray-300 px-3.5 text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="newPassword"
                                        className="mb-1.5 block text-sm font-medium text-gray-700"
                                    >
                                        Nueva contraseña
                                    </label>
                                    <PasswordInput
                                        id="newPassword"
                                        placeholder="Mínimo 8 caracteres"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="confirmPassword"
                                        className="mb-1.5 block text-sm font-medium text-gray-700"
                                    >
                                        Confirmar nueva contraseña
                                    </label>
                                    <PasswordInput
                                        id="confirmPassword"
                                        placeholder="Repite tu contraseña"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                                >
                                    {loading ? "Restableciendo..." : "Restablecer Contraseña"}
                                </button>

                                <div className="text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setError(""); setMessage(""); }}
                                        className="text-xs font-medium text-brand-600 hover:text-brand-500 hover:underline"
                                    >
                                        ¿No te llegó el código o necesitas cambiar de correo? Volver al Paso 1
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    {/* Enlace para regresar al Login */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        ¿Recordaste tu contraseña?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-brand-600 hover:text-brand-500 hover:underline"
                        >
                            Iniciar sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}