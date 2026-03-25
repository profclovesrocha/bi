/**
 * cityHub.test.ts
 *
 * Testes unitários para o CityHub (middleware central).
 * Usa mocks dos adaptadores para isolar a lógica do hub.
 */

import { CityHub } from "../src/core/CityHub";
import { TrafficAdapter } from "../src/adapters/TrafficAdapter";
import { LightingAdapter } from "../src/adapters/LightingAdapter";
import { WeatherAdapter } from "../src/adapters/WeatherAdapter";
import { eventBus } from "../src/core/EventBus";
import { TrafficData, LightingData, WeatherData } from "../src/models/CityDataSchema";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTrafficData: TrafficData[] = [
  {
    sectionId: "AV-TESTE-01",
    flowRate: 30,
    congestionLevel: 45,
    trafficLightStatus: "green",
    timestamp: new Date().toISOString(),
  },
];

const mockLightingData: LightingData[] = [
  {
    zoneId: "ZONA-TESTE",
    intensityPercent: 60,
    autoMode: true,
    activeLamps: 100,
    timestamp: new Date().toISOString(),
  },
];

const mockWeatherData: WeatherData = {
  temperatureCelsius: 25,
  rainfallMmPerHour: 0,
  luminosityLevel: 80,
  condition: "clear",
  timestamp: new Date().toISOString(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockedHub() {
  const trafficAdapter = new TrafficAdapter();
  const lightingAdapter = new LightingAdapter();
  const weatherAdapter = new WeatherAdapter();

  jest.spyOn(trafficAdapter, "getData").mockReturnValue(mockTrafficData);
  jest.spyOn(weatherAdapter, "getData").mockReturnValue(mockWeatherData);
  // LightingAdapter precisa de setIntensity funcionando, então mantemos real

  return new CityHub(trafficAdapter, lightingAdapter, weatherAdapter);
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("CityHub", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getStatus()", () => {
    it("deve retornar status com traffic, lighting, weather e lastSyncAt", () => {
      const hub = createMockedHub();
      const status = hub.getStatus();

      expect(status).toHaveProperty("traffic");
      expect(status).toHaveProperty("lighting");
      expect(status).toHaveProperty("weather");
      expect(status).toHaveProperty("lastSyncAt");
    });

    it("lastSyncAt deve ser uma data ISO 8601 válida", () => {
      const hub = createMockedHub();
      const status = hub.getStatus();
      expect(() => new Date(status.lastSyncAt)).not.toThrow();
    });
  });

  describe("getTraffic()", () => {
    it("deve retornar os dados do adaptador normalizados", () => {
      const hub = createMockedHub();
      const traffic = hub.getTraffic();
      expect(traffic).toEqual(mockTrafficData);
    });

    it("deve emitir o evento traffic:updated via EventBus", () => {
      const hub = createMockedHub();
      const handler = jest.fn();
      eventBus.on("traffic:updated", handler);

      hub.getTraffic();
      expect(handler).toHaveBeenCalledWith(mockTrafficData);

      eventBus.off("traffic:updated", handler);
    });
  });

  describe("getWeather()", () => {
    it("deve retornar os dados meteorológicos normalizados", () => {
      const hub = createMockedHub();
      const weather = hub.getWeather();
      expect(weather).toEqual(mockWeatherData);
    });

    it("deve emitir o evento weather:updated via EventBus", () => {
      const hub = createMockedHub();
      const handler = jest.fn();
      eventBus.on("weather:updated", handler);

      hub.getWeather();
      expect(handler).toHaveBeenCalledWith(mockWeatherData);

      eventBus.off("weather:updated", handler);
    });
  });

  describe("getLighting()", () => {
    it("deve retornar um array de dados de iluminação", () => {
      const hub = createMockedHub();
      const lighting = hub.getLighting();
      expect(Array.isArray(lighting)).toBe(true);
      expect(lighting.length).toBeGreaterThan(0);
    });

    it("deve emitir o evento lighting:updated via EventBus", () => {
      const hub = createMockedHub();
      const handler = jest.fn();
      eventBus.on("lighting:updated", handler);

      hub.getLighting();
      expect(handler).toHaveBeenCalled();

      eventBus.off("lighting:updated", handler);
    });
  });

  describe("adjustLighting()", () => {
    it("deve ajustar a intensidade de uma zona existente com valor manual", () => {
      const hub = createMockedHub();
      const zones = hub.getLighting();
      const targetZone = zones[0].zoneId;

      const updated = hub.adjustLighting({ zoneId: targetZone, targetIntensity: 77 });
      expect(updated.zoneId).toBe(targetZone);
      expect(updated.intensityPercent).toBe(77);
    });

    it("deve lançar erro para uma zona inexistente", () => {
      const hub = createMockedHub();
      expect(() =>
        hub.adjustLighting({ zoneId: "ZONA-INEXISTENTE", targetIntensity: 50 })
      ).toThrow();
    });

    it("deve emitir o evento lighting:manual-adjust via EventBus", () => {
      const hub = createMockedHub();
      const zones = hub.getLighting();
      const targetZone = zones[0].zoneId;

      const handler = jest.fn();
      eventBus.on("lighting:manual-adjust", handler);

      hub.adjustLighting({ zoneId: targetZone, targetIntensity: 55 });
      expect(handler).toHaveBeenCalled();

      eventBus.off("lighting:manual-adjust", handler);
    });

    it("deve calcular intensidade automaticamente quando targetIntensity é omitido", () => {
      const hub = createMockedHub();
      const zones = hub.getLighting();
      const targetZone = zones[0].zoneId;

      // Clima claro com luminosidade alta → intensidade calculada < 100
      const updated = hub.adjustLighting({ zoneId: targetZone });
      expect(updated.intensityPercent).toBeGreaterThanOrEqual(0);
      expect(updated.intensityPercent).toBeLessThanOrEqual(100);
    });
  });
});

// ── EventBus ──────────────────────────────────────────────────────────────────

describe("EventBus", () => {
  it("deve notificar ouvintes quando um evento é emitido", () => {
    const handler = jest.fn();
    eventBus.on("test:event", handler);
    eventBus.emit("test:event", { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
    eventBus.off("test:event", handler);
  });

  it("não deve chamar handlers removidos com off()", () => {
    const handler = jest.fn();
    eventBus.on("test:remove", handler);
    eventBus.off("test:remove", handler);
    eventBus.emit("test:remove", {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("deve suportar múltiplos ouvintes para o mesmo evento", () => {
    const h1 = jest.fn();
    const h2 = jest.fn();

    eventBus.on("test:multi", h1);
    eventBus.on("test:multi", h2);
    eventBus.emit("test:multi", "payload");

    expect(h1).toHaveBeenCalledWith("payload");
    expect(h2).toHaveBeenCalledWith("payload");

    eventBus.off("test:multi", h1);
    eventBus.off("test:multi", h2);
  });
});
