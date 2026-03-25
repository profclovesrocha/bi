/**
 * EventBus.ts
 *
 * Implementa o padrão Observer (Publish-Subscribe) para comunicação
 * assíncrona entre os subsistemas. Quando um subsistema emite um evento,
 * todos os ouvintes registrados são notificados automaticamente — sem
 * acoplamento direto entre eles.
 *
 * Esse mecanismo resolve a fragmentação: cada sistema opera de forma
 * independente e reage a mudanças sem precisar conhecer os demais.
 */

type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  /** Mapa de nome-do-evento → lista de handlers registrados */
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * Registra um ouvinte para um evento específico.
   * @param event  Nome do evento (ex.: "traffic:updated")
   * @param handler Callback invocado quando o evento for publicado
   */
  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler as EventHandler);
  }

  /**
   * Remove um ouvinte previamente registrado.
   * @param event   Nome do evento
   * @param handler Referência à mesma função passada em `on`
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
   * Publica um evento, notificando todos os ouvintes registrados.
   * @param event   Nome do evento
   * @param payload Dados associados ao evento
   */
  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.forEach((handler) => handler(payload));
  }

  /** Retorna os nomes de todos os eventos com ouvintes ativos. */
  activeEvents(): string[] {
    return [...this.listeners.keys()];
  }
}

// Instância singleton compartilhada por toda a aplicação
export const eventBus = new EventBus();
