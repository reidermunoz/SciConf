import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../../api/userApi";
import PasswordInput from "../../components/common/PasswordInput";

// 1. Esquema de validación con Zod
const registerSchema = z.object({
    firstName: z.string().min(1, "El nombre es obligatorio"),
    lastName: z.string().min(1, "El apellido es obligatorio"),
    email: z.string().email("Correo electrónico no válido"),
    username: z.string().min(3, "Mínimo 3 caracteres").max(150, "Máximo 150 caracteres"),
    password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    institution: z.string().optional(),
    phone: z.string()
        .regex(/^\+?[0-9 ]{7,15}$/, "Teléfono no válido (ej: +57 3001234567)")
        .optional()
        .or(z.literal("")),
    dataTreatment: z.literal(true, {
        errorMap: () => ({ message: "Debes aceptar el tratamiento de datos para continuar" }),
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export default function RegisterForm() {
    const navigate = useNavigate();

    // 2. Inicialización de react-hook-form con el validador de Zod
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
            institution: "",
            phone: "",
            dataTreatment: false,
        },
    });

    // 3. Envío al backend (Django)
    const onSubmit = handleSubmit(async (data) => {
        try {
            await createUser({
                username: data.username,
                email: data.email,
                password: data.password,
                first_name: data.firstName,
                last_name: data.lastName,
                institution: data.institution || null,
                phone: data.phone || null,
            });

            alert("¡Usuario registrado exitosamente en la base de datos!");
            navigate("/login");
        } catch (err) {
            console.error("Error al registrar:", err.response?.data || err);
            
            // Si el backend responde errores (ej. "ya existe este nombre de usuario" o "correo en uso")
            const backendErrors = err.response?.data;
            if (backendErrors && typeof backendErrors === "object") {
                Object.entries(backendErrors).forEach(([field, messages]) => {
                    setError(field, { message: [].concat(messages).join(" ") });
                });
            } else {
                alert("Ocurrió un error al registrar. Por favor revisa los datos.");
            }
        }
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-xl">
                {/* Logo y Encabezado */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        Sci<span className="text-brand-500">Conf</span>
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Crea tu cuenta de autor para postular y participar en la conferencia
                    </p>
                </div>

                {/* Tarjeta del Formulario */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-xl font-bold text-gray-800">
                        Crear Cuenta
                    </h2>

                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        {/* 1. Nombre y Apellido en 2 columnas */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <input
                                    id="firstName"
                                    type="text"
                                    placeholder="Ej. Juan"
                                    {...register("firstName")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Apellido
                                </label>
                                <input
                                    id="lastName"
                                    type="text"
                                    placeholder="Ej. Pérez"
                                    {...register("lastName")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                            </div>
                        </div>

                        {/* 2. Correo y Nombre de usuario */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Correo electrónico
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="ejemplo@correo.com"
                                    {...register("email")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nombre de usuario
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Ej. juanperez"
                                    {...register("username")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
                            </div>
                        </div>

                        {/* 3. Contraseña y Confirmación */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Contraseña
                                </label>
                                <PasswordInput
                                    id="password"
                                    placeholder="Mínimo 8 caracteres"
                                    {...register("password")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Confirmar contraseña
                                </label>
                                <PasswordInput
                                    id="confirmPassword"
                                    placeholder="Repite la contraseña"
                                    {...register("confirmPassword")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                            </div>
                        </div>

                        {/* 4. Institución y Teléfono */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="institution" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Institución o afiliación
                                </label>
                                <input
                                    id="institution"
                                    type="text"
                                    placeholder="Ej. Universidad del Valle"
                                    {...register("institution")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.institution && <p className="mt-1 text-xs text-red-500">{errors.institution.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Teléfono (opcional)
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+57 300 123 4567"
                                    {...register("phone")}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                            </div>
                        </div>

                        {/* 5. Aceptación de tratamiento de datos */}
                        <div className="pt-2">
                            <label htmlFor="dataTreatment" className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    id="dataTreatment"
                                    type="checkbox"
                                    {...register("dataTreatment")}
                                    className="size-4 mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                                />
                                <span className="text-xs text-gray-600">
                                    Acepto la política de tratamiento de datos personales para la gestión de la conferencia.
                                </span>
                            </label>
                            {errors.dataTreatment && (
                                <p className="mt-1 text-xs text-red-500">{errors.dataTreatment.message}</p>
                            )}
                        </div>

                        {/* Botón de envío */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-3 flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                        >
                            {isSubmitting ? "Registrando..." : "Registrarse"}
                        </button>
                    </form>

                    {/* Enlace para volver al Login */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        ¿Ya tienes una cuenta?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-brand-600 hover:text-brand-500 hover:underline"
                        >
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}