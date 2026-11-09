import { useState } from "react";
import { createHashRouter, Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../api/userApi";
import { ParseStatus } from "zod/v3";

export default function LoginForm() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({email: "", password: ""});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value,
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        
        try {
            const response = await loginUser(credentials);
            // Guardamos la sesion del usuario en el navegador.
            localStorage.setItem("user", JSON.stringify(response.data));

            // Redirigimos a Home
            navigate("/");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Error al iniciar sesion.");
        } finally {
            setLoading(false);
        }
    };

    return(
        <form onSubmit={handleSubmit}>
            <h2>Inciar Sesion</h2>
            
            {error && <p style={{color: "red" }} >{error}</p>}

            {/* Campo: Correo electrónico */}            
            <div>
                <label htmlFor="email">Correo Electrónico</label>
                <input 
                    id="email"
                    name="email"
                    type="text"
                    placeholder="ejemplo@correo.com"
                    value={credentials.email}
                    onChange={handleChange}
                    required
                />

            </div>
            
            {/* Campo: Contrasena */}
            <div>
                <label  htmlFor="password">Contrasena</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={handleChange}
                    required
                />
            </div>

            {/*Boton de envio*/}
            <button type="submit" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
            </button>

            {/* Enlace a Registro */}
            <p>
            ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            </p>

        </form>
    );
}