import { NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || "https://hudi-soft-com-hms-rent.onrender.com").replace(/\/$/, "");

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/license/status`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Backend unreachable", details: err?.message },
      { status: 503 }
    );
  }
}
