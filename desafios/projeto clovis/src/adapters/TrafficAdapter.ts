/**
 * TrafficAdapter.ts
 *
 * Simula o Sistema de Tráfego de um fornecedor externo que entrega
 * dados em formato JSON com nomes de campos em snake_case e unidades
 * proprietárias. O adaptador aplica o padrão Adapter para converter
 * esses dados para o schema canônico do CityHub.
 */

import { TrafficData } from "../models/CityDataSchema";

// ── Formato bruto do fornecedor de tráfego ────────────────────────────────────

interface RawTrafficRecord {
  section_id: string;
  vehicles_per_min: number;
  occupancy_pct: number;     // 0–100
  signal_color: "G" | "Y" | "R";
  read_time: number;         // Unix timestamp (ms)
}

// Mock: simula a resposta do sistema externo de tráfego
function fetchRawTrafficData(): RawTrafficRecord[] {
  return [
    {
      section_id: "AV-BRASIL-01",
      vehicles_per_min: 42,
      occupancy_pct: 68,
      signal_color: "Y",
      read_time: Date.now() - 5000,
    },
    {
      section_id: "RUA-COPA-03",
      vehicles_per_min: 12,
      occupancy_pct: 20,
      signal_color: "G",
      read_time: Date.now() - 3000,
    },
    {
      section_id: "TUNEL-REP-02",
      vehicles_per_min: 88,
      occupancy_pct: 95,
      signal_color: "R",
      read_time: Date.now() - 1000,
    },
  ];
}

// Mapeamento entre os códigos do fornecedor e o schema canônico
const signalMap: Record<"G" | "Y" | "R", TrafficData["trafficLightStatus"]> = {
  G: "green",
  Y: "yellow",
  R: "red",
};

/**
 * TrafficAdapter
 *
 * Responsabilidade única: buscar dados brutos do sistema de tráfego
 * e convertê-los para o formato canônico TrafficData[].
 */
export class TrafficAdapter {
  /**
   * Retorna os dados de tráfego normalizados.
   * Em produção, este método faria uma chamada HTTP/gRPC ao sistema real.
   */
  getData(): TrafficData[] {
    const raw = fetchRawTrafficData();

    return raw.map((record): TrafficData => ({
      sectionId: record.section_id,
      flowRate: record.vehicles_per_min,
      congestionLevel: record.occupancy_pct,
      trafficLightStatus: signalMap[record.signal_color],
      timestamp: new Date(record.read_time).toISOString(),
    }));
  }
}
