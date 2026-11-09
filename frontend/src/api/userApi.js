import axios from 'axios';
import { exactOptional } from 'zod';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1/',
});

export const loginUser = async (credentials) => {
    return await api.post('/login/', credentials);
};

export const getUsers = async () => {
    return await api.get('/users/');
}

export const createUser = async (data) => {
    return await api.post('/users/', data);
}

export const deleteUser = async (id) => {
    return await api.delete(`/users/${id}/`);
}

export const getRoles = async () => {
    return await api.get('/roles/');
}
