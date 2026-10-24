import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*",
};

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (!envOrigins) {
    // Sensible defaults for development and known deployment
    return [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://deeptrackforensics.vercel.app",
    ];
  }
  return envOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  const isAllowedOrigin = origin ? allowedOrigins.includes(origin.replace(/\/+$/, "")) : false;

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    const preflightHeaders = new Headers();

    if (isAllowedOrigin && origin) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
      preflightHeaders.set("Access-Control-Allow-Credentials", "true");
    }

    preflightHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    preflightHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );
    preflightHeaders.set("Access-Control-Max-Age", "86400");

    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  // Handle actual API requests (GET, POST, etc.)
  const response = NextResponse.next();

  if (isAllowedOrigin && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  return response;
}
