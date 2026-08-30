import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    // Find valid token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token: otp },
    });

    if (!verificationToken) {
      return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 });
    }

    // Check if token matches email
    if (verificationToken.email !== email) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json({ message: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: verificationToken.email,
        name: verificationToken.name,
        passwordHash: verificationToken.passwordHash,
      },
    });

    // Delete used token
    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}