import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, latestData: any) {
    super(message, 409, { latestTask: latestData });
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  if (err instanceof AppError) {
    const responseJson: any = {
      error: {
        message: err.message,
        code: err.constructor.name === 'ConflictError' ? 'VERSION_CONFLICT' : err.constructor.name,
      },
    };

    if (err.details) {
      Object.assign(responseJson, err.details);
    }

    return res.status(err.statusCode).json(responseJson);
  }

  console.error('Unhandled Internal Error:', err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
