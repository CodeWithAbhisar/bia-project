import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ detail: "Email is required" }, { status: 400 });
    }

    // Always delegate OTP generation and email dispatch to the Render backend service
    const backendRes = await fetch("https://bia-project-backend.onrender.com/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    console.error("send-otp proxy error:", err);
    return NextResponse.json({ detail: err.message || "Failed to deliver OTP." }, { status: 500 });
  }
}
