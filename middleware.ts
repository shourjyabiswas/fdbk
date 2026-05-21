import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/dashboard");
  const adminEmail = process.env.ADMIN_EMAIL;
  if (isAdminRoute && (!adminEmail || token.email !== adminEmail)) {
    const surveyUrl = new URL("/survey", request.url);
    return NextResponse.redirect(surveyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/survey/:path*", "/admin/:path*", "/dashboard/:path*"],
};
