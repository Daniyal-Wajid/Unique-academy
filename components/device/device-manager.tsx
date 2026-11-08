"use client";

import { useState } from "react";
import {
  Fingerprint,
  Cpu,
  Wifi,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function DeviceManager({
  deviceSerial,
  defaultIp,
}: {
  deviceSerial: string;
  defaultIp: string;
}) {
  const [deviceIp, setDeviceIp] = useState(defaultIp || "192.168.1.201");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function handleSimulateScan() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            zk_user_id: "1",
            punched_at: new Date().toISOString(),
            punch_type: "check_in",
          },
          {
            zk_user_id: "2",
            punched_at: new Date().toISOString(),
            punch_type: "check_in",
          },
        ]),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Success! Captured 2 test fingerprint punches. Processed & matched ${data.matchedStudents} student(s).`,
        });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to simulate scan" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error during scan simulation" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Biometric Device Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure and sync attendance from your ZKTeco MB460 / ID fingerprint terminal.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              : statusMessage.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
              : "border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Device Status Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">ZKTeco MB460 / ID Terminal</CardTitle>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Configured
              </Badge>
            </div>
            <CardDescription>
              Hardware terminal for fingerprint registration and attendance clocking.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block mb-1">Model</span>
                <span className="font-semibold text-foreground">MB460 / ID</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block mb-1">Serial Number</span>
                <span className="font-mono font-semibold text-foreground">{deviceSerial}</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block mb-1">Port</span>
                <span className="font-mono font-semibold text-foreground">4370 (TCP/IP)</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block mb-1">MAC Address</span>
                <span className="font-mono text-muted-foreground">00:17:61:11:9E:86</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Device LAN IP Address (in .env.local ZKTECO_IP)
              </label>
              <div className="flex gap-2">
                <Input
                  value={deviceIp}
                  onChange={(e) => setDeviceIp(e.target.value)}
                  placeholder="192.168.1.201"
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Set this to the IP assigned to your MB460 machine by your Wi-Fi router.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateScan}
                disabled={loading}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Simulate Test Fingerprint Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Python Sync Service Guide */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Sync Attendance via Python</CardTitle>
            </div>
            <CardDescription>
              A lightweight background script runs on this academy PC to pull logs over LAN.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              Because the ZKTeco device communicates over port 4370 on your local academy router,
              a Python script reads the punches and uploads them into Supabase.
            </p>

            <div className="space-y-2 rounded-lg bg-muted/60 p-3 font-mono text-[11px]">
              <div className="text-muted-foreground"># 1. Install prerequisites (once)</div>
              <div className="text-foreground">pip install -r device-service/requirements.txt</div>
              <div className="text-muted-foreground mt-2"># 2. Test device connection</div>
              <div className="text-foreground">python device-service/sync.py --test</div>
              <div className="text-muted-foreground mt-2"># 3. Fetch logs and sync</div>
              <div className="text-foreground">python device-service/sync.py</div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <p className="font-semibold mb-1">1-Click Windows Shortcut</p>
              <p className="text-[11px]">
                You can simply double-click <code className="font-mono font-bold">device-service\run_sync.bat</code>{" "}
                on your desktop or folder anytime to fetch logs from the device!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
