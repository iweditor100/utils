/**
 * DEV SCRIPT: Socket Listener
 *
 * Logs in, connects to the Socket.IO server, and prints every
 * download event in real-time. Use this to verify the socket
 * pipeline end-to-end without opening the browser.
 *
 * Usage:
 *   npm run dev:socket
 *
 * Env vars (or set in .env):
 *   API_URL      — backend base URL  (default: http://localhost:3000)
 *   DEV_EMAIL    — login email
 *   DEV_PASSWORD — login password
 */

import { io } from "socket.io-client";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_URL   = (process.env.API_URL   ?? "http://localhost:4000").replace(/\/$/, "");
const EMAIL     = process.env.DEV_EMAIL    ?? "iweditor200@gmail.com";
const PASSWORD  = process.env.DEV_PASSWORD ?? "yogarth123";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toLocaleTimeString();
}

function bar(pct: number, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function tag(label: string, color: string) {
  const colors: Record<string, string> = {
    green:  "\x1b[32m",
    yellow: "\x1b[33m",
    red:    "\x1b[31m",
    cyan:   "\x1b[36m",
    reset:  "\x1b[0m",
  };
  return `${colors[color] ?? ""}[${label}]${colors.reset}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("❌  Set DEV_EMAIL and DEV_PASSWORD in your .env before running this script.");
    process.exit(1);
  }

  // 1. Login — get access token
  console.log(`\n${tag("AUTH", "cyan")} Logging in as ${EMAIL} → ${API_URL}/auth/login`);

  let accessToken: string;
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD }, {
      withCredentials: true,
    });
    accessToken = res.data.data.accessToken;
    console.log(`${tag("AUTH", "green")} ✓ Token received: ${accessToken.slice(0, 24)}…\n`);
  } catch (err: any) {
    const detail = err?.response?.data ?? err.message;
    console.error(`${tag("AUTH", "red")} ✗ Login failed:`, detail);
    process.exit(1);
  }

  // 2. Connect to Socket.IO
  console.log(`${tag("SOCKET", "cyan")} Connecting to ${API_URL}…`);

  const socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnection: false,
  });

  socket.on("connect", () => {
    console.log(`${tag("SOCKET", "green")} ✓ Connected  id=${socket.id}`);
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  Listening for download events. Trigger a ZIP from the UI.`);
    console.log(`${"─".repeat(60)}\n`);
  });

  socket.on("connect_error", (err) => {
    console.error(`${tag("SOCKET", "red")} ✗ connect_error: ${err.message}`);
    console.error("  → Is the backend running? Is the token valid?");
    process.exit(1);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`\n${tag("SOCKET", "yellow")} ⚠ Disconnected: ${reason}`);
  });

  // ── Download events ──────────────────────────────────────────────────────

  socket.on("download:progress", (data: { jobId: string; progress: number }) => {
    console.log(
      `${ts()}  ${tag("progress", "cyan")}  jobId=${data.jobId}  [${bar(data.progress)}]  ${data.progress}%`
    );
  });

  socket.on("download:complete", (data: { jobId: string }) => {
    console.log(
      `${ts()}  ${tag("complete", "green")}  jobId=${data.jobId}  ✓ ZIP ready`
    );
  });

  socket.on("download:failed", (data: { jobId: string; error?: string }) => {
    console.log(
      `${ts()}  ${tag("failed", "red")}  jobId=${data.jobId}  ✗ ${data.error ?? "unknown error"}`
    );
  });

  // ── Catch-all — shows any other events emitted by the server ────────────

  socket.onAny((event: string, ...args: unknown[]) => {
    const known = ["download:progress", "download:complete", "download:failed"];
    if (!known.includes(event)) {
      console.log(`${ts()}  ${tag("event", "yellow")}  ${event}`, args);
    }
  });

  // ── Graceful exit ────────────────────────────────────────────────────────

  process.on("SIGINT", () => {
    console.log(`\n${tag("SOCKET", "yellow")} Disconnecting…`);
    socket.disconnect();
    process.exit(0);
  });
}

main();
