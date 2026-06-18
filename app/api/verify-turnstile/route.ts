import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ success: false, error: "Secret key not configured" }, { status: 500 });
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ success: data.success });
  } catch {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
