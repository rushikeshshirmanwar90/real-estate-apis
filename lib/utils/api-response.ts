import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export const successResponse = <T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> => {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
    },
    { status }
  );
};

export const errorResponse = (
  message: string,
  status: number,
  error?: unknown
): NextResponse<ApiResponse> => {
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  const errorDetails = isDevelopment && error && typeof error === "object" 
    ? { error: error instanceof Error ? error.message : String(error) }
    : {};

  return NextResponse.json(
    {
      success: false,
      message,
      ...errorDetails,
    },
    { status }
  );
};
