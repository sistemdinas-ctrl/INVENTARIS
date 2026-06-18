import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { username, password, turnstileToken } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }

    if (turnstileToken) {
      const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      });
      const cfData = await cfRes.json();
      if (!cfData.success) {
        return NextResponse.json({ error: "Verifikasi Turnstile gagal" }, { status: 403 });
      }
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
    });

    res.cookies.set("sb-logged-in", "true", {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
