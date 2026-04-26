import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth gate for the entire app, except Bolna's post-call webhook
 * (Bolna doesn't send credentials when posting back, so that path stays open).
 *
 * Configure via env:
 *   BASIC_AUTH_USER - username
 *   BASIC_AUTH_PASS - password
 * If either is unset (e.g. local dev), the gate is disabled.
 */
export function middleware(req: NextRequest) {
  // Bolna posts webhook payloads here without auth headers — must stay open.
  if (req.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // Auth not configured (e.g. local dev) → allow.
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  const expected = "Basic " + btoa(`${user}:${pass}`);

  if (auth === expected) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Divyasree LeadOps", charset="UTF-8"',
    },
  });
}

export const config = {
  // Run middleware on every route except Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
