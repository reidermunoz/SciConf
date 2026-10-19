import { Link } from "react-router-dom";
import UserCreateForm from "../../components/users/UserCreateForm";

export default function CreateUser() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <Link to="/users" className="text-sm text-brand-500 hover:underline">← Volver a usuarios</Link>
                <h2 className="mt-1 text-2xl font-bold text-gray-800">Crear usuario</h2>
            </div>
            <UserCreateForm />
        </div>
    )
}
