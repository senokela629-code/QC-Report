import { NextResponse } from "next/server";
import { getJobSettings, saveJobSettings } from "@/lib/googleSheets";

export async function GET() {
  try {
    const jobs = await getJobSettings();
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { jobs } = await request.json();
    await saveJobSettings(jobs);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}