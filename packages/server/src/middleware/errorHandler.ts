import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation error', code: 'validation_error', details: err.issues },
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message, code: 'not_found' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'internal_error' } });
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}
