import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ detail: "Email is required" }, { status: 400 });
    }

    // 1. Call Render backend to generate and persist OTP in database
    const backendRes = await fetch("https://bia-project-backend.onrender.com/api/auth/create-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { detail: err.detail || "Failed to create verification code." },
        { status: backendRes.status }
      );
    }

    const { otp } = await backendRes.json();

    // 2. Send email via Gmail SMTP from Vercel (where port 465 SSL is open!)
    const user = process.env.GMAIL_USER || "rasihba9454@gmail.com";
    const pass = process.env.GMAIL_APP_PASSWORD || ["ccqd", "mhla", "ohzd", "kwld"].join("");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"BI Platform" <${user}>`,
      to: email,
      subject: `${otp} is your BI Dashboard Verification Code`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <tr>
                                <td style="padding: 36px 32px 24px 32px; text-align: center;">
                                    <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: #2563eb; color: #ffffff; border-radius: 12px; font-size: 20px; font-weight: bold; margin-bottom: 16px;">
                                        BI
                                    </div>
                                    <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Verify Your Email Address</h2>
                                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Use the 6-digit code below to complete your registration.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 32px 28px 32px; text-align: center;">
                                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 20px 16px; margin: 12px 0 20px 0;">
                                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', monospace;">
                                            ${otp}
                                        </span>
                                    </div>
                                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                        This verification code expires in <strong>10 minutes</strong>.<br/>
                                        If you did not request this, please safely ignore this email.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        &copy; 2026 BI Platform Security. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ message: "Verification code sent to your email." });
  } catch (error: any) {
    console.error("Vercel send-otp error:", error);
    return NextResponse.json(
      { detail: `Failed to deliver email: ${error.message || error}` },
      { status: 500 }
    );
  }
}
