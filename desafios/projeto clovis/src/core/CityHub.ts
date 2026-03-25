/**
 * CityHub.ts
 *
 * O middleware central do sistema. Responsável por:
 *   1. Orquestrar os três adaptadores (tráfego, iluminação, clima)
 *   2. Normalizar os dados para o schema canônico
 *   3. Publicar eventos no EventBus quando os dados são atualizados
 *   4. Implementar a lógica de ajuste automático de iluminação com base
 *      nas condições de tráfego e clima (regra de negócio urbana)
 *
 * O CityHub atua como o ponto único de integração — os subsistemas não
 * se comunicam diretamente entre si, reduzindo o acoplamento e evitando
 * vendor lock-in.
 */

import { TrafficAdapter } from "../adapters/TrafficAdapter";
import { LightingAdapter } from "../adapters/LightingAdapter";
import { WeatherAdapter } from "../adapters/WeatherAdapter";
import { eventBus } from "./EventBus";
import {
  CityStatus,
  LightingAdjustPayload,
  LightingData,
  TrafficData,
  WeatherData,
} from "../models/CityDataSchema";

export class CityHub {
  private trafficAdapter: TrafficAdapter;
  private lightingAdapter: LightingAdapter;
  private weatherAdapter: WeatherAdapter;

  constructor(
    trafficAdapter?: TrafficAdapter,
    lightingAdapter?: LightingAdapter,
    weatherAdapter?: WeatherAdapter
  ) {
    // Injeção de dependência — facilita testes unitários com mocks
    this.trafficAdapter = trafficAdapter ?? new TrafficAdapter();
    this.lightingAdapter = lightingAdapter ?? new LightingAdapter();
    this.weatherAdapter = weatherAdapter ?? new WeatherAdapter();

    // Registra os ouvintes para reagir a eventos entre subsistemas
    this.registerEventHandlers();
  }

  /**
   * Registra os handlers do EventBus.
   * Quando o clima muda para "rainy" ou "stormy", aumenta automaticamente
   * a iluminação em todas as zonas (reação cross-subsistema).
   */
  private registerEventHandlers(): void {
    eventBus.on<WeatherData>("weather:updated", (weather) => {
      if (weather.condition === "rainy" || weather.condition === "stormy") {
        const zones = this.lightingAdapter.getData().map((z) => z.zoneId);
        zones.forEach((zoneId) => {
          // Aumenta para pelo menos 80% durante chuva/tempestade
          const current = this.lightingAdapter
            .getData()
            .find((z) => z.zoneId === zoneId);
          if (current && current.intensityPercent < 80) {
            this.lightingAdapter.setIntensity(zoneId, 80);
          }
        });
        eventBus.emit("lighting:auto-adjusted", {
          reason: weather.condition,
          timestamp: new Date().toISOString(),
        });
      }
    });

    eventBus.on<TrafficData[]>("traffic:updated", (traffic) => {
      // Zonas com congestionamento > 80% recebem iluminação máxima
      const congested = traffic.filter((t) => t.congestionLevel > 80);
      if (congested.length > 0) {
        const zones = this.lightingAdapter.getData().map((z) => z.zoneId);
        zones.forEach((zoneId) => {
          this.lightingAdapter.setIntensity(zoneId, 100);
        });
        eventBus.emit("lighting:auto-adjusted", {
          reason: "high-traffic-congestion",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // ── Leitura de dados ────────────────────────────────────────────────────────

  /** Coleta e retorna dados de tráfego, emitindo o evento correspondente. */
  getTraffic(): TrafficData[] {
    const data = this.trafficAdapter.getData();
    eventBus.emit("traffic:updated", data);
    return data;
  }

  /** Coleta e retorna dados de iluminação, emitindo o evento correspondente. */
  getLighting(): LightingData[] {
    const data = this.lightingAdapter.getData();
    eventBus.emit("lighting:updated", data);
    return data;
  }

  /** Coleta e retorna dados meteorológicos, emitindo o evento correspondente. */
  getWeather(): WeatherData {
    const data = this.weatherAdapter.getData();
    eventBus.emit("weather:updated", data);
    return data;
  }

  /**
   * Retorna o estado consolidado de todos os subsistemas.
   * É o ponto de entrada único para o dashboard da cidade.
   */
  getStatus(): CityStatus {
    return {
      traffic: this.getTraffic(),
      lighting: this.getLighting(),
      weather: this.getWeather(),
      lastSyncAt: new Date().toISOString(),
    };
  }

  // ── Ação de controle ────────────────────────────────────────────────────────

  /**
   * Ajusta a iluminação de uma zona considerando o contexto atual de
   * tráfego e clima. Se nenhuma intensidade-alvo for fornecida, o hub
   * calcula o valor ideal automaticamente.
   *
   * Lógica de cálculo automático:
   *   - Base: 50%
   *   - +30% se a via correspondente estiver congestionada (> 70%)
   *   - +20% se estiver chovendo ou em tempestade
   *   - -20% se luminosidade natural > 70 (pleno dia)
   */
  adjustLighting(payload: LightingAdjustPayload): LightingData {
    const { zoneId, targetIntensity } = payload;

    let intensity: number;

    if (targetIntensity !== undefined) {
      intensity = targetIntensity;
    } else {
      const weather = this.weatherAdapter.getData();
      const traffic = this.trafficAdapter.getData();
      const maxCongestion = Math.max(...traffic.map((t) => t.congestionLevel), 0);

      intensity = 50;
      if (maxCongestion > 70) intensity += 30;
      if (weather.condition === "rainy" || weather.condition === "stormy") intensity += 20;
      if (weather.luminosityLevel > 70) intensity -= 20;

      // Garante que permanece dentro dos limites
      intensity = Math.min(100, Math.max(0, intensity));
    }

    this.lightingAdapter.setIntensity(zoneId, intensity);

    eventBus.emit("lighting:manual-adjust", {
      zoneId,
      newIntensity: intensity,
      timestamp: new Date().toISOString(),
    });

    // Retorna o estado atualizado da zona
    const updated = this.lightingAdapter
      .getData()
      .find((z) => z.zoneId === zoneId);

    if (!updated) {
      throw new Error(`Zona "${zoneId}" não encontrada.`);
    }

    return updated;
  }
}
