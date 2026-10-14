import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/backend-api",
  "/dashboard",
  "/library",
  "/quests",
  "/mastery",
  "/achievements",
  "/community",
  "/settings",
  "/courses",
];

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const protectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

  if (protectedRoute) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  return protectedMiddleware(request, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
