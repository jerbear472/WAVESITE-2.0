import { NextResponse } from 'next/server';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      {
        error: {
          message: isDevelopment ? error.message : 'An unexpected error occurred',
          stack: isDevelopment ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred'
      }
    },
    { status: 500 }
  );
}

export function asyncHandler(fn: Function) {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: 'AUTH_001',
  AUTHORIZATION_FAILED: 'AUTH_002',
  VALIDATION_ERROR: 'VAL_001',
  RESOURCE_NOT_FOUND: 'RES_001',
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  DATABASE_ERROR: 'DB_001',
  EXTERNAL_API_ERROR: 'EXT_001',
  INSUFFICIENT_CREDITS: 'CREDIT_001',
  SUBSCRIPTION_REQUIRED: 'SUB_001'
} as const;