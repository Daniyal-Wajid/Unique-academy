import { execFile } from "child_process";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export type AutoSyncState = {
  running: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  lastStatus: "success" | "error" | "running" | "idle";
  lastOutput: string | null;
  runCount: number;
};

// Global singleton across hot reloads in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __uniqueDeviceAutoSync:
    | {
        timer: NodeJS.Timeout | null;
        state: AutoSyncState;
        isExecuting: boolean;
        executionStartedAt: number;
      }
    | undefined;
}

if (!globalThis.__uniqueDeviceAutoSync) {
  globalThis.__uniqueDeviceAutoSync = {
    timer: null,
    state: {
      running: false,
      intervalSeconds: 30,
      lastRunAt: null,
      lastStatus: "idle",
      lastOutput: null,
      runCount: 0,
    },
    isExecuting: false,
    executionStartedAt: 0,
  };
}

const daemon = globalThis.__uniqueDeviceAutoSync;

export async function executeDeviceSync(): Promise<{ success: boolean; output: string }> {
  // Watchdog: If an execution has been marked running for more than 50 seconds, reset lock
  if (daemon.isExecuting && Date.now() - daemon.executionStartedAt > 50000) {
    daemon.isExecuting = false;
  }

  if (daemon.isExecuting) {
    return { success: false, output: "A sync operation is already in progress." };
  }

  daemon.isExecuting = true;
  daemon.executionStartedAt = Date.now();
  daemon.state.lastStatus = "running";

  const scriptPath = path.join(process.cwd(), "device-service", "sync.py");

  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve) => {
      execFile("python", [scriptPath], { timeout: 45000, cwd: process.cwd() }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || (error ? error.message : ""),
        });
      });
    });

    const isSuccess = result.stdout.includes("[SUCCESS]");
    const outputText = result.stdout.trim() || result.stderr.trim() || "No output";

    daemon.state.lastRunAt = new Date().toISOString();
    daemon.state.lastStatus = isSuccess ? "success" : "error";
    daemon.state.lastOutput = outputText;
    daemon.state.runCount += 1;

    // Update database status for MB460
    try {
      const supabase = createAdminClient();
      await supabase
        .from("devices")
        .update({
          status: isSuccess ? "online" : "offline",
          last_seen_at: isSuccess ? new Date().toISOString() : undefined,
          last_error: isSuccess ? null : outputText.slice(0, 250),
          ip_address: process.env.ZKTECO_IP || "192.168.100.30",
          updated_at: new Date().toISOString(),
        })
        .eq("is_active", true);
    } catch {
      // Best-effort database update
    }

    return { success: isSuccess, output: outputText };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    daemon.state.lastStatus = "error";
    daemon.state.lastOutput = msg;
    return { success: false, output: msg };
  } finally {
    daemon.isExecuting = false;
  }
}

export function getAutoSyncStatus(): AutoSyncState {
  return { ...daemon.state };
}

export function startAutoSync(intervalSeconds = 30): AutoSyncState {
  const validInterval = Math.max(5, Math.min(3600, intervalSeconds));

  stopAutoSync();

  daemon.state.running = true;
  daemon.state.intervalSeconds = validInterval;

  // Trigger one immediately in background
  executeDeviceSync().catch(() => {});

  // Schedule recurring interval
  daemon.timer = setInterval(() => {
    executeDeviceSync().catch(() => {});
  }, validInterval * 1000);

  return { ...daemon.state };
}

export function stopAutoSync(): AutoSyncState {
  if (daemon.timer) {
    clearInterval(daemon.timer);
    daemon.timer = null;
  }
  daemon.state.running = false;
  daemon.state.lastStatus = "idle";
  return { ...daemon.state };
}
