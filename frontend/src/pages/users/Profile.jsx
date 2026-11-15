import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { updateUser } from "../../api/userApi";

export default function Profile() {
    const { user, roleName } = useAuth();
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        institution: "",
    });
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                phone: user.phone || "",
                institution: user.institution || "",
            });
        }
    }, [user]);
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await updateUser(user.id, formData);
            
            // Actualizamos la sesión en localStorage para que el Header y la app se enteren
            const updatedUser = {
                ...user,
                first_name: response.data.first_name,
                last_name: response.data.last_name,
                phone: response.data.phone,
                institution: response.data.institution,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            toast.success("Tus datos personales se han actualizado correctamente");
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al actualizar tus datos");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Mi Perfil</h2>
                <p className="text-sm text-gray-500">
                    Consulta y actualiza tu información personal en SciConf.
                </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Información no editable (Username, Email y Rol) */}
                <div className="mb-6 grid grid-cols-1 gap-4 border-b border-gray-100 pb-6 sm:grid-cols-3">
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Usuario</span>
                        <p className="font-semibold text-gray-800">{user?.username}</p>
                    </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Correo</span>
                        <p className="font-semibold text-gray-800">{user?.email}</p>
                    </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Rol en el sistema</span>
                        <p className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
                            {roleName || "Sin rol"}
                        </p>
                    </div>
                </div>
                {/* Formulario de actualización de datos personales */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                placeholder="Tu nombre"
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Apellido</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                placeholder="Tu apellido"
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+57 300 123 4567"
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Institución / Afiliación</label>
                            <input
                                type="text"
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                placeholder="Ej. Universidad del Valle"
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition"
                        >
                            {loading ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}