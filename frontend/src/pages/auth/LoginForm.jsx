import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getCaptcha } from "../../api/userApi";
import { updateAuthUser } from "../../hooks/useAuth";
import PasswordInput from "../../components/common/PasswordInput";
import logoSciConf from "../../assets/SciConfWhiteCut.png";

const ROLE_DESCRIPTIONS = {
    "Administrador del Sistema": "Gestión completa de usuarios, roles, artículos y configuración.",
    "Miembro Comité Científico": "Evaluación de artículos, emisión de avales y gestión de usuarios.",
    "Miembro del Comité Científico": "Evaluación de artículos, emisión de avales y gestión de usuarios.",
    "Autor": "Postulación de artículos, subida de versiones y seguimiento.",
};

const bypassCaptcha = import.meta.env.VITE_BYPASS_CAPTCHA === "true";

export default function LoginForm() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ 
        email: "", 
        password: "", 
        captcha_input: bypassCaptcha ? "BYPAS" : "" 
    });
    const [captchaKey, setCaptchaKey] = useState(bypassCaptcha ? "bypass-dev-token" : "");
    const [captchaSvg, setCaptchaSvg] = useState("");
    const [captchaLoading, setCaptchaLoading] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingSession, setPendingSession] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");
    // Carga o regenera el CAPTCHA desde el backend
    const loadCaptcha = async () => {
        setCaptchaLoading(true);
        try {
            const res = await getCaptcha();
            setCaptchaKey(bypassCaptcha ? "bypass-dev-token" : res.data.captcha_key);
            setCaptchaSvg(res.data.captcha_svg);
            // En modo pruebas autocompleta el CAPTCHA; en modo normal lo limpia
            setCredentials((prev) => ({ ...prev, captcha_input: bypassCaptcha ? "BYPAS" : "" }));
        } catch (err) {
            console.error("Error al cargar el CAPTCHA:", err);
            if (bypassCaptcha) {
                setCaptchaKey("bypass-dev-token");
                setCredentials((prev) => ({ ...prev, captcha_input: "BYPAS" }));
            }
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
    const completeLogin = (access, refresh, user, chosenRole) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        updateAuthUser({
            ...user,
            active_role: chosenRole || null,
        });
        navigate("/");
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
            const userRoles = Array.isArray(user?.roles)
                ? user.roles
                : user?.role
                ? [user.role]
                : [];

            // Si tiene más de un rol, debe elegir con cuál iniciar antes de ir a Home
            if (userRoles.length > 1) {
                setPendingSession({ access, refresh, user, roles: userRoles });
                setSelectedRole("");
                return;
            }

            completeLogin(access, refresh, user, userRoles[0] || null);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al iniciar sesión. Revisa tus datos.");
            // Por seguridad, regeneramos el captcha tras cada intento fallido
            loadCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmRole = (e) => {
        e.preventDefault();
        if (!pendingSession || !selectedRole) return;
        completeLogin(
            pendingSession.access,
            pendingSession.refresh,
            pendingSession.user,
            selectedRole
        );
    };

    const handleCancelRoleSelection = () => {
        setPendingSession(null);
        setSelectedRole("");
        loadCaptcha();
    };
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                {/* Tarjeta del Formulario */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    {/* Logo centrado en lugar del título */}
                    <div className="mb-6 flex justify-center">
                        <img
                            src={logoSciConf}
                            alt="SciConf Logo"
                            className="h-16 w-auto rounded-2xl object-contain shadow-xs"
                        />
                    </div>
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
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <label
                                    htmlFor="captcha_input"
                                    className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
                                >
                                    Verificación de seguridad (CAPTCHA)
                                </label>
                                {bypassCaptcha && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                        Modo pruebas: CAPTCHA autocompletado
                                    </span>
                                )}
                            </div>
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
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck="false"
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

            {/* Ventana modal para elegir rol cuando el usuario tiene más de uno */}
            {pendingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-[1px]">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900">
                            Selecciona tu rol para iniciar
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Hola{" "}
                            <span className="font-medium text-gray-800">
                                {pendingSession.user.first_name || pendingSession.user.username}
                            </span>
                            , tienes más de un rol asignado. Elige con cuál deseas ingresar a SciConf:
                        </p>

                        <form onSubmit={handleConfirmRole} className="mt-4 flex flex-col gap-2.5">
                            {pendingSession.roles.map((role) => {
                                const isSelected = selectedRole === role;
                                return (
                                    <label
                                        key={role}
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                                            isSelected
                                                ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20"
                                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="active_role"
                                            value={role}
                                            checked={isSelected}
                                            onChange={() => setSelectedRole(role)}
                                            className="mt-0.5 size-4 border-gray-300 text-brand-500 focus:ring-brand-500"
                                        />
                                        <div>
                                            <span className="block text-sm font-semibold text-gray-900">
                                                {role}
                                            </span>
                                            {ROLE_DESCRIPTIONS[role] && (
                                                <span className="mt-0.5 block text-xs text-gray-500">
                                                    {ROLE_DESCRIPTIONS[role]}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}

                            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancelRoleSelection}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedRole}
                                    className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Ingresar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}