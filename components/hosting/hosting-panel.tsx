"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Download,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Server,
  Wifi,
  Info,
  Loader2,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type TunnelState = {
  running: boolean;
  publicUrl: string | null;
  startedAt: string | null;
  error: string | null;
  cloudflaredInstalled: boolean;
  output?: string;
};

export function HostingPanel() {
  const [tunnel, setTunnel] = useState<TunnelState>({
    running: false,
    publicUrl: null,
    startedAt: null,
    error: null,
    cloudflaredInstalled: false,
  });
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tunnel");
      if (res.ok) {
        const data = await res.json();
        setTunnel(data);
      }
    } catch {
      // silent
    }
  }, []);

  // Poll status every 3 seconds (to catch when URL appears)
  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 3000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  const handleDownload = async () => {
    setDownloading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download" }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: "success", msg: data.message || "Downloaded successfully!" });
        refreshStatus();
      } else {
        setFeedback({ type: "error", msg: data.error || data.message || "Download failed" });
      }
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Download failed" });
    } finally {
      setDownloading(false);
    }
  };

  const handleTunnel = async (action: "start" | "stop") => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, port: 3000 }),
      });
      const data = await res.json();
      if (data.ok) {
        setTunnel(data);
        setFeedback({
          type: "success",
          msg: action === "start"
            ? "Tunnel is starting... your public URL will appear in ~10 seconds."
            : "Tunnel stopped. Your public URL is no longer active.",
        });
      } else {
        setFeedback({ type: "error", msg: data.error || "Action failed" });
      }
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const copyUrl = () => {
    if (tunnel.publicUrl) {
      navigator.clipboard.writeText(tunnel.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hosting & Remote Access</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Access your academy system from your phone or anywhere — without port forwarding or a static IP.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Info className="h-4 w-4" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
          <p>
            <strong>Cloudflare Tunnel</strong> gives your academy a free HTTPS link (e.g.{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">
              https://abc-xyz.trycloudflare.com
            </code>
            ) so you can open the system from your phone, home, or anywhere.
          </p>
          <p>
            Your PC stays at the academy running the app. The ZKTeco device and SMS phone stay on the
            local Wi-Fi. <strong>No router port forwarding needed.</strong>
          </p>
          <div className="flex flex-col gap-1 mt-2 font-mono text-[11px] text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2.5">
            <span>📱 Your Phone (anywhere)</span>
            <span className="pl-4">⬇ HTTPS</span>
            <span>☁️ Cloudflare</span>
            <span className="pl-4">⬇ Encrypted Tunnel</span>
            <span>🖥️ Academy PC → Next.js (localhost:3000)</span>
            <span className="pl-6">→ ZKTeco MB460 (192.168.100.30)</span>
            <span className="pl-6">→ SMS Phone (192.168.100.20)</span>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Download cloudflared */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                Install Cloudflare Tunnel
              </CardTitle>
              <CardDescription className="mt-1">
                Downloads <code className="font-mono text-xs">cloudflared.exe</code> directly into your project folder.
              </CardDescription>
            </div>
            {tunnel.cloudflaredInstalled ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Installed
              </Badge>
            ) : (
              <Badge variant="warning">Not installed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tunnel.cloudflaredInstalled ? (
            <p className="text-sm text-muted-foreground">
              ✅ <code className="font-mono text-xs">cloudflared.exe</code> is already installed in{" "}
              <code className="font-mono text-xs">D:\Unique\cloudflared.exe</code>. Ready to use.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                One-click download from GitHub (official Cloudflare release, ~30 MB). No account needed.
              </p>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Downloading... (may take 30–60s)" : "Download cloudflared.exe"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Start tunnel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Start Public Tunnel
              </CardTitle>
              <CardDescription className="mt-1">
                Creates a free HTTPS public URL for your academy — no account or login required.
              </CardDescription>
            </div>
            <Badge variant={tunnel.running ? "success" : "secondary"}>
              {tunnel.running ? "🟢 Active" : "⚪ Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Public URL display */}
          {tunnel.publicUrl && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Your Public URL (share this with your phone)
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 text-sm font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-2 rounded-lg break-all">
                  {tunnel.publicUrl}
                </code>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={copyUrl}
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    asChild
                  >
                    <a href={tunnel.publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-2">
                💡 Open this URL on your phone browser. The URL changes each time you restart the tunnel.
              </p>
            </div>
          )}

          {tunnel.running && !tunnel.publicUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Tunnel is starting… Your public URL will appear here in a few seconds.
            </div>
          )}

          {tunnel.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{tunnel.error}</span>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              )}
              {feedback.msg}
            </div>
          )}

          {/* Start/Stop buttons */}
          <div className="flex flex-wrap gap-2">
            {!tunnel.running ? (
              <Button
                onClick={() => handleTunnel("start")}
                disabled={actionLoading || !tunnel.cloudflaredInstalled}
                className="gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {actionLoading ? "Starting…" : "Start Public Tunnel"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => handleTunnel("stop")}
                disabled={actionLoading}
                className="gap-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 fill-current" />
                )}
                {actionLoading ? "Stopping…" : "Stop Tunnel"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refreshStatus} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {!tunnel.cloudflaredInstalled && (
            <p className="text-xs text-muted-foreground">
              ⚠️ Complete Step 1 (download cloudflared) before starting the tunnel.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Access from phone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            Access From Your Phone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-none space-y-2.5 text-muted-foreground">
            {[
              "Start the tunnel above (Step 2).",
              "Copy the public URL that appears (e.g. https://abc-xyz.trycloudflare.com).",
              "Open that URL in your phone's browser — Chrome, Safari, Firefox all work.",
              "Login with your Unique Academy credentials.",
              "Bookmark the page for quick daily access.",
            ].map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>Note:</strong> The free Cloudflare Tunnel URL changes each time you restart the tunnel.
            For a permanent URL, you can create a free{" "}
            <a
              href="https://dash.cloudflare.com/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Cloudflare account
            </a>{" "}
            and use a named tunnel — but the quick tunnel (above) works fine for daily use.
          </div>
        </CardContent>
      </Card>

      {/* Keep-alive / Supabase section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Supabase Keep-Alive
          </CardTitle>
          <CardDescription>
            Prevents your Supabase database from pausing after 7 days of inactivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To set this up for free, register your public URL on{" "}
            <a
              href="https://uptimerobot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline font-medium"
            >
              UptimeRobot.com
            </a>{" "}
            (free plan) with a monitor pointing to:
          </p>
          <code className="block text-xs font-mono bg-muted px-3 py-2 rounded-lg text-muted-foreground">
            {tunnel.publicUrl
              ? `${tunnel.publicUrl}/api/health`
              : "https://your-public-url.trycloudflare.com/api/health"}
          </code>
          <p className="text-xs text-muted-foreground">
            UptimeRobot pings this every 5 minutes for free. The{" "}
            <code className="font-mono">/api/health</code> route auto-records a keep-alive attendance
            entry after 5 days of inactivity, resetting Supabase&apos;s 7-day inactivity timer.
          </p>
          <KeepAliveButton />
        </CardContent>
      </Card>

      {/* Local network info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            Local Network Access
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            When you&apos;re on the same Wi-Fi as the academy (connected to <strong>Rana-4G</strong>),
            you can access the app directly without the tunnel:
          </p>
          <code className="block font-mono text-xs bg-muted px-3 py-2 rounded-lg">
            http://192.168.100.8:3000
          </code>
          <p className="text-xs">
            This is faster and works even if Cloudflare is down. Use the public tunnel URL only when
            you&apos;re away from the academy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KeepAliveButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const ping = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/health?force=1");
      const data = await res.json();
      setResult(data.keepAliveStatus || (data.ok ? "✅ Database pinged successfully." : "❌ Ping failed."));
    } catch (e) {
      setResult("❌ Could not reach health endpoint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={ping} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link className="h-3.5 w-3.5" />}
        {loading ? "Pinging…" : "Test Keep-Alive Now"}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">{result}</p>
      )}
    </div>
  );
}
