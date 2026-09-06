import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || "https://hudi-soft-com-hms-rent.onrender.com").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams.toString();
    const targetUrl = searchParams ? `${BACKEND}/api/license/status?${searchParams}` : `${BACKEND}/api/license/status`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const licenseHeader = req.headers.get("x-license-key");
    if (licenseHeader) headers["x-license-key"] = licenseHeader;

    const res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Backend database or server error", details: text || `HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Backend unreachable", details: err?.message },
      { status: 503 }
    );
  }
}
