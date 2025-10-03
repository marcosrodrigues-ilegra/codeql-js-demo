import express from "express";
import { exec } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("Hello from CodeQL demo!");
});

/**
 * ROTA VULNERÁVEL (DE PROPÓSITO p/ DEMO)
 * Ex.: /ping?host=example.com  -> OK
 *     /ping?host=;cat%20/etc/passwd -> CodeQL deve alertar (command injection)
 */
app.get("/ping", (req, res) => {
  const host = req.query.host || "127.0.0.1";
  // NÃO FAÇA ISSO EM PROJETO REAL
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    if (err) return res.status(400).send(stderr || err.message);
    res.type("text/plain").send(stdout);
  });
});

app.listen(PORT, () => {
  console.log(`Demo listening on http://localhost:${PORT}`);
});
