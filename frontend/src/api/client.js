import axios from 'axios';

const baseURL = `http://${window.location.hostname}:8000/api/v1/`;

const client = axios.create({
    baseURL,
});

// Interceptor de solicitud: agrega el token JWT a cada request si existe
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Control de concurrencia para la renovación del token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event('auth-user-updated'));
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

// Interceptor de respuesta: maneja 401 (token expirado) y lo renueva automáticamente
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si no hay respuesta o es un endpoint que no debe renovar token (login, refresh, reset)
        if (!error.response || !originalRequest) {
            return Promise.reject(error);
        }

        const url = originalRequest.url || '';
        const isAuthEndpoint =
            url.includes('/login/') ||
            url.includes('/token/refresh/') ||
            url.includes('/password-reset/');

        if (error.response.status === 401 && !isAuthEndpoint) {
            if (originalRequest._retry) {
                // Ya se intentó reintentar esta petición y volvió a fallar: cerrar sesión
                handleLogout();
                return Promise.reject(error);
            }

            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                // No hay refresh token disponible: cerrar sesión inmediatamente
                handleLogout();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Si ya hay un refresco en progreso, encola esta petición
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return client(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            return new Promise((resolve, reject) => {
                axios
                    .post(`${baseURL}token/refresh/`, { refresh: refreshToken })
                    .then(({ data }) => {
                        const newAccessToken = data.access;
                        localStorage.setItem('access_token', newAccessToken);

                        if (data.refresh) {
                            localStorage.setItem('refresh_token', data.refresh);
                        }

                        client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                        processQueue(null, newAccessToken);
                        resolve(client(originalRequest));
                    })
                    .catch((refreshErr) => {
                        processQueue(refreshErr, null);
                        handleLogout();
                        reject(refreshErr);
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            });
        }

        return Promise.reject(error);
    }
);

export default client;
