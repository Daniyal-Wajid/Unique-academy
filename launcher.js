/**
 * Unique Academy — App Launcher
 * ==============================
 * Run this once to start the web server:
 *   node launcher.js
 *
 * Or double-click "Start Unique Academy.vbs" (auto-created by this script)
 * which runs this silently in the background.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const LOG_FILE = path.join(ROOT, "launcher.log");

function log(msg) {
  const line = `[${new Date().toLocaleTimeString("en-PK")}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ── Create a VBS shortcut so user can double-click to launch silently ──
function createVbsLauncher() {
  const vbsPath = path.join(ROOT, "Start Unique Academy.vbs");
  if (!fs.existsSync(vbsPath)) {
    const nodePath = process.execPath.replace(/\\/g, "\\\\");
    const launcherPath = path.join(ROOT, "launcher.js").replace(/\\/g, "\\\\");
    const vbs = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run "cmd /c \\"cd /d ${ROOT.replace(/\\/g, "\\\\")} && node launcher.js\\"", 0, False`;
    fs.writeFileSync(vbsPath, vbs);
    log(`Created shortcut: ${vbsPath}`);
  }
}

function openBrowser(url, delay = 3000) {
  setTimeout(() => {
    spawn("cmd", ["/c", "start", url], { shell: true, detached: true, stdio: "ignore" });
  }, delay);
}

log("=== Unique Academy Launcher ===");
log(`Working directory: ${ROOT}`);

createVbsLauncher();

// Start Next.js dev server
log("Starting Next.js server on http://localhost:3000 ...");

const server = spawn("npx", ["next", "start", "--port", "3000"], {
  cwd: ROOT,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: false,
});

server.stdout.on("data", (data) => {
  const text = data.toString().trim();
  if (text) log(`[server] ${text}`);
  if (text.includes("Ready") || text.includes("started server")) {
    log("✅ Server is ready!");
    openBrowser("http://localhost:3000");
  }
});

server.stderr.on("data", (data) => {
  const text = data.toString().trim();
  if (text) log(`[server:err] ${text}`);
});

server.on("exit", (code) => {
  log(`Server exited with code ${code}`);
});

process.on("SIGINT", () => {
  log("Shutting down...");
  server.kill();
  process.exit(0);
});

log("Server starting — browser will open automatically in a few seconds.");
log("Keep this window open while using the app. Close it to stop the server.");

