export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Registro não encontrado") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflito: registro já existe") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Dados inválidos") {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Não autorizado") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}
