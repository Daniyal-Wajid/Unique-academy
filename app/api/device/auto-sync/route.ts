import { NextResponse } from "next/server";
import {
  getAutoSyncStatus,
  startAutoSync,
  stopAutoSync,
  executeDeviceSync,
} from "@/lib/services/device-daemon";

export async function GET() {
  const status = getAutoSyncStatus();
  return NextResponse.json({ ok: true, ...status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "status";
    const intervalSeconds = Number(body.intervalSeconds) || 30;

    if (action === "start") {
      const state = startAutoSync(intervalSeconds);
      return NextResponse.json({ ok: true, message: `Auto-sync started every ${state.intervalSeconds}s`, ...state });
    }

    if (action === "stop") {
      const state = stopAutoSync();
      return NextResponse.json({ ok: true, message: "Auto-sync stopped", ...state });
    }

    if (action === "sync") {
      const res = await executeDeviceSync();
      const status = getAutoSyncStatus();
      return NextResponse.json({ ok: true, ...res, ...status });
    }

    const currentStatus = getAutoSyncStatus();
    return NextResponse.json({ ok: true, ...currentStatus });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Auto-sync action failed" },
      { status: 500 }
    );
  }
}

