import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ComingSoon from '../components/common/ComingSoon';
import Home from '../pages/Home';
import Users from '../pages/users/Users';
import Products from '../pages/Products';
import CreateUser from '../pages/users/CreateUser';


export default function RoutesProjects() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Páginas con menú lateral y encabezado */}
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/create-user" element={<CreateUser />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
                    <Route path="/articles" element={<ComingSoon title="Artículos" />} />
                    <Route path="/versions" element={<ComingSoon title="Versiones y revisiones" />} />
                    <Route path="/agenda" element={<ComingSoon title="Agenda" />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
