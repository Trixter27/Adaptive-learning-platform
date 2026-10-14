import { clerkMiddleware } from "@clerk/nextjs/server";

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
    "/__clerk/(.*)",
  ],
};
