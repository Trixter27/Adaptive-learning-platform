<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

- This project uses Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and npm.
- Application routes and shared UI live under `src/app` and `src/components`. Use the existing `@/*` import alias and follow nearby component and styling patterns.
- Before changing Next.js APIs or conventions, read the relevant guide in `node_modules/next/dist/docs/`. Next.js 16 uses `src/proxy.ts` rather than `middleware.ts`.
- Clerk is integrated with `@clerk/nextjs`. The root layout provides `ClerkProvider`, Clerk routes are under `/sign-in` and `/sign-up`, and request middleware is configured in `src/proxy.ts`.
- Routes are public by default. Do not imply a route is protected unless authorization is explicitly implemented and verified. On the server, `auth()` is asynchronous and must be awaited.
- Never read, print, commit, or expose `.env.local` or other secret-bearing environment files. Use `.env.example` for variable names and clearly fake placeholders only. Never expose `CLERK_SECRET_KEY` to client code or give it a `NEXT_PUBLIC_` prefix.
- Run `npm run lint` and, for application changes, `npm run build` when practical.
