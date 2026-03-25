/**
 * TrafficAdapter.ts
 *
 * Simula o Sistema de Tráfego de um fornecedor externo que entrega
 * dados em formato JSON com nomes de campos em snake_case e unidades
 * proprietárias. O adaptador aplica o padrão Adapter para converter
 * esses dados para o schema canônico do CityHub.
 *
 * Os dados simulados variam levemente a cada chamada para representar
 * um sistema real com leituras contínuas de sensores.
 */

import { TrafficData } from "../models/CityDataSchema";

// ── Formato bruto do fornecedor de tráfego ────────────────────────────────────

interface RawTrafficRecord {
  section_id: string;
  vehicles_per_min: number;
  occupancy_pct: number;   // 0–100
  signal_color: "G" | "Y" | "R";
  read_time: number;       // Unix timestamp ms
}

/** Variação aleatória dentro de um intervalo centrado em zero */
function jitter(range: number): number {
  return Math.round((Math.random() - 0.5) * 2 * range);
}

/** Clamp de valor entre min e max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Retorna o sinal do semáforo baseado no nível de congestionamento,
 * simulando a lógica real de um controlador de tráfego adaptativo.
 */
function deriveSignal(occupancy: number): "G" | "Y" | "R" {
  if (occupancy >= 75) return "R";
  if (occupancy >= 45) return "Y";
  return "G";
}

// Estado base dos sensores — imita registros persistentes do sistema externo
const baseSections = [
  { section_id: "AV-BRASIL-01",  vehicles_per_min: 42, occupancy_pct: 68 },
  { section_id: "RUA-COPA-03",   vehicles_per_min: 12, occupancy_pct: 20 },
  { section_id: "TUNEL-REP-02",  vehicles_per_min: 88, occupancy_pct: 91 },
];

function fetchRawTrafficData(): RawTrafficRecord[] {
  return baseSections.map((s) => {
    const occupancy = clamp(s.occupancy_pct + jitter(8), 0, 100);
    return {
      section_id:       s.section_id,
      vehicles_per_min: clamp(s.vehicles_per_min + jitter(10), 0, 200),
      occupancy_pct:    occupancy,
      signal_color:     deriveSignal(occupancy),
      read_time:        Date.now(),
    };
  });
}

const signalMap: Record<"G" | "Y" | "R", TrafficData["trafficLightStatus"]> = {
  G: "green",
  Y: "yellow",
  R: "red",
};

export class TrafficAdapter {
  getData(): TrafficData[] {
    return fetchRawTrafficData().map((record): TrafficData => ({
      sectionId:          record.section_id,
      flowRate:           record.vehicles_per_min,
      congestionLevel:    record.occupancy_pct,
      trafficLightStatus: signalMap[record.signal_color],
      timestamp:          new Date(record.read_time).toISOString(),
    }));
  }
}
