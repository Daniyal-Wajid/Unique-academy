import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

export type TunnelStatus = {
  running: boolean;
  publicUrl: string | null;
  startedAt: string | null;
  error: string | null;
  cloudflaredInstalled: boolean;
};

// Global singleton — survives Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __uniqueTunnelDaemon:
    | {
        process: ChildProcess | null;
        state: TunnelStatus;
        outputBuffer: string;
      }
    | undefined;
}

if (!globalThis.__uniqueTunnelDaemon) {
  globalThis.__uniqueTunnelDaemon = {
    process: null,
    state: {
      running: false,
      publicUrl: null,
      startedAt: null,
      error: null,
      cloudflaredInstalled: false,
    },
    outputBuffer: "",
  };
}

const daemon = globalThis.__uniqueTunnelDaemon;

/** Paths where we look for cloudflared.exe */
const CLOUDFLARED_CANDIDATES = [
  path.join(process.cwd(), "cloudflared.exe"),
  path.join(process.cwd(), "bin", "cloudflared.exe"),
  "cloudflared", // system PATH
  "C:\\Program Files\\cloudflared\\cloudflared.exe",
];

export function findCloudflared(): string | null {
  for (const candidate of CLOUDFLARED_CANDIDATES) {
    try {
      if (candidate === "cloudflared") {
        // Try to detect via PATH by checking common paths
        const { execSync } = require("child_process");
        try {
          execSync("cloudflared --version", { stdio: "pipe", timeout: 3000 });
          return "cloudflared";
        } catch {
          continue;
        }
      }
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export function getTunnelStatus(): TunnelStatus {
  const installed = findCloudflared() !== null;
  return { ...daemon.state, cloudflaredInstalled: installed };
}

export function startTunnel(port = 3000): TunnelStatus {
  if (daemon.process) {
    return getTunnelStatus();
  }

  const binary = findCloudflared();
  if (!binary) {
    daemon.state.error =
      "cloudflared not found. Please download it first using the button above.";
    return getTunnelStatus();
  }

  daemon.state.error = null;
  daemon.state.publicUrl = null;
  daemon.state.running = true;
  daemon.state.startedAt = new Date().toISOString();
  daemon.outputBuffer = "";

  const proc = spawn(binary, ["tunnel", "--url", `http://localhost:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    shell: false,
  });

  daemon.process = proc;

  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    daemon.outputBuffer += text;

    // Extract the trycloudflare URL from output
    const urlMatch = daemon.outputBuffer.match(
      /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
    );
    if (urlMatch && !daemon.state.publicUrl) {
      daemon.state.publicUrl = urlMatch[0];
    }
  };

  proc.stdout?.on("data", onData);
  proc.stderr?.on("data", onData);

  proc.on("exit", (code) => {
    daemon.process = null;
    daemon.state.running = false;
    if (code !== 0 && code !== null) {
      daemon.state.error = `Tunnel process exited with code ${code}`;
    }
  });

  proc.on("error", (err) => {
    daemon.process = null;
    daemon.state.running = false;
    daemon.state.error = err.message;
  });

  return getTunnelStatus();
}

export function stopTunnel(): TunnelStatus {
  if (daemon.process) {
    try {
      daemon.process.kill("SIGTERM");
    } catch {
      try {
        daemon.process.kill("SIGKILL");
      } catch {
        // Ignore
      }
    }
    daemon.process = null;
  }
  daemon.state.running = false;
  daemon.state.publicUrl = null;
  daemon.state.error = null;
  return getTunnelStatus();
}

export function getTunnelOutput(): string {
  return daemon.outputBuffer.slice(-3000); // last 3000 chars
}

