// Error Handler Utility
// Created: 2026-02-05
// Purpose: Centralized error handling and user-friendly error messages

import { ApiError } from '../types/api';

/**
 * Get user-friendly error message from ApiError
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Use error message from API response
    if (error.message) {
      return error.message;
    }

    // Fallback based on status code
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'A conflict occurred. The resource may have been modified.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred. Please try again.';
}

/**
 * Determine if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === undefined;
  }
  return false;
}

/**
 * Determine if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  return false;
}

/**
 * Determine if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode) {
    return error.statusCode >= 500 && error.statusCode < 600;
  }
  return false;
}

/**
 * Log error to console (or external service in production)
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '';

  if (error instanceof ApiError) {
    console.error(`${prefix} API Error:`, {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response,
    });
  } else if (error instanceof Error) {
    console.error(`${prefix} Error:`, error.message, error.stack);
  } else {
    console.error(`${prefix} Unknown error:`, error);
  }

  // TODO: In production, send to error tracking service (Sentry, LogRocket, etc.)
}
