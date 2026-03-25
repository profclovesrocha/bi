/**
 * adapters.test.ts
 *
 * Testes unitários para os três adaptadores.
 * Verifica que cada adaptador converte corretamente os dados brutos
 * para o formato canônico definido em CityDataSchema.
 */

import { TrafficAdapter } from "../src/adapters/TrafficAdapter";
import { LightingAdapter } from "../src/adapters/LightingAdapter";
import { WeatherAdapter } from "../src/adapters/WeatherAdapter";

// ── TrafficAdapter ────────────────────────────────────────────────────────────

describe("TrafficAdapter", () => {
  const adapter = new TrafficAdapter();

  it("deve retornar um array com pelo menos um registro de tráfego", () => {
    const data = adapter.getData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("cada registro deve conter os campos canônicos obrigatórios", () => {
    const data = adapter.getData();
    data.forEach((record) => {
      expect(record).toHaveProperty("sectionId");
      expect(record).toHaveProperty("flowRate");
      expect(record).toHaveProperty("congestionLevel");
      expect(record).toHaveProperty("trafficLightStatus");
      expect(record).toHaveProperty("timestamp");
    });
  });

  it("trafficLightStatus deve ser um valor válido do schema canônico", () => {
    const validStatuses = ["green", "yellow", "red"];
    const data = adapter.getData();
    data.forEach((record) => {
      expect(validStatuses).toContain(record.trafficLightStatus);
    });
  });

  it("congestionLevel deve estar entre 0 e 100", () => {
    const data = adapter.getData();
    data.forEach((record) => {
      expect(record.congestionLevel).toBeGreaterThanOrEqual(0);
      expect(record.congestionLevel).toBeLessThanOrEqual(100);
    });
  });

  it("timestamp deve ser uma data ISO 8601 válida", () => {
    const data = adapter.getData();
    data.forEach((record) => {
      expect(() => new Date(record.timestamp)).not.toThrow();
      expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
    });
  });
});

// ── LightingAdapter ───────────────────────────────────────────────────────────

describe("LightingAdapter", () => {
  let adapter: LightingAdapter;

  beforeEach(() => {
    adapter = new LightingAdapter();
  });

  it("deve retornar um array com pelo menos um registro de iluminação", () => {
    const data = adapter.getData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("cada registro deve conter os campos canônicos obrigatórios", () => {
    const data = adapter.getData();
    data.forEach((zone) => {
      expect(zone).toHaveProperty("zoneId");
      expect(zone).toHaveProperty("intensityPercent");
      expect(zone).toHaveProperty("autoMode");
      expect(zone).toHaveProperty("activeLamps");
      expect(zone).toHaveProperty("timestamp");
    });
  });

  it("intensityPercent deve estar entre 0 e 100", () => {
    const data = adapter.getData();
    data.forEach((zone) => {
      expect(zone.intensityPercent).toBeGreaterThanOrEqual(0);
      expect(zone.intensityPercent).toBeLessThanOrEqual(100);
    });
  });

  it("setIntensity deve atualizar a intensidade da zona corretamente", () => {
    const data = adapter.getData();
    const targetZone = data[0].zoneId;

    adapter.setIntensity(targetZone, 42);
    const updated = adapter.getData().find((z) => z.zoneId === targetZone);
    expect(updated?.intensityPercent).toBe(42);
  });

  it("setIntensity deve limitar valores acima de 100 a 100", () => {
    const targetZone = adapter.getData()[0].zoneId;
    adapter.setIntensity(targetZone, 150);
    const updated = adapter.getData().find((z) => z.zoneId === targetZone);
    expect(updated?.intensityPercent).toBe(100);
  });

  it("setIntensity deve limitar valores negativos a 0", () => {
    const targetZone = adapter.getData()[0].zoneId;
    adapter.setIntensity(targetZone, -10);
    const updated = adapter.getData().find((z) => z.zoneId === targetZone);
    expect(updated?.intensityPercent).toBe(0);
  });
});

// ── WeatherAdapter ────────────────────────────────────────────────────────────

describe("WeatherAdapter", () => {
  const adapter = new WeatherAdapter();

  it("deve retornar um único objeto de dados meteorológicos", () => {
    const data = adapter.getData();
    expect(typeof data).toBe("object");
    expect(Array.isArray(data)).toBe(false);
  });

  it("deve conter todos os campos canônicos obrigatórios", () => {
    const data = adapter.getData();
    expect(data).toHaveProperty("temperatureCelsius");
    expect(data).toHaveProperty("rainfallMmPerHour");
    expect(data).toHaveProperty("luminosityLevel");
    expect(data).toHaveProperty("condition");
    expect(data).toHaveProperty("timestamp");
  });

  it("condition deve ser um valor válido do schema canônico", () => {
    const validConditions = ["clear", "cloudy", "rainy", "stormy"];
    const data = adapter.getData();
    expect(validConditions).toContain(data.condition);
  });

  it("luminosityLevel deve estar entre 0 e 100", () => {
    const data = adapter.getData();
    expect(data.luminosityLevel).toBeGreaterThanOrEqual(0);
    expect(data.luminosityLevel).toBeLessThanOrEqual(100);
  });

  it("rainfallMmPerHour deve ser um número não-negativo", () => {
    const data = adapter.getData();
    expect(data.rainfallMmPerHour).toBeGreaterThanOrEqual(0);
  });
});
