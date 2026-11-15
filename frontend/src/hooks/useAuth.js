import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const ROLES = {
    ADMIN: "Administrador del Sistema",
    COMMITTEE: "Miembro Comité Científico",
    AUTHOR: "Autor",
};

export default function useAuth() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const roleName = user?.role ?? "";

    // Pedimos permiso segun el PDF de requerimientos.
    const isAdmin = roleName === ROLES.ADMIN;
    const isCommittee = roleName === ROLES.COMMITTEE;
    const isAuthor = roleName === ROLES.AUTHOR;

    // Solo Admin y Comité pueden crear/eliminar usuarios
    const canManageUsers = isAdmin || isCommittee;

    // Solo el Administrador puede cambiar roles
    const canChangeRoles = isAdmin;

    const logout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
        navigate("/login");
    };

    return {
        user,
        roleName,
        isAdmin,
        isCommittee,
        isAuthor,
        canManageUsers,
        canChangeRoles,
        isAuthenticated: !!user,
        logout,
    };
}