/**
 * LightingAdapter.ts
 *
 * Simula o Sistema de Iluminação Pública de um fornecedor diferente,
 * que entrega dados em formato pseudo-CSV (string delimitada por vírgulas).
 * O adaptador converte essa string para o schema canônico LightingData[].
 *
 * Esse cenário é comum em sistemas legados de controle de luminárias que
 * exportam dados via arquivos CSV ou protocolos SCADA antigos.
 */

import { LightingData } from "../models/CityDataSchema";

// Mock: simula a resposta CSV do sistema de iluminação
// Formato: zoneId,intensityPercent,autoMode(0|1),activeLamps,unixTimestampMs
function fetchRawCsvLighting(): string {
  const now = Date.now();
  return [
    `ZONA-NORTE,75,1,120,${now - 8000}`,
    `ZONA-SUL,50,0,98,${now - 6000}`,
    `ZONA-CENTRO,90,1,210,${now - 4000}`,
    `ZONA-LESTE,30,1,85,${now - 2000}`,
  ].join("\n");
}

/**
 * LightingAdapter
 *
 * Responsabilidade única: interpretar o CSV do sistema de iluminação
 * e converter para LightingData[].
 */
export class LightingAdapter {
  /** Estado interno em memória para suportar ajustes via POST */
  private overrides: Map<string, number> = new Map();

  /**
   * Retorna os dados de iluminação normalizados.
   * Aplica overrides (ajustes manuais) por cima dos dados do fornecedor.
   */
  getData(): LightingData[] {
    const csv = fetchRawCsvLighting();
    const lines = csv.trim().split("\n");

    return lines.map((line): LightingData => {
      const [zoneId, intensity, autoMode, activeLamps, readTime] = line.split(",");

      // Verifica se há um override manual para esta zona
      const parsedIntensity = parseInt(intensity, 10);
      const effectiveIntensity = this.overrides.has(zoneId)
        ? this.overrides.get(zoneId)!
        : parsedIntensity;

      return {
        zoneId,
        intensityPercent: Math.min(100, Math.max(0, effectiveIntensity)),
        autoMode: autoMode === "1",
        activeLamps: parseInt(activeLamps, 10),
        timestamp: new Date(parseInt(readTime, 10)).toISOString(),
      };
    });
  }

  /**
   * Aplica um ajuste de intensidade para uma zona específica.
   * O valor é persistido em memória e retornado nas próximas chamadas a getData().
   *
   * @param zoneId    Identificador da zona
   * @param intensity Nova intensidade (0–100)
   */
  setIntensity(zoneId: string, intensity: number): void {
    this.overrides.set(zoneId, Math.min(100, Math.max(0, intensity)));
  }
}
