import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/library",
  "/quests",
  "/mastery",
  "/achievements",
  "/community",
  "/settings",
  "/courses",
];

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  // A private development-auth backend must not become public through a rewrite.
  if (pathname === "/backend-api" || pathname.startsWith("/backend-api/")) {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to continue." } },
        { status: 401 },
      );
    }
  }
  const protectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

  if (protectedRoute) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/backend-api/:path*",
    "/__clerk/(.*)",
  ],
};
