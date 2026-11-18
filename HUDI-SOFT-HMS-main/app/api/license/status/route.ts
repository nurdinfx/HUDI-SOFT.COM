import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || "https://hudi-soft-com-hms-rent.onrender.com").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const key = searchParams.get("key") || "";
    const backendUrl = key ? `${BACKEND}/api/license/status?key=${encodeURIComponent(key)}` : `${BACKEND}/api/license/status`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const licenseKeyHeader = req.headers.get("x-license-key");
    if (licenseKeyHeader) headers["X-License-Key"] = licenseKeyHeader;
    const authHeader = req.headers.get("authorization");
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(backendUrl, {
      headers,
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
