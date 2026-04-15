import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));

app.post("/__admin/apply", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "payload invalid" });
    }
    const out = {
      version: Number(payload.version) || 7,
      text: payload.text && typeof payload.text === "object" ? payload.text : {},
      elementStyles: payload.elementStyles && typeof payload.elementStyles === "object" ? payload.elementStyles : {},
      globalCss: typeof payload.globalCss === "string" ? payload.globalCss : "",
    };
    const jsonPath = path.join(root, "site-content.json");
    fs.writeFileSync(jsonPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");

    execFile(process.execPath, [path.join(root, "scripts", "apply-site-content.mjs")], { cwd: root }, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          error: "apply failed",
          details: stderr || stdout || String(err.message || err),
        });
      }
      return res.json({ ok: true, message: "updated", stdout: String(stdout || "").trim() });
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.use(express.static(root, { extensions: ["html"] }));

app.listen(PORT, () => {
  console.log(`[dev-server] http://localhost:${PORT}`);
});

