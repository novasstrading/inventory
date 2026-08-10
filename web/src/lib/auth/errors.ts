/** Typed errors so route handlers can map them to the right HTTP status (see lib/http.ts). */

export class ValidationError extends Error {}
export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class TooManyRequestsError extends Error {}
