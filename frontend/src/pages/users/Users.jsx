import { Link } from "react-router-dom";
import ListUsers from "../../components/users/UsersList";

export default function Users() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
                    <p className="text-sm text-gray-500">Administradores, miembros del comité científico y autores.</p>
                </div>
                <Link to="/create-user"
                    className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600">
                    + Crear usuario
                </Link>
            </div>
            <ListUsers />
        </div>
    )
}
