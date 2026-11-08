"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Play,
  Square,
  Clock,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { displayDateTime } from "@/lib/utils";
import type { Device } from "@/lib/types/database";

const STATUS_VARIANT = {
  online: "success",
  offline: "danger",
  unknown: "warning",
} as const;

const INTERVAL_OPTIONS = [
  { label: "15 seconds", value: 15 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "5 minutes", value: 300 },
];

export function DeviceStatusCard({ devices }: { devices: Device[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [autoSyncRunning, setAutoSyncRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(30);
  const [lastAutoRunAt, setLastAutoRunAt] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const prevRunCountRef = useRef(0);

  // Poll auto-sync status from the server
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/device/auto-sync");
      if (res.ok) {
        const data = await res.json();
        setAutoSyncRunning(Boolean(data.running));
        if (data.intervalSeconds) setIntervalSec(data.intervalSeconds);
        if (data.lastRunAt) setLastAutoRunAt(data.lastRunAt);

        // If new sync finished in the background, refresh page attendance data
        if (data.runCount && data.runCount > prevRunCountRef.current) {
          prevRunCountRef.current = data.runCount;
          setRunCount(data.runCount);
          router.refresh();
        }
      }
    } catch {
      // Ignore background poll errors
    }
  }, [router]);

  useEffect(() => {
    pollStatus();
    const timer = setInterval(pollStatus, 5000);
    return () => clearInterval(timer);
  }, [pollStatus]);

  // Toggle Auto-sync ON or OFF
  const toggleAutoSync = async () => {
    const nextAction = autoSyncRunning ? "stop" : "start";
    try {
      const res = await fetch("/api/device/auto-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextAction,
          intervalSeconds: intervalSec,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAutoSyncRunning(Boolean(data.running));
        setSyncFeedback({
          type: "success",
          message:
            nextAction === "start"
              ? `Auto-sync activated! Syncing automatically every ${intervalSec} seconds.`
              : "Auto-sync paused.",
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle auto-sync",
      });
    }
  };

  // Change interval
  const handleIntervalChange = async (newInterval: number) => {
    setIntervalSec(newInterval);
    if (autoSyncRunning) {
      try {
        await fetch("/api/device/auto-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            intervalSeconds: newInterval,
          }),
        });
        setSyncFeedback({
          type: "success",
          message: `Auto-sync interval updated to every ${newInterval} seconds.`,
        });
      } catch {
        // Handled silently
      }
    }
  };

  // Manual one-off sync
  const handleManualSync = async () => {
    setSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await fetch("/api/device/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const lastLine = data.output ? data.output.trim().split("\n").slice(-1)[0] : "Synced successfully!";
        setSyncFeedback({
          type: "success",
          message: lastLine,
        });
        router.refresh();
      } else {
        setSyncFeedback({
          type: "error",
          message: data.error || data.output || "Failed to communicate with ZKTeco device",
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Sync request failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Device Connection</CardTitle>
              {autoSyncRunning && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Auto-Sync Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">ZKTeco MB460 biometric terminal</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs shadow-xs"
              onClick={handleManualSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Feedback message banner */}
          {syncFeedback && (
            <div
              className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                syncFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {syncFeedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 break-words leading-tight">{syncFeedback.message}</div>
            </div>
          )}

          {/* Auto-Sync Configuration Panel */}
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Radio className={`h-4 w-4 ${autoSyncRunning ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs font-semibold leading-none">Automatic Periodic Sync</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {autoSyncRunning
                      ? `Running on server every ${intervalSec}s (${runCount} cycles)`
                      : "Pulls new student punches continuously in the background"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    className="h-7 text-xs bg-background border border-border rounded-md px-2 py-0 focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={intervalSec}
                    onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  size="sm"
                  variant={autoSyncRunning ? "secondary" : "default"}
                  className={`h-7 px-2.5 text-xs font-medium gap-1.5 shadow-2xs ${
                    autoSyncRunning ? "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300" : ""
                  }`}
                  onClick={toggleAutoSync}
                >
                  {autoSyncRunning ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      Start Auto-Sync
                    </>
                  )}
                </Button>
              </div>
            </div>

            {lastAutoRunAt && (
              <p className="mt-2 text-[10px] text-muted-foreground border-t pt-1.5">
                Last auto-cycle completed: <span className="font-mono">{displayDateTime(lastAutoRunAt)}</span>
              </p>
            )}
          </div>

          {/* Registered Devices List */}
          {devices.length === 0 ? (
            <EmptyState
              icon={Fingerprint}
              title="No device registered"
              description="The MB460 will appear here after you register it in the devices table."
            />
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const isOnline = device.status === "online";

                return (
                  <div
                    key={device.id}
                    className="rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isOnline
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          <Wifi className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight text-foreground">
                            {device.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {device.model} {device.serial_number ? `· SN: ${device.serial_number}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[device.status]} className="capitalize">
                        {device.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t pt-2.5">
                      <div>
                        <span className="font-medium text-foreground">IP Address:</span>{" "}
                        {device.ip_address || "192.168.100.30"}:{device.port || 4370}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">Last Seen:</span>{" "}
                        {displayDateTime(device.last_seen_at)}
                      </div>
                    </div>

                    {device.last_error && (
                      <p className="mt-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-md">
                        {device.last_error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-4 pt-0">
        <p className="text-[11px] text-muted-foreground text-center">
          With Auto-Sync enabled, student punches are captured within seconds without running any batch scripts.
        </p>
      </div>
    </Card>
  );
}
