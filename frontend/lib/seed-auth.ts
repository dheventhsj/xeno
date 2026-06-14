import { NextResponse } from "next/server";

/** Allow seed in dev; in production allow demo reseed via env or shared secret header. */
export function requireSeedAuth(req: Request): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (process.env.DEMO_SEED_ENABLED === "1") return null;

  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Demo seed disabled. Set DEMO_SEED_ENABLED=1 or SEED_SECRET on the server." },
      { status: 503 }
    );
  }
  if (req.headers.get("x-seed-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized — seed secret required" }, { status: 401 });
  }
  return null;
}
