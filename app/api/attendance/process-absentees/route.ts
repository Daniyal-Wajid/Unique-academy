import { NextResponse } from "next/server";
import { syncAndMarkDailyAttendance } from "@/lib/services/attendance";
import { todayInKarachi } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { date } = await request.json().catch(() => ({ date: todayInKarachi() }));
    const result = await syncAndMarkDailyAttendance(date || todayInKarachi());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to process attendance" },
      { status: 500 }
    );
  }
}
