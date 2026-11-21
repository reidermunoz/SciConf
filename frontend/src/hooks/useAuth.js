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

    const userRoles = Array.isArray(user?.roles)
        ? user.roles
        : user?.role
        ? [user.role]
        : [];
    const activeRole = user?.active_role || (userRoles.length === 1 ? userRoles[0] : "");
    const roleName = activeRole || userRoles.join(", ");
    const hasMultipleRoles = userRoles.length > 1;

    // Permisos basados en el rol activo seleccionado al iniciar sesión
    const isAdmin = activeRole === ROLES.ADMIN;
    const isCommittee =
        activeRole === ROLES.COMMITTEE ||
        activeRole === "Miembro del Comité Científico";
    const isAuthor = activeRole === ROLES.AUTHOR;

    // Solo Admin y Comité pueden crear/eliminar usuarios
    const canManageUsers = isAdmin || isCommittee;

    // Administrador y Comité pueden cambiar roles (con jerarquía en backend/UI)
    const canChangeRoles = isAdmin || isCommittee;

    // Solo Autores pueden proponer o crear artículos
    const canCreateArticle = isAuthor;

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
        userRoles,
        activeRole,
        hasMultipleRoles,
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