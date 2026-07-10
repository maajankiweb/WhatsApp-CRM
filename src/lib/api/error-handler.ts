import { NextResponse } from 'next/server';
import { toApiErrorResponse, ApiError } from '@/lib/api/v1/respond';
import { SendMessageError } from '@/lib/whatsapp/send-message';

type RouteHandler = (request: Request, context?: any) => Promise<Response> | Response;

/**
 * Centrally handles errors for Next.js App Router route handlers.
 * Scopes error output formats to match public API (v1) or internal dashboard endpoints.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: Request, context: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`[API Error Handler] Exception on ${request.method} ${request.url}:`, error);

      const url = new URL(request.url);
      const isV1 = url.pathname.includes('/api/v1/');

      if (isV1) {
        // Use v1 respond helper for standardized public API format
        return toApiErrorResponse(error);
      }

      // Handle custom internal error types
      if (error instanceof SendMessageError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status, headers: error.headers }
        );
      }

      // Default fallback for internal routes to avoid exposing database/system internals
      const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
      const status = (error as any).status || 500;
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  };
}
