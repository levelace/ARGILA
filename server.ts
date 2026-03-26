import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import axios from "axios";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { Orchestrator, ScanSession } from "./src/engine/Orchestrator.js";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[ASE] New WebSocket connection established");

    ws.on("message", async (data: string) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === "START_SCAN") {
          const session: ScanSession = msg.session;
          const orchestrator = new Orchestrator((level, line) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "LOG", level, line, ts: Date.now() }));
            }
          });

          const result = await orchestrator.run(session);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "SCAN_COMPLETE", result }));
          }
        }

        if (msg.type === "PIPE_PAYLOAD") {
          const { url, payload } = msg;
          try {
            const fullUrl = url.includes('?')
              ? `${url}${payload.startsWith('&') ? payload : '&' + payload}`
              : `${url}${payload.startsWith('?') ? payload : '?' + payload}`;

            const res = await axios.get(fullUrl, {
              timeout: 10000, 
              validateStatus: () => true,
              headers: { 'User-Agent': 'Argila-Sentinel-Engine/3.0' }
            });
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                type: "EXPLOIT_RESPONSE", 
                status: res.status, 
                headers: res.headers,
                body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
              }));
            }
          } catch (e: any) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                type: "EXPLOIT_RESPONSE", 
                status: 500, 
                body: `Error: ${e.message}` 
              }));
            }
          }
        }
      } catch (e: any) {
        console.error("[ASE] WS Message Error:", e);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "LOG",
            level: "error",
            line: `[SYSTEM_ERROR] ${e.message}`,
            ts: Date.now()
          }));
        }
      }
    });

    ws.on("close", () => {
      console.log("[ASE] WebSocket connection closed");
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", engine: "Argila Sentinel Engine v3.0" });
  });

  app.get("/api/rules", (req, res) => {
    const orchestrator = new Orchestrator(() => {});
    res.json(orchestrator.getRules());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[ASE] Sentinel Engine online at http://localhost:${PORT}`);
  });
}

startServer();
