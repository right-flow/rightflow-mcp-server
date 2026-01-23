// Base API Error class
export class APIError extends Error {
  public requestId?: string;

  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'APIError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        request_id: this.requestId,
        timestamp: new Date().toISOString(),
        docs_url: `https://docs.rightflow.app/errors/${this.code}`,
      },
    };
  }
}

// 400 Validation Error
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

// 401 Authentication Errors
export class AuthenticationError extends APIError {
  constructor(message: string = 'נא להתחבר מחדש') {
    super(401, 'AUTHENTICATION_REQUIRED', message);
  }
}

export class InvalidTokenError extends APIError {
  constructor(message: string = 'אסימון לא תקין') {
    super(401, 'INVALID_TOKEN', message);
  }
}

// 403 Authorization Errors
export class AuthorizationError extends APIError {
  constructor(message: string = 'אין לך הרשאה לבצע פעולה זו') {
    super(403, 'INSUFFICIENT_PERMISSIONS', message);
  }
}

export class OrganizationMismatchError extends APIError {
  constructor(message: string = 'אין לך הרשאה לגשת לנתונים של ארגון אחר') {
    super(403, 'ORGANIZATION_MISMATCH', message);
  }
}

// 404 Not Found
export class NotFoundError extends APIError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} עם מזהה ${id} לא נמצא` : `${resource} לא נמצא`;
    super(404, 'RESOURCE_NOT_FOUND', message, { resource, id });
  }
}

// 409 Conflict
export class ConflictError extends APIError {
  constructor(message: string, details?: any) {
    super(409, 'RESOURCE_CONFLICT', message, details);
  }
}

// 410 Gone (soft deleted)
export class GoneError extends APIError {
  constructor(resource: string) {
    super(410, 'RESOURCE_DELETED', `${resource} נמחק`, { resource });
  }
}

// 429 Rate Limit
export class RateLimitError extends APIError {
  constructor(retryAfter: number = 60) {
    super(
      429,
      'RATE_LIMIT_EXCEEDED',
      `יותר מדי בקשות, נסה שוב בעוד ${retryAfter} שניות`,
      { retry_after: retryAfter },
    );
  }
}

// 500 Server Errors
export class ServerError extends APIError {
  constructor(message: string = 'שגיאת שרת, נסה שוב מאוחר יותר', details?: any) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

export class DatabaseError extends APIError {
  constructor(message: string = 'שגיאת מסד נתונים', details?: any) {
    super(500, 'DATABASE_ERROR', message, details);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends APIError {
  constructor(message: string = 'השירות אינו זמין כרגע') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}
