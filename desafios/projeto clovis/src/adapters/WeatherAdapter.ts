/**
 * WeatherAdapter.ts
 *
 * Simula o Sistema Meteorológico de um terceiro fornecedor que entrega
 * dados em formato XML proprietário. Como não há um parser XML real aqui,
 * o XML é representado como um objeto estruturado que imita o que seria
 * obtido após o parsing (padrão comum com libs como xml2js).
 *
 * O adaptador converte esses dados para o schema canônico WeatherData.
 */

import { WeatherData } from "../models/CityDataSchema";

// ── Formato bruto simulando estrutura pós-parsing de XML ──────────────────────

interface RawWeatherXml {
  weather_report: {
    temp_celsius: string;        // vem como string no XML
    rain_mm_h: string;
    solar_lux: string;           // luminosidade bruta em lux (0–100000)
    sky_condition: string;       // "CLEAR" | "CLOUD" | "RAIN" | "STORM"
    generated_at: string;        // ISO 8601 string
  };
}

// Mock: simula o objeto retornado pelo parser XML
function fetchRawXmlWeather(): RawWeatherXml {
  return {
    weather_report: {
      temp_celsius: "27.4",
      rain_mm_h: "0.0",
      solar_lux: "65000",
      sky_condition: "CLEAR",
      generated_at: new Date(Date.now() - 10000).toISOString(),
    },
  };
}

// Mapeamento entre códigos do fornecedor e o schema canônico
const conditionMap: Record<string, WeatherData["condition"]> = {
  CLEAR: "clear",
  CLOUD: "cloudy",
  RAIN: "rainy",
  STORM: "stormy",
};

/**
 * Normaliza lux bruto (0–100000) para escala 0–100.
 * Valores acima de 100000 lux são mapeados para 100.
 */
function normalizeLux(rawLux: number): number {
  return Math.min(100, Math.round((rawLux / 100000) * 100));
}

/**
 * WeatherAdapter
 *
 * Responsabilidade única: buscar o XML meteorológico e convertê-lo
 * para o formato canônico WeatherData.
 */
export class WeatherAdapter {
  /**
   * Retorna os dados meteorológicos normalizados.
   */
  getData(): WeatherData {
    const raw = fetchRawXmlWeather();
    const report = raw.weather_report;

    return {
      temperatureCelsius: parseFloat(report.temp_celsius),
      rainfallMmPerHour: parseFloat(report.rain_mm_h),
      luminosityLevel: normalizeLux(parseFloat(report.solar_lux)),
      condition: conditionMap[report.sky_condition] ?? "clear",
      timestamp: report.generated_at,
    };
  }
}
