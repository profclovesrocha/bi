/**
 * WeatherAdapter.ts
 *
 * Simula o Sistema Meteorológico de um terceiro fornecedor que entrega
 * dados em formato XML proprietário. O XML é representado como um objeto
 * estruturado que imita o resultado de um parser real (ex: xml2js).
 *
 * Os dados variam levemente a cada chamada para simular leituras reais
 * de estações meteorológicas com atualização contínua.
 */

import { WeatherData } from "../models/CityDataSchema";

interface RawWeatherXml {
  weather_report: {
    temp_celsius:  string;
    rain_mm_h:     string;
    solar_lux:     string;
    sky_condition: string;
    generated_at:  string;
  };
}

function jitter(range: number): number {
  return parseFloat(((Math.random() - 0.5) * 2 * range).toFixed(1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deriva a condição do céu com base nos valores de chuva e luminosidade,
 * simulando a lógica de classificação de uma estação meteorológica.
 */
function deriveCondition(rainMm: number, lux: number): string {
  if (rainMm > 10) return "STORM";
  if (rainMm > 0)  return "RAIN";
  if (lux < 30000) return "CLOUD";
  return "CLEAR";
}

// Estado base da estação meteorológica
let baseTemp  = 27.4;
let baseRain  = 0.0;
let baseLux   = 65000;

function fetchRawXmlWeather(): RawWeatherXml {
  const temp = clamp(baseTemp  + jitter(1.5), -10, 50);
  const rain = clamp(baseRain  + jitter(0.5),   0, 60);
  const lux  = clamp(baseLux   + jitter(5000),  0, 100000);

  return {
    weather_report: {
      temp_celsius:  temp.toFixed(1),
      rain_mm_h:     rain.toFixed(1),
      solar_lux:     lux.toFixed(0),
      sky_condition: deriveCondition(rain, lux),
      generated_at:  new Date().toISOString(),
    },
  };
}

const conditionMap: Record<string, WeatherData["condition"]> = {
  CLEAR: "clear",
  CLOUD: "cloudy",
  RAIN:  "rainy",
  STORM: "stormy",
};

function normalizeLux(rawLux: number): number {
  return Math.min(100, Math.round((rawLux / 100000) * 100));
}

export class WeatherAdapter {
  getData(): WeatherData {
    const raw    = fetchRawXmlWeather();
    const report = raw.weather_report;

    return {
      temperatureCelsius: parseFloat(report.temp_celsius),
      rainfallMmPerHour:  parseFloat(report.rain_mm_h),
      luminosityLevel:    normalizeLux(parseFloat(report.solar_lux)),
      condition:          conditionMap[report.sky_condition] ?? "clear",
      timestamp:          report.generated_at,
    };
  }
}
