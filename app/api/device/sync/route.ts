import { NextResponse } from "next/server";
import { executeDeviceSync } from "@/lib/services/device-daemon";

export async function POST() {
  try {
    const result = await executeDeviceSync();
    return NextResponse.json({
      success: result.success,
      output: result.output,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync device" },
      { status: 500 }
    );
  }
}
