import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createUser, getRoles } from "../../api/userApi";
import { userSchema } from "../../schemas/userSchema";
import useAuth from "../../hooks/useAuth";

const inputClass = "h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-brand-500";

// Campo con etiqueta y mensaje de error
function Field({ label, error, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {children}
            {error && <p className="text-sm text-red-500">{error.message}</p>}
        </div>
    )
}


export default function UserCreateForm() {
    const { canChangeRoles } = useAuth(); // true solo si es Administrador del Sistema
    const [roles, setRoles] = useState([]);
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(userSchema),
        defaultValues: { username: "", email: "", password: "", phone: "", role: "" },
    });
    const navigate = useNavigate();
    useEffect(() => {
        if (canChangeRoles) {
            getRoles().then((response) => setRoles(response.data)).catch(() => setRoles([]));
        }
    }, [canChangeRoles]);
    const onSubmit = handleSubmit(async (data) => {
        try {
            await createUser({ 
                ...data, 
                role: canChangeRoles && data.role ? Number(data.role) : null 
            });
            toast.success("Usuario creado exitosamente");
            navigate("/users");
        } catch (err) {
            const backendErrors = err.response?.data;
            if (backendErrors && typeof backendErrors === "object") {
                Object.entries(backendErrors).forEach(([field, messages]) =>
                    setError(field, { message: [].concat(messages).join(" ") })
                );
            }
            toast.error("No se pudo crear el usuario");
        }
    });
    const borderFor = (field) => (errors[field] ? "border-red-400" : "border-gray-300");
    return (
        <form onSubmit={onSubmit} noValidate
            className="grid max-w-3xl gap-5 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2 md:p-6">
            <Field label="Nombre de usuario" error={errors.username}>
                <input type="text" placeholder="ej: jperez" className={`${inputClass} ${borderFor("username")}`}
                    {...register("username")} />
            </Field>
            <Field label="Correo electrónico" error={errors.email}>
                <input type="email" placeholder="ej: jperez@correo.com" className={`${inputClass} ${borderFor("email")}`}
                    {...register("email")} />
            </Field>
            <Field label="Contraseña" error={errors.password}>
                <input type="password" placeholder="Mínimo 8 caracteres" className={`${inputClass} ${borderFor("password")}`}
                    {...register("password")} />
            </Field>
            <Field label="Teléfono (opcional)" error={errors.phone}>
                <input type="tel" placeholder="ej: +57 3001234567" className={`${inputClass} ${borderFor("phone")}`}
                    {...register("phone")} />
            </Field>
            
            {/* Selector de rol: Solo visible si el creador es Administrador */}
            {canChangeRoles && (
                <Field label="Rol" error={errors.role}>
                    <select className={`${inputClass} ${borderFor("role")}`} {...register("role")}>
                        <option value="">Autor (por defecto)</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </Field>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">
                <button type="button" onClick={() => navigate("/users")}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                    className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                    {isSubmitting ? "Creando..." : "Crear usuario"}
                </button>
            </div>
        </form>
    );
}
