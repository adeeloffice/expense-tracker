import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Lazy init: only create Resend instance when actually sending
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Rate limit: max 3 alert emails per hour per user
const _rateLimit = new Map<string, number[]>();
function isRateLimited(email: string): boolean {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const entries = _rateLimit.get(email) || [];
  const recent = entries.filter((t) => now - t < oneHour);
  _rateLimit.set(email, recent);
  return recent.length >= 3;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, level } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Rate limit check
    if (isRateLimited(to)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const resend = getResend();
    if (!resend) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const borderColor = level === "danger" ? "#ef4444" : "#22c55e";
    const bgColor = level === "danger" ? "#fef2f2" : "#f0fdf4";
    const labelColor = level === "danger" ? "#dc2626" : "#16a34a";
    const label = level === "danger" ? "BUDGET EXCEEDED" : "BUDGET ALERT";

    const { data, error } = await resend.emails.send({
      from: "Expense Tracker <onboarding@resend.dev>",
      to: [to],
      subject,
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 20px 24px; border-radius: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: ${labelColor}; letter-spacing: 0.05em; margin-bottom: 8px;">${label}</div>
            <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">${subject}</div>
            <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">${message}</div>
          </div>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af;">This alert was sent by Expense Tracker. You can disable budget alerts in Settings.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Budget alert API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
