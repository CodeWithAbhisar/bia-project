import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "rasihba9454@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "ccqdmhlaohzdkwld")

def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your BI Dashboard Verification Code"
        msg["From"] = f"BI Platform <{SMTP_EMAIL}>"
        msg["To"] = recipient_email

        html_content = f"""
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
                                            {otp_code}
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
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, recipient_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending email to {recipient_email}: {e}")
        return False
