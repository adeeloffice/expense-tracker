import { NextRequest, NextResponse } from "next/server";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin (server-side only)
function getAdminAuth() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || projectId === "your_project_id") {
    return null;
  }

  // Check if we have a service account key
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    return null;
  }

  try {
    const app = getApps().length
      ? getApp("admin")
      : initializeApp(
          {
            credential: cert(JSON.parse(serviceAccount)),
            projectId,
          },
          "admin"
        );
    return getAuth(app);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        {
          success: false,
          error: "Password reset requires Firebase Admin SDK setup. Ask the app owner to configure it.",
        },
        { status: 500 }
      );
    }

    // Get user by email
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password: newPassword });
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const code = (err as { errorInfo?: { code: string } })?.errorInfo?.code || "";
      if (code === "auth/user-not-found") {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Failed to reset password" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
