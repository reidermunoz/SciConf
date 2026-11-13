import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../../api/userApi";

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
        <form onSubmit={onSubmit}>
            <h2>Crear Cuenta</h2>

            {/* 1. Nombre */}
            <div>
                <label htmlFor="firstName">Nombre</label>
                <input id="firstName" type="text" placeholder="Ej. Juan" {...register("firstName")} />
                {errors.firstName && <p style={{ color: "red" }}>{errors.firstName.message}</p>}
            </div>

            {/* 2. Apellido */}
            <div>
                <label htmlFor="lastName">Apellido</label>
                <input id="lastName" type="text" placeholder="Ej. Pérez" {...register("lastName")} />
                {errors.lastName && <p style={{ color: "red" }}>{errors.lastName.message}</p>}
            </div>

            {/* 3. Correo electrónico */}
            <div>
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" placeholder="ejemplo@correo.com" {...register("email")} />
                {errors.email && <p style={{ color: "red" }}>{errors.email.message}</p>}
            </div>

            {/* 4. Nombre de usuario */}
            <div>
                <label htmlFor="username">Nombre de usuario</label>
                <input id="username" type="text" placeholder="Ej. juanperez" {...register("username")} />
                {errors.username && <p style={{ color: "red" }}>{errors.username.message}</p>}
            </div>

            {/* 5. Contraseña */}
            <div>
                <label htmlFor="password">Contraseña</label>
                <input id="password" type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p style={{ color: "red" }}>{errors.password.message}</p>}
            </div>

            {/* 6. Confirmación de contraseña */}
            <div>
                <label htmlFor="confirmPassword">Confirmar contraseña</label>
                <input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
                {errors.confirmPassword && <p style={{ color: "red" }}>{errors.confirmPassword.message}</p>}
            </div>

            {/* 7. Institución o afiliación */}
            <div>
                <label htmlFor="institution">Institución o afiliación</label>
                <input id="institution" type="text" placeholder="Ej. Universidad Nacional" {...register("institution")} />
                {errors.institution && <p style={{ color: "red" }}>{errors.institution.message}</p>}
            </div>

            {/* 8. Teléfono */}
            <div>
                <label htmlFor="phone">Teléfono</label>
                <input id="phone" type="tel" placeholder="+57 300 123 4567" {...register("phone")} />
                {errors.phone && <p style={{ color: "red" }}>{errors.phone.message}</p>}
            </div>

            {/* 9. Aceptación de tratamiento de datos */}
            <div>
                <label htmlFor="dataTreatment">
                    <input id="dataTreatment" type="checkbox" {...register("dataTreatment")} />
                    Acepto la política de tratamiento de datos personales
                </label>
                {errors.dataTreatment && <p style={{ color: "red" }}>{errors.dataTreatment.message}</p>}
            </div>

            {/* Botón de envío */}
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrarse"}
            </button>

            {/* Enlace para volver al Login */}
            <p>
                ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión aquí</Link>
            </p>
        </form>
    );
}