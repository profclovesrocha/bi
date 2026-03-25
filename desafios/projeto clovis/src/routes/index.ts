/**
 * routes/index.ts
 *
 * Define todos os endpoints REST da API do middleware urbano.
 * Cada rota delega a lógica ao CityHub, mantendo os controllers
 * simples e focados apenas no protocolo HTTP.
 */

import { Router, Request, Response } from "express";
import { CityHub } from "../core/CityHub";
import { LightingAdjustPayload } from "../models/CityDataSchema";

const router = Router();
const hub = new CityHub();

/**
 * GET /api/status
 * Retorna o estado consolidado de todos os subsistemas da cidade.
 */
router.get("/status", (_req: Request, res: Response) => {
  try {
    const status = hub.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erro ao obter status da cidade." });
  }
});

/**
 * GET /api/traffic
 * Retorna os dados de tráfego normalizados de todas as seções monitoradas.
 */
router.get("/traffic", (_req: Request, res: Response) => {
  try {
    const traffic = hub.getTraffic();
    res.json({ success: true, data: traffic });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erro ao obter dados de tráfego." });
  }
});

/**
 * GET /api/lighting
 * Retorna os dados de iluminação normalizados de todas as zonas urbanas.
 */
router.get("/lighting", (_req: Request, res: Response) => {
  try {
    const lighting = hub.getLighting();
    res.json({ success: true, data: lighting });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erro ao obter dados de iluminação." });
  }
});

/**
 * GET /api/weather
 * Retorna os dados meteorológicos normalizados.
 */
router.get("/weather", (_req: Request, res: Response) => {
  try {
    const weather = hub.getWeather();
    res.json({ success: true, data: weather });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erro ao obter dados meteorológicos." });
  }
});

/**
 * POST /api/lighting/adjust
 * Ajusta a intensidade de iluminação de uma zona urbana.
 *
 * Body (JSON):
 *   - zoneId: string (obrigatório)
 *   - targetIntensity?: number (0–100, opcional — se omitido, o hub calcula)
 *
 * Exemplo:
 *   { "zoneId": "ZONA-NORTE", "targetIntensity": 85 }
 */
router.post("/lighting/adjust", (req: Request, res: Response) => {
  try {
    const payload = req.body as LightingAdjustPayload;

    if (!payload.zoneId) {
      res.status(400).json({ success: false, error: "O campo zoneId é obrigatório." });
      return;
    }

    if (
      payload.targetIntensity !== undefined &&
      (payload.targetIntensity < 0 || payload.targetIntensity > 100)
    ) {
      res.status(400).json({
        success: false,
        error: "targetIntensity deve estar entre 0 e 100.",
      });
      return;
    }

    const updated = hub.adjustLighting(payload);
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao ajustar iluminação.";
    res.status(404).json({ success: false, error: message });
  }
});

export default router;
