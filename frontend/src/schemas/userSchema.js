import { z } from "zod";

// Validación del formulario de usuario (lado del cliente)
export const userSchema = z.object({
    username: z.string()
        .min(3, "Mínimo 3 caracteres")
        .max(150, "Máximo 150 caracteres")
        .regex(/^[\w.@+-]+$/, "Solo letras, números y @ . + - _"),
    email: z.email("Correo electrónico no válido"),
    password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres"),
    phone: z.string()
        .regex(/^\+?[0-9 ]{7,15}$/, "Teléfono no válido (ej: +57 3001234567)")
        .or(z.literal("")),
    role: z.string(),
});
