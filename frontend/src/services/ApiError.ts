export class ApiError extends Error {
    status: number
    errors?: {field: string, message: string} []

constructor(message: string, status: number, errors?: ApiError['errors']) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
}
    
}
