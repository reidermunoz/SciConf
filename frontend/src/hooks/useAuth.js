import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const ROLES = {
    ADMIN: "Administrador del Sistema",
    COMMITTEE: "Miembro Comité Científico",
    AUTHOR: "Autor",
};

export const updateAuthUser = (newUser) => {
    localStorage.setItem("user", JSON.stringify(newUser));
    window.dispatchEvent(new Event("auth-user-updated"));
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

    useEffect(() => {
        const handleUserChange = () => {
            try {
                const stored = localStorage.getItem("user");
                setUser(stored ? JSON.parse(stored) : null);
            } catch {
                setUser(null);
            }
        };

        window.addEventListener("auth-user-updated", handleUserChange);
        window.addEventListener("storage", handleUserChange);

        return () => {
            window.removeEventListener("auth-user-updated", handleUserChange);
            window.removeEventListener("storage", handleUserChange);
        };
    }, []);

    const roleName = user?.role ?? "";

    // Pedimos permiso segun el PDF de requerimientos.
    const isAdmin = roleName === ROLES.ADMIN;
    const isCommittee = roleName === ROLES.COMMITTEE;
    const isAuthor = roleName === ROLES.AUTHOR;

    // Solo Admin y Comité pueden crear/eliminar usuarios
    const canManageUsers = isAdmin || isCommittee;

    // Solo el Administrador puede cambiar roles
    const canChangeRoles = isAdmin;

    // Solo Autores y Administradores pueden proponer o crear artículos
    const canCreateArticle = isAuthor || isAdmin;

    // Solo Miembros del Comité Científico y Administradores pueden deshabilitar artículos
    const canDisableArticle = isCommittee || isAdmin;

    const updateUser = (updatedUser) => {
        updateAuthUser(updatedUser);
        setUser(updatedUser);
    };

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
        canCreateArticle,
        canDisableArticle,
        isAuthenticated: !!user,
        updateUser,
        logout,
    };
}