/**
 * EventBus.ts
 *
 * Implementa o padrão Observer (Publish-Subscribe) para comunicação
 * assíncrona entre os subsistemas. Quando um subsistema emite um evento,
 * todos os ouvintes registrados são notificados automaticamente — sem
 * acoplamento direto entre eles.
 *
 * O histórico de eventos é mantido em memória (máx. 100 registros),
 * permitindo auditoria e exibição em tempo real no dashboard.
 */

type EventHandler<T = unknown> = (payload: T) => void;

export interface EventRecord {
  event:     string;
  payload:   unknown;
  timestamp: string;
}

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();
  private history:   EventRecord[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Registra um ouvinte para um evento específico.
   */
  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler as EventHandler);
  }

  /**
   * Remove um ouvinte previamente registrado.
   */
  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    this.listeners.set(
      event,
      handlers.filter((h) => h !== handler)
    );
  }

  /**
   * Publica um evento, notificando todos os ouvintes e
   * registrando no histórico interno.
   */
  emit<T>(event: string, payload: T): void {
    // Persiste no histórico (mais recente primeiro)
    this.history.unshift({
      event,
      payload,
      timestamp: new Date().toISOString(),
    });

    // Mantém o histórico dentro do limite
    if (this.history.length > this.MAX_HISTORY) {
      this.history.pop();
    }

    // Notifica todos os ouvintes registrados
    const handlers = this.listeners.get(event) ?? [];
    handlers.forEach((handler) => handler(payload));
  }

  /**
   * Retorna os N eventos mais recentes do histórico.
   * Usado pelo endpoint /api/events para exibição no dashboard.
   */
  getHistory(limit = 30): EventRecord[] {
    return this.history.slice(0, limit);
  }

  /** Retorna os nomes de todos os eventos com ouvintes ativos. */
  activeEvents(): string[] {
    return [...this.listeners.keys()];
  }
}

// Instância singleton compartilhada por toda a aplicação
export const eventBus = new EventBus();
