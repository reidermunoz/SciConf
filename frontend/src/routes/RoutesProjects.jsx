import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ComingSoon from '../components/common/ComingSoon';
import Home from '../pages/Home';
import Users from '../pages/users/Users';
import CreateUser from '../pages/users/CreateUser';
import LoginForm from '../pages/auth/LoginForm';
import RegisterForm from '../pages/auth/RegisterForm';
import ForgotPassword from '../pages/auth/ForgotPassword';
import useAuth from '../hooks/useAuth';
import Profile from '../pages/users/Profile';
import Articles from '../pages/articles/Articles';
import Versions from '../pages/articles/Versions';

// Este componente verifica si hay algun usuario loggeado en localStorage

function ProtectedRoute() {
    const { isAuthenticated } = useAuth();
    return  isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

// Verifica si tiene permisos para gestionar usuarios
function ManageUsersRoute() {
    const { canManageUsers } = useAuth();
    return canManageUsers ? <Outlet /> : <Navigate to="/users" replace />
}
export default function RoutesProjects() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rutas públicas de autenticación */}

                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Rutas privadas con sesión */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/profile" element={<Profile />} />
                        
                        {/* Solo Admin y Comité pueden acceder a crear usuarios */}
                        <Route element={<ManageUsersRoute />}>
                            <Route path="/create-user" element={<CreateUser />} />
                        </Route>
                        <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
                        <Route path="/articles" element={<Articles />} />
                        <Route path="/versions" element={<Versions />} />
                        <Route path="/agenda" element={<ComingSoon title="Agenda" />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
