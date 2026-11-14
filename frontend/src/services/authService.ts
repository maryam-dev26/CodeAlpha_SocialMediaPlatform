import { apiRequest } from "./api";
import type { RegisterCredentials, LoginCredentials, MessageResponse, UserResponse, AuthResponse } from "../types/auth";

function register (
    credentials: RegisterCredentials
): Promise<AuthResponse> {
    return apiRequest <AuthResponse> (
    '/api/auth/register',
        {
            method: 'POST',
            body: JSON.stringify(credentials),
        }
    )
}

function login (
    credentials: LoginCredentials
): Promise<AuthResponse> {
    return apiRequest <AuthResponse> (
        '/api/auth/login',
        {
            method: 'POST',
            body: JSON.stringify(credentials),
        }
    )
}

function logout (): Promise<MessageResponse> {
    return  apiRequest <MessageResponse> (
        '/api/auth/logout',
        {
            method: 'POST',
        }
    )

}

function getCurrentUser (): Promise<UserResponse> {
    return apiRequest <UserResponse> (
        '/api/auth/me',
        {
            method: 'GET'
        }
    )
}

function refreshSession (): Promise<AuthResponse> {
    return apiRequest<AuthResponse> (
        '/api/auth/refresh',
        {
            method: 'POST'
        }
    )
}

export { register, login, logout, getCurrentUser, refreshSession }