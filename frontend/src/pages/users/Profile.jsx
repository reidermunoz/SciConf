import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getUser, updateUser as updateUserApi } from "../../api/userApi";
import PasswordInput from "../../components/common/PasswordInput";

export default function Profile() {
    const { user, roleName, updateUser } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        institution: "",
        password: "",
        confirm_password: "",
    });

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Cargar los datos más recientes del usuario desde la base de datos
    useEffect(() => {
        let isMounted = true;

        const fetchUserData = async () => {
            if (!user?.id) {
                setFetching(false);
                return;
            }

            try {
                const response = await getUser(user.id);
                if (isMounted && response.data) {
                    const loaded = {
                        username: response.data.username || "",
                        email: response.data.email || "",
                        first_name: response.data.first_name || "",
                        last_name: response.data.last_name || "",
                        phone: response.data.phone || "",
                        institution: response.data.institution || "",
                        password: "",
                        confirm_password: "",
                    };
                    setFormData(loaded);
                    setInitialData(loaded);

                    // Sincroniza localStorage y el estado global si había datos faltantes
                    updateUser({
                        ...user,
                        username: response.data.username,
                        email: response.data.email,
                        first_name: response.data.first_name,
                        last_name: response.data.last_name,
                        phone: response.data.phone,
                        institution: response.data.institution,
                        role: response.data.role_detail?.name || user.role,
                    });
                }
            } catch (err) {
                console.error("Error al obtener datos actualizados del usuario:", err);
                // Fallback a los datos en sesión
                if (isMounted && user) {
                    const fallback = {
                        username: user.username || "",
                        email: user.email || "",
                        first_name: user.first_name || "",
                        last_name: user.last_name || "",
                        phone: user.phone || "",
                        institution: user.institution || "",
                        password: "",
                        confirm_password: "",
                    };
                    setFormData(fallback);
                    setInitialData(fallback);
                }
            } finally {
                if (isMounted) setFetching(false);
            }
        };

        fetchUserData();

        return () => {
            isMounted = false;
        };
    }, [user?.id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Limpiar el error del campo que se está modificando
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleReset = () => {
        if (initialData) {
            setFormData({
                ...initialData,
                password: "",
                confirm_password: "",
            });
            setShowPasswordChange(false);
            setFieldErrors({});
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.username.trim()) {
            errors.username = "El nombre de usuario es obligatorio.";
        } else if (formData.username.trim().length < 3) {
            errors.username = "El nombre de usuario debe tener al menos 3 caracteres.";
        }

        if (!formData.email.trim()) {
            errors.email = "El correo electrónico es obligatorio.";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                errors.email = "Ingresa un correo electrónico válido.";
            }
        }

        if (formData.phone && formData.phone.trim()) {
            const phoneRegex = /^\+?[0-9 ]{7,15}$/;
            if (!phoneRegex.test(formData.phone.trim())) {
                errors.phone = "Teléfono no válido (ej: +57 3001234567 o 3001234567).";
            }
        }

        if (showPasswordChange || formData.password || formData.confirm_password) {
            if (!formData.password) {
                errors.password = "Debes ingresar una nueva contraseña si deseas cambiarla.";
            } else if (formData.password.length < 8) {
                errors.password = "La contraseña debe tener mínimo 8 caracteres.";
            }

            if (formData.password !== formData.confirm_password) {
                errors.confirm_password = "Las contraseñas no coinciden.";
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor revisa los errores en el formulario.");
            return;
        }

        setLoading(true);
        setFieldErrors({});

        // Construir el payload con los campos a actualizar
        const payload = {
            username: formData.username.trim(),
            email: formData.email.trim(),
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim(),
            institution: formData.institution.trim(),
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        try {
            const response = await updateUserApi(user.id, payload);

            const updatedUser = {
                ...user,
                username: response.data.username,
                email: response.data.email,
                first_name: response.data.first_name,
                last_name: response.data.last_name,
                phone: response.data.phone,
                institution: response.data.institution,
            };

            // Actualiza localStorage y el estado global en toda la aplicación
            updateUser(updatedUser);

            const updatedFormState = {
                username: response.data.username || "",
                email: response.data.email || "",
                first_name: response.data.first_name || "",
                last_name: response.data.last_name || "",
                phone: response.data.phone || "",
                institution: response.data.institution || "",
                password: "",
                confirm_password: "",
            };

            setFormData(updatedFormState);
            setInitialData(updatedFormState);
            setShowPasswordChange(false);

            if (payload.password) {
                toast.success("¡Datos personales y contraseña actualizados exitosamente!");
            } else {
                toast.success("Tus datos personales se han actualizado correctamente.");
            }
        } catch (err) {
            console.error("Error al actualizar perfil:", err);
            const backendData = err.response?.data;

            if (backendData && typeof backendData === "object") {
                const errors = {};
                Object.entries(backendData).forEach(([key, val]) => {
                    errors[key] = Array.isArray(val) ? val.join(" ") : String(val);
                });
                setFieldErrors(errors);

                const firstErrorMessage = Object.values(errors)[0];
                toast.error(firstErrorMessage || "Error al actualizar tus datos personales.");
            } else {
                toast.error(err.response?.data?.error || "Error al actualizar tus datos personales.");
            }
        } finally {
            setLoading(false);
        }
    };

    const displayName = formData.first_name
        ? `${formData.first_name} ${formData.last_name || ""}`.trim()
        : formData.username || user?.username || "Usuario";

    const initialLetter = displayName.charAt(0).toUpperCase();

    if (fetching) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="inline-block size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                    <p className="mt-3 text-sm text-gray-500">Cargando información de tu perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            {/* Encabezado */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mi Perfil</h2>
                    <p className="text-sm text-gray-500">
                        Administra y actualiza todos tus datos personales y credenciales de acceso en SciConf.
                    </p>
                </div>
            </div>

            {/* Tarjeta de Perfil */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                {/* Cabecera con Avatar y Rol */}
                <div className="mb-8 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white shadow-sm ring-4 ring-brand-50">
                            {initialLetter}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
                            <p className="text-xs text-gray-400">@{formData.username || user?.username}</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2 text-left sm:text-right">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                            Rol en el sistema
                        </span>
                        <p className="text-sm font-bold text-brand-900">
                            {roleName || user?.role || "Sin rol"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                    {/* Sección 1: Información de la Cuenta */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                            Información de la Cuenta
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Nombre de Usuario */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nombre de usuario <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="tu_usuario"
                                    required
                                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20 ${
                                        fieldErrors.username
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-gray-300 focus:border-brand-500"
                                    }`}
                                />
                                {fieldErrors.username && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>
                                )}
                            </div>

                            {/* Correo Electrónico */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Correo electrónico <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="correo@ejemplo.com"
                                    required
                                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20 ${
                                        fieldErrors.email
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-gray-300 focus:border-brand-500"
                                    }`}
                                />
                                {fieldErrors.email && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Datos Personales y Profesionales */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                            Datos Personales y Profesionales
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Nombre */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Tu nombre"
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>

                            {/* Apellidos */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Apellidos
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Tus apellidos"
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+57 300 123 4567"
                                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20 ${
                                        fieldErrors.phone
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-gray-300 focus:border-brand-500"
                                    }`}
                                />
                                {fieldErrors.phone && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                                )}
                            </div>

                            {/* Institución */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Institución / Afiliación
                                </label>
                                <input
                                    type="text"
                                    name="institution"
                                    value={formData.institution}
                                    onChange={handleChange}
                                    placeholder="Ej. Universidad del Valle"
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 3: Seguridad y Cambio de Contraseña */}
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">
                                    Seguridad y Contraseña
                                </h4>
                                <p className="text-xs text-gray-500">
                                    {showPasswordChange
                                        ? "Ingresa tu nueva contraseña para actualizarla."
                                        : "Puedes cambiar tu contraseña de acceso cuando lo desees."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordChange(!showPasswordChange);
                                    if (showPasswordChange) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            password: "",
                                            confirm_password: "",
                                        }));
                                        setFieldErrors((prev) => {
                                            const updated = { ...prev };
                                            delete updated.password;
                                            delete updated.confirm_password;
                                            return updated;
                                        });
                                    }
                                }}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                            >
                                {showPasswordChange ? "Cancelar cambio de contraseña" : "Cambiar contraseña"}
                            </button>
                        </div>

                        {showPasswordChange && (
                            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Nueva contraseña <span className="text-red-500">*</span>
                                    </label>
                                    <PasswordInput
                                        name="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20 ${
                                            fieldErrors.password
                                                ? "border-red-400 focus:border-red-500"
                                                : "border-gray-300 focus:border-brand-500"
                                        }`}
                                    />
                                    {fieldErrors.password && (
                                        <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Confirmar nueva contraseña <span className="text-red-500">*</span>
                                    </label>
                                    <PasswordInput
                                        name="confirm_password"
                                        placeholder="Repite la nueva contraseña"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20 ${
                                            fieldErrors.confirm_password
                                                ? "border-red-400 focus:border-red-500"
                                                : "border-gray-300 focus:border-brand-500"
                                        }`}
                                    />
                                    {fieldErrors.confirm_password && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {fieldErrors.confirm_password}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="mt-2 flex flex-col-reverse items-center justify-end gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition sm:w-auto"
                        >
                            Restablecer
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-center text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-60 transition sm:w-auto"
                        >
                            {loading ? (
                                <>
                                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Guardando cambios...</span>
                                </>
                            ) : (
                                "Guardar cambios"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
