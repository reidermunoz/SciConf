import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset, confirmPasswordReset } from "../../api/userApi";

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

    // Confirmar PIN y cambiar contraseña ---
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
            alert("¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión usando tu nueva clave.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al restablecer la contraseña. Verifica el PIN.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <form onSubmit={step === 1 ? handleRequestPin : handleConfirmReset}>
            <h2>Recuperar Contraseña</h2>

            {/* Mensajes de éxito o error */}
            {message && <p style={{ color: "green" }}>{message}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            
            {/* Ingreso de correo */}
            {step === 1 && (
                <div>
                    <p>Ingresa tu correo registrado para recibir un PIN de seguridad de 6 dígitos.</p>
                    
                    <div>
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading}>
                        {loading ? "Enviando código..." : "Enviar código de seguridad"}
                    </button>
                </div>
            )}

            {/* Ingreso de PIN y nueva contraseña */}
            {step === 2 && (
                <div>
                    <p>
                        Ingresa el PIN que enviamos a <strong>{email}</strong> y define tu nueva contraseña.
                    </p>
                    {/* Campo para el PIN */}
                    <div>
                        <label htmlFor="code">PIN de 6 dígitos</label>
                        <input
                            id="code"
                            type="text"
                            maxLength="6"
                            placeholder="Ej. 123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>

                    {/* Nueva contraseña */}
                    <div>
                        <label htmlFor="newPassword">Nueva contraseña</label>
                        <input
                            id="newPassword"
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* Confirmar nueva contraseña */}
                    <div>
                        <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            placeholder="Repite la contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading}>
                        {loading ? "Restableciendo..." : "Restablecer Contraseña"}
                    </button>
                    <div style={{ marginTop: "10px" }}>
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(""); setMessage(""); }}
                            style={{ background: "none", border: "none", color: "blue", cursor: "pointer", textDecoration: "underline" }}
                        >
                            ¿No te llegó el código o te equivocaste de correo? Volver al Paso 1
                        </button>
                    </div>
                </div>
            )}
            
            {/* Enlace para regresar al Login */}
            <p style={{ marginTop: "20px" }}>
                <Link to="/login">Volver a Iniciar Sesión</Link>
            </p>
        </form>
    );
}