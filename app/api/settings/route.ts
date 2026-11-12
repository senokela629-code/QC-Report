import { NextResponse } from "next/server";
import { getAppSettings, saveAppSettings } from "@/lib/googleSheets";

export async function GET() {
  try {
    const { jobs, ngReasons } = await getAppSettings();
    return NextResponse.json({ success: true, jobs, ngReasons });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { jobs, ngReasons } = await request.json();
    await saveAppSettings(jobs || [], ngReasons || []);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}