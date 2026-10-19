import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import Header from "./Header";

// Estructura común de las páginas internas: menú lateral + encabezado + contenido
export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:pl-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
            <Toaster position="top-right" />
        </div>
    )
}
