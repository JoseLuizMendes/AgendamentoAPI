export class AppError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Não autorizado") {
        super(message, 401);
    }
}
export class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404);
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}
//# sourceMappingURL=errors.js.map