import type { User } from "./user";

export interface RegisterCredentials {
    name: string,
    username: string,
    email: string,
    password: string
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface AuthResponse {
    message: string,
    user: User
}

export interface MessageResponse {
    message: string
}

export interface UserResponse {
    user: User
}