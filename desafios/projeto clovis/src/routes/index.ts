/**
 * routes/index.ts
 *
 * Define todos os endpoints REST da API do middleware urbano.
 * Cada rota delega a lógica ao CityHub, mantendo os controllers
 * focados apenas no protocolo HTTP.
 */

import { Router, Request, Response } from "express";
import { CityHub } from "../core/CityHub";
import { eventBus } from "../core/EventBus";
import { LightingAdjustPayload } from "../models/CityDataSchema";

const router = Router();
const hub    = new CityHub();

/** GET /api/status — estado consolidado de todos os subsistemas */
router.get("/status", (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: hub.getStatus() });
  } catch {
    res.status(500).json({ success: false, error: "Erro ao obter status da cidade." });
  }
});

/** GET /api/traffic — dados de tráfego normalizados */
router.get("/traffic", (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: hub.getTraffic() });
  } catch {
    res.status(500).json({ success: false, error: "Erro ao obter dados de tráfego." });
  }
});

/** GET /api/lighting — dados de iluminação normalizados */
router.get("/lighting", (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: hub.getLighting() });
  } catch {
    res.status(500).json({ success: false, error: "Erro ao obter dados de iluminação." });
  }
});

/** GET /api/weather — dados meteorológicos normalizados */
router.get("/weather", (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: hub.getWeather() });
  } catch {
    res.status(500).json({ success: false, error: "Erro ao obter dados meteorológicos." });
  }
});

/**
 * GET /api/events — histórico de eventos do EventBus
 * Permite o dashboard exibir em tempo real as mensagens trocadas
 * entre os subsistemas (Observer Pattern).
 *
 * Query param: ?limit=N (padrão 30)
 */
router.get("/events", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "30"), 10), 100);
  res.json({ success: true, data: eventBus.getHistory(limit) });
});

/**
 * POST /api/lighting/adjust — ajusta intensidade de uma zona
 *
 * Body: { zoneId: string, targetIntensity?: number }
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
      res.status(400).json({ success: false, error: "targetIntensity deve estar entre 0 e 100." });
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
