import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getCaptcha } from "../../api/userApi";
import PasswordInput from "../../components/common/PasswordInput";

export default function LoginForm() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ 
        email: "", 
        password: "", 
        captcha_input: "" 
    });
    const [captchaKey, setCaptchaKey] = useState("");
    const [captchaSvg, setCaptchaSvg] = useState("");
    const [captchaLoading, setCaptchaLoading] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Carga o regenera el CAPTCHA desde el backend
    const loadCaptcha = async () => {
        setCaptchaLoading(true);
        try {
            const res = await getCaptcha();
            setCaptchaKey(res.data.captcha_key);
            setCaptchaSvg(res.data.captcha_svg);
            // Limpia el input del captcha para que el usuario escriba el nuevo
            setCredentials((prev) => ({ ...prev, captcha_input: "" }));
        } catch (err) {
            console.error("Error al cargar el CAPTCHA:", err);
        } finally {
            setCaptchaLoading(false);
        }
    };
    useEffect(() => {
        loadCaptcha();
    }, []);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({
            ...credentials,
            [name]: name === "captcha_input" ? value.trim().toUpperCase() : value,
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await loginUser({
                email: credentials.email,
                password: credentials.password,
                captcha_key: captchaKey,
                captcha_input: credentials.captcha_input,
            });
            const { access, refresh, user } = response.data;
            // Guardamos la sesión en el navegador
            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);
            localStorage.setItem("user", JSON.stringify(user));
            navigate("/");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al iniciar sesión. Revisa tus datos.");
            // Por seguridad, regeneramos el captcha tras cada intento fallido
            loadCaptcha();
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
                        Plataforma de gestión de conferencias científicas
                    </p>
                </div>
                {/* Tarjeta del Formulario */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-xl font-bold text-gray-800">
                        Iniciar Sesión
                    </h2>
                    {error && (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Campo: Correo o Usuario */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-gray-700"
                            >
                                Correo electrónico o usuario
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                placeholder="ejemplo@correo.com o tu_usuario"
                                value={credentials.email}
                                onChange={handleChange}
                                required
                                className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                        {/* Campo: Contraseña */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Contraseña
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-medium text-brand-600 hover:text-brand-500 hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                        {/* Campo: CAPTCHA de Seguridad */}
                        <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-3.5">
                            <label
                                htmlFor="captcha_input"
                                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500"
                            >
                                Verificación de seguridad (CAPTCHA)
                            </label>
                            <div className="mb-3 flex items-center gap-3">
                                {captchaSvg ? (
                                    <div
                                        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
                                        dangerouslySetInnerHTML={{ __html: captchaSvg }}
                                    />
                                ) : (
                                    <div className="h-11 w-40 animate-pulse rounded-lg bg-gray-200" />
                                )}
                                <button
                                    type="button"
                                    onClick={loadCaptcha}
                                    disabled={captchaLoading}
                                    title="Generar nuevo código"
                                    className="flex size-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-brand-600"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`size-5 ${captchaLoading ? "animate-spin" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <input
                                id="captcha_input"
                                name="captcha_input"
                                type="text"
                                placeholder="Escribe los 5 caracteres aquí"
                                value={credentials.captcha_input}
                                onChange={handleChange}
                                required
                                maxLength={5}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-center font-mono text-base font-bold uppercase tracking-widest text-gray-800 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                        {/* Botón de envío */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                        >
                            {loading ? "Ingresando..." : "Iniciar Sesión"}
                        </button>
                    </form>
                    {/* Enlace a Registro */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        ¿No tienes una cuenta?{" "}
                        <Link
                            to="/register"
                            className="font-medium text-brand-600 hover:text-brand-500 hover:underline"
                        >
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}