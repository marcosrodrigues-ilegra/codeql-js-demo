import express from "express";
import { execFile } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

/** ───────── Rate limit muito simples (por IP) ───────── **/
const rate = new Map(); // ip -> { count, windowStart }
const WINDOW_MS = 60_000;       // 1 min
const MAX_REQS = 30;            // 30 req/min

function rateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rate.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  rate.set(ip, entry);

  if (entry.count > MAX_REQS) {
    return res.status(429).send("Too Many Requests");
  }
  next();
}

/** ───────── util: valida hostname ou IPv4 ───────── **/
function isValidHost(input) {
  const s = String(input ?? "");
  // hostnames simples (sem espaços/nem metacaracteres), IPv4 básico
  const hostRe = /^(?:[a-zA-Z0-9-]{1,63}\.)*[a-zA-Z0-9-]{1,63}$|^(?:\d{1,3}\.){3}\d{1,3}$/;
  return hostRe.test(s);
}

app.get("/", (_req, res) => {
  res.send("Hello from CodeQL demo — safe version!");
});

/**
 * /ping seguro (sem shell + validação)
 * Ex.: /ping?host=example.com
 */
app.get("/ping", rateLimit, (req, res) => {
  const host = String(req.query.host || "127.0.0.1").trim();

  if (!isValidHost(host)) {
    return res.status(400).send("Invalid host");
  }

  // usa execFile (sem shell) — evita command injection
  const args = process.platform === "darwin" ? ["-c", "1", host] : ["-c", "1", host]; // ajuste se for Windows
  const child = execFile("ping", args, { timeout: 5_000 }, (err, stdout, stderr) => {
    if (err) {
      // não devolve stderr bruto; evita leak de detalhes
      return res.status(400).send("Ping failed");
    }
    res.type("text/plain").send(stdout);
  });

  // defesa: limita saída
  child.stdout?.setEncoding("utf8");
});

app.listen(PORT, () => {
  console.log(`Demo listening on http://localhost:${PORT}`);
});
