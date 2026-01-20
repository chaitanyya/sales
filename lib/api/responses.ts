import { NextResponse } from "next/server";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Create a successful JSON response
 */
export function jsonSuccess<T extends JsonValue | Record<string, JsonValue>>(
  data: T,
  status = 200
): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Create an error JSON response
 */
export function jsonError(message: string, status = 400): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Create a 404 not found response
 */
export function notFound(message = "Not found"): NextResponse<{ error: string }> {
  return jsonError(message, 404);
}

/**
 * Create a 400 bad request response
 */
export function badRequest(message = "Bad request"): NextResponse<{ error: string }> {
  return jsonError(message, 400);
}

/**
 * Create a 500 internal server error response
 */
export function serverError(message = "Internal server error"): NextResponse<{ error: string }> {
  return jsonError(message, 500);
}

/**
 * Create a 201 created response
 */
export function created<T extends JsonValue | Record<string, JsonValue>>(data: T): NextResponse<T> {
  return jsonSuccess(data, 201);
}
