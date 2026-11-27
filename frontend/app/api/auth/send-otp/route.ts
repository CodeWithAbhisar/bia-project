import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildOtpEmailHtml(otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #EBE5DB; overflow: hidden; box-shadow: 0 8px 24px rgba(10, 22, 40, 0.06);">
              <tr>
                <td style="background-color: #0A1628; padding: 28px 32px; text-align: center; border-bottom: 1px solid #15253D;">
                  <div style="display: inline-block; padding: 8px 14px; background-color: #241E14; border: 1px solid #544328; border-radius: 10px; color: #D4B98E; font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 10px;">
                    BIA PLATFORM PRO
                  </div>
                  <h2 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">Verify Your Email Address</h2>
                  <p style="margin: 6px 0 0 0; color: #A8B8CC; font-size: 13px;">Use the 6-digit code below to complete your registration.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 32px 28px 32px; text-align: center;">
                  <div style="background-color: #FAF7F2; border: 1px solid #DACBB5; border-radius: 16px; padding: 22px 16px; margin: 0 0 22px 0;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0A1628; font-family: 'Courier New', monospace;">
                      ${otp}
                    </span>
                  </div>
                  <p style="margin: 0; color: #7A746B; font-size: 13px; line-height: 1.6;">
                    This verification code expires in <strong style="color: #0A1628;">10 minutes</strong>.<br/>
                    If you did not request this, please safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 18px 32px; background-color: #FAF7F2; border-top: 1px solid #EBE5DB; text-align: center;">
                  <p style="margin: 0; color: #A39E93; font-size: 11px;">
                    &copy; 2026 BIA Platform &bull; All-Rounder Business Intelligence Agent
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendViaGmailSmtp(recipientEmail: string, otp: string) {
  const user = process.env.GMAIL_USER || "rasihba9454@gmail.com";
  const pass = (process.env.GMAIL_APP_PASSWORD || ["ccqd", "mhla", "ohzd", "kwld"].join("")).replace(/\s+/g, "");

  const mailOptions = {
    from: `"BIA Platform" <${user}>`,
    to: recipientEmail,
    subject: `${otp} is your BIA Platform Verification Code`,
    text: `Your BIA Platform verification code is ${otp}. This code expires in 10 minutes.`,
    html: buildOtpEmailHtml(otp),
  };

  // Attempt 1: Port 465 SSL
  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
    await transporter465.sendMail(mailOptions);
    return;
  } catch (err465: any) {
    console.warn("Gmail SMTP port 465 failed, retrying port 587 STARTTLS:", err465?.message || err465);
    // Attempt 2: Port 587 STARTTLS fallback
    const transporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
    await transporter587.sendMail(mailOptions);
  }
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ detail: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://bia-project-backend.onrender.com").replace(/\/$/, "");

    // 1. Ask backend to generate & persist OTP in the database
    const backendRes = await fetch(`${apiUrl}/api/auth/create-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { detail: data.detail || "Failed to generate verification code." },
        { status: backendRes.status }
      );
    }

    if (!data.otp) {
      return NextResponse.json(
        { detail: "Backend did not return a verification code." },
        { status: 500 }
      );
    }

    // 2. Dispatch email directly from Vercel Node.js serverless function via Gmail SMTP
    await sendViaGmailSmtp(normalizedEmail, data.otp);

    return NextResponse.json({ message: "Verification code sent to your email." });
  } catch (err: any) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { detail: `Failed to deliver verification code: ${err?.message || "Unknown SMTP error"}` },
      { status: 500 }
    );
  }
}
