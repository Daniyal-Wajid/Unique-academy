import { NextResponse } from "next/server";
import {
  getTunnelStatus,
  startTunnel,
  stopTunnel,
  getTunnelOutput,
} from "@/lib/services/tunnel-daemon";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

export async function GET() {
  const status = getTunnelStatus();
  const output = getTunnelOutput();
  return NextResponse.json({ ok: true, ...status, output });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action: string = body.action || "status";

    if (action === "start") {
      const port = Number(body.port) || 3000;
      const state = startTunnel(port);
      return NextResponse.json({ ok: true, message: "Tunnel starting…", ...state });
    }

    if (action === "stop") {
      const state = stopTunnel();
      return NextResponse.json({ ok: true, message: "Tunnel stopped", ...state });
    }

    if (action === "download") {
      // Download cloudflared.exe to project root using PowerShell
      const destPath = path.join(process.cwd(), "cloudflared.exe");
      if (fs.existsSync(destPath)) {
        return NextResponse.json({ ok: true, message: "cloudflared.exe already exists", alreadyInstalled: true });
      }

      const url =
        "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
      const downloadCmd = `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${destPath}' -UseBasicParsing"`;

      await new Promise<void>((resolve, reject) => {
        exec(downloadCmd, { timeout: 120000 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      const installed = fs.existsSync(destPath);
      return NextResponse.json({
        ok: installed,
        message: installed
          ? "cloudflared.exe downloaded successfully to project folder."
          : "Download may have failed — file not found after download.",
        alreadyInstalled: false,
      });
    }

    const status = getTunnelStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Tunnel action failed" },
      { status: 500 }
    );
  }
}

