import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // High-Thinking Gemini AI Endpoint for Python Farm Code Optimization & Debugging
  app.post("/api/ai/optimize", async (req, res) => {
    const { code, farmSummary, unlockedNodes, question } = req.body;

    const buildOfflineOptimization = () => ({
      ringkasanAnalisis:
        "Rute traktor dapat dioptimalkan dengan memeriksa sisa bahan bakar solar sebelum mencapai 20L dan mengecek status tanah dengan check_soil() sebelum membajak atau memanen.",
      estimasiHematSolar: "Hemat ~35% konsumsi solar dengan can_harvest() & check_soil()",
      tipsLogika: [
        "Gunakan 'if tractor.fuel < 25:' di awal loop agar traktor tidak kehabisan solar di petak lumpur.",
        "Gunakan 'if can_harvest(): harvest()' sebelum membajak ulang petak.",
        "Setor muatan ke gudang dengan 'tractor.deliver()' saat muatan mendekati penuh.",
      ],
      rekomendasiKode: `while True:
    if tractor.fuel < 25:
        tractor.go_to_fuel()
        tractor.refuel()
    if tractor.cargo >= 8:
        tractor.go_to_barn()
        tractor.deliver()
    if can_harvest():
        tractor.harvest()
    if check_soil() == "wild":
        tractor.plow()
        tractor.plant("wheat")
    elif check_soil() == "plowed":
        tractor.plant("wheat")
    tractor.move(1)
    if tractor.x == get_world_size() - 1 or tractor.x == 0:
        tractor.turn("right")`,
    });

    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
        res.json(buildOfflineOptimization());
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemPrompt = `Anda adalah Instruktur Otomasi Pertanian di dalam game 3D "AgroCode".
Pemain menulis kode Python (dalam bahasa Inggris standar Python) untuk mengendalikan traktor di grid 3D pulau melayang.

Fungsi Python API yang tersedia di dalam game (JANGAN terjemahkan nama fungsi Python ke bahasa Indonesia):
- Movement: move(steps=1), turn("right" | "left" | "north" | "east" | "south" | "west"), tractor.go_to_fuel(), tractor.go_to_barn(), tractor.go_to(x, z)
- Farming & Tools: equip("plow" | "seeder" | "harvester" | "trailer"), plow(), plant("wheat" | "carrot" | "corn" | "wood"), harvest(), refuel(), deliver()
- Sensors & Properties: can_harvest(), check_soil() (returns "wild", "plowed", "planted", "ready", "mud", "fuel_station", "barn"), get_world_size(), status(), tractor.fuel, tractor.cargo, tractor.x, tractor.z, tractor.direction, tractor.tool

Berikan penjelasan analisis dalam Bahasa Indonesia, namun pastikan seluruh kode di dalam 'rekomendasiKode' menggunakan sintaks Python bahasa Inggris standar di atas.`;

      const userPrompt = `Current Player Python Code:
\`\`\`python
${code || "# Empty"}
\`\`\`

Farm & Tractor State:
${JSON.stringify(farmSummary || {}, null, 2)}

Unlocked Tech Tree Nodes:
${JSON.stringify(unlockedNodes || [], null, 2)}

Player Request:
${question || "Optimize fuel usage and harvesting route in Python."}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ringkasanAnalisis: {
                type: Type.STRING,
                description: "Penjelasan singkat mengenai masalah atau peluang efisiensi pada kode pemain.",
              },
              estimasiHematSolar: {
                type: Type.STRING,
                description: "Estimasi penghematan solar dan waktu.",
              },
              tipsLogika: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 poin saran perbaikan algoritma.",
              },
              rekomendasiKode: {
                type: Type.STRING,
                description: "Kode Python berbahasa Inggris standar (move, turn, plow, plant, harvest, can_harvest, check_soil) yang siap dijalankan.",
              },
            },
            required: ["ringkasanAnalisis", "estimasiHematSolar", "tipsLogika", "rekomendasiKode"],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: any) {
      console.warn("Using built-in heuristic optimization fallback:", error?.message);
      res.json(buildOfflineOptimization());
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AgroCode Server running on http://localhost:${PORT}`);
  });
}

startServer();
