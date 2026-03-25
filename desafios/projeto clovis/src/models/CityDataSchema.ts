/**
 * CityDataSchema.ts
 *
 * Define o formato canônico (schema unificado) para todos os dados
 * trafegados pelo middleware. Cada subsistema possui seu próprio
 * formato bruto; os adaptadores convertem para estas interfaces.
 */

// ── Tráfego ──────────────────────────────────────────────────────────────────

export interface TrafficData {
  /** Identificador único da via ou cruzamento monitorado */
  sectionId: string;
  /** Número de veículos por minuto na seção */
  flowRate: number;
  /** Percentual de ocupação da via (0–100) */
  congestionLevel: number;
  /** Estado atual do semáforo ("green" | "yellow" | "red") */
  trafficLightStatus: "green" | "yellow" | "red";
  /** Timestamp da leitura em formato ISO 8601 */
  timestamp: string;
}

// ── Iluminação Pública ────────────────────────────────────────────────────────

export interface LightingData {
  /** Identificador da zona urbana */
  zoneId: string;
  /** Intensidade atual da iluminação (0–100%) */
  intensityPercent: number;
  /** Indica se as luminárias estão em modo automático */
  autoMode: boolean;
  /** Número de luminárias ativas na zona */
  activeLamps: number;
  /** Timestamp da leitura em formato ISO 8601 */
  timestamp: string;
}

// ── Meteorologia ──────────────────────────────────────────────────────────────

export interface WeatherData {
  /** Temperatura ambiente em graus Celsius */
  temperatureCelsius: number;
  /** Precipitação atual em mm/h */
  rainfallMmPerHour: number;
  /** Nível de luminosidade natural (0–100 lux normalizado) */
  luminosityLevel: number;
  /** Descrição textual das condições ("clear" | "cloudy" | "rainy" | "stormy") */
  condition: "clear" | "cloudy" | "rainy" | "stormy";
  /** Timestamp da leitura em formato ISO 8601 */
  timestamp: string;
}

// ── Estado consolidado retornado por /api/status ──────────────────────────────

export interface CityStatus {
  traffic: TrafficData[];
  lighting: LightingData[];
  weather: WeatherData;
  /** Timestamp da última sincronização do hub */
  lastSyncAt: string;
}

// ── Payload para ajuste de iluminação ────────────────────────────────────────

export interface LightingAdjustPayload {
  /** Zona a ser ajustada */
  zoneId: string;
  /** Nova intensidade desejada (0–100). Se omitido, o hub calcula automaticamente. */
  targetIntensity?: number;
}
