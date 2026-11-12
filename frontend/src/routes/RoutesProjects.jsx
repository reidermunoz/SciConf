import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ComingSoon from '../components/common/ComingSoon';
import Home from '../pages/Home';
import Users from '../pages/users/Users';
import CreateUser from '../pages/users/CreateUser';
import LoginForm from '../pages/auth/LoginForm';
import RegisterForm from '../pages/auth/RegisterForm';
import ForgotPassword from '../pages/auth/ForgotPassword';
import {Navigate, Outlet } from "react-router-dom";


// Este componente verifica si hay algun usuario loggeado en localStorage

function ProtectedRoute() {
    const user = localStorage.getItem("user");
    return user ? <Outlet /> : <Navigate to = "/login" replace/>;
}

export default function RoutesProjects() {
    return (
        <BrowserRouter>
            <Routes>

                 {/*Ruta publica sin el menu encabezado*/}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Páginas con menú lateral y encabezado */}
                <Route element = {<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/create-user" element={<CreateUser />} />
                        <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
                        <Route path="/articles" element={<ComingSoon title="Artículos" />} />
                        <Route path="/versions" element={<ComingSoon title="Versiones y revisiones" />} />
                        <Route path="/agenda" element={<ComingSoon title="Agenda" />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
