import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createUser, getRoles } from "../../api/userApi";
import { userSchema } from "../../schemas/userSchema";
import useAuth, { ROLES } from "../../hooks/useAuth";

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
    const { isAdmin, isCommittee, canManageUsers } = useAuth();
    const [roles, setRoles] = useState([]);
    const { register, handleSubmit, setError, watch, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(userSchema),
        defaultValues: { first_name: "", last_name: "", username: "", email: "", password: "", phone: "", roles: [] },
    });
    const assignableRoles = isAdmin
        ? roles
        : isCommittee
        ? roles.filter((role) => role.name !== ROLES.ADMIN)
        : [];
    const selectedRoles = watch("roles") || [];
    const toggleRole = (roleId) => {
        const next = selectedRoles.includes(roleId)
            ? selectedRoles.filter((id) => id !== roleId)
            : [...selectedRoles, roleId];
        setValue("roles", next, { shouldValidate: true });
    };
    const navigate = useNavigate();
    useEffect(() => {
        if (canManageUsers) {
            getRoles().then((response) => setRoles(response.data)).catch(() => setRoles([]));
        }
    }, [canManageUsers]);
    const onSubmit = handleSubmit(async (data) => {
        try {
            await createUser({ 
                ...data, 
                roles: canManageUsers && data.roles?.length ? data.roles.map(Number) : [] 
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
            <Field label="Nombre" error={errors.first_name}>
                <input type="text" placeholder="ej: Juan" className={`${inputClass} ${borderFor("first_name")}`}
                    {...register("first_name")} />
            </Field>
            <Field label="Apellido" error={errors.last_name}>
                <input type="text" placeholder="ej: Pérez" className={`${inputClass} ${borderFor("last_name")}`}
                    {...register("last_name")} />
            </Field>
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
            
            {/* Selector múltiple de roles: visible para Administrador y Miembro del Comité (sin Admin) */}
            {canManageUsers && assignableRoles.length > 0 && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                        Roles en el sistema <span className="text-xs font-normal text-gray-400">(si no seleccionas ninguno, será Autor por defecto)</span>
                    </label>
                    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-300 p-3">
                        {assignableRoles.map((role) => {
                            const checked = selectedRoles.includes(role.id);
                            return (
                                <label
                                    key={role.id}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                                        checked
                                            ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleRole(role.id)}
                                        className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                    />
                                    <span>{role.name}</span>
                                </label>
                            );
                        })}
                    </div>
                    {errors.roles && <p className="text-sm text-red-500">{errors.roles.message}</p>}
                </div>
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
