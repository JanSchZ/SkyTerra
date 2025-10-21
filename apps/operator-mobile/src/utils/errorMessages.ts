import axios from 'axios';

const prettifyKey = (key: string): string => {
  const normalized = key.replace(/_/g, ' ').trim();
  if (!normalized) return '';
  if (normalized === 'non field errors') return 'Error';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeMessageText = (raw: string): string => {
  const text = raw.trim();
  if (!text) return '';

  const looksLikeHtml = /<!DOCTYPE html/i.test(text) || /<html[\s>]/i.test(text);
  if (!looksLikeHtml) {
    return text.replace(/\s+/g, ' ');
  }

  const titleMatch = text.match(/<title>(.*?)<\/title>/is);
  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();
  if (title && title.toLowerCase().includes('disallowedhost')) {
    return 'El servidor rechazó la solicitud (DisallowedHost). Revisa ALLOWED_HOSTS y la URL configurada en la app.';
  }

  if (title) {
    return `El servidor respondió HTML inesperado. Detalle: ${title}.`;
  }

  return 'El servidor respondió HTML inesperado. Revisa los registros del backend.';
};

const flattenMessages = (value: unknown, prefix?: string): string[] => {
  if (value === null || value === undefined) return [];

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = normalizeMessageText(String(value));
    if (!text) return [];
    return prefix ? [`${prefix}: ${text}`] : [text];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenMessages(item, prefix));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: string[] = [];
    for (const [key, nested] of entries) {
      const label = prettifyKey(key);
      const nextPrefix = label ? (prefix ? `${prefix} ${label}` : label) : prefix;
      result.push(...flattenMessages(nested, nextPrefix));
    }
    return result;
  }

  return [];
};

const collectMessages = (value: unknown): string[] => {
  const seen = new Set<string>();
  const messages: string[] = [];
  for (const raw of flattenMessages(value)) {
    const trimmed = raw.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      messages.push(trimmed);
    }
  }
  return messages;
};

const extractFirstMessage = (value: unknown): string | null => {
  const [first] = collectMessages(value);
  return first ?? null;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'La solicitud tardó demasiado y fue cancelada. Revisa tu conexión e inténtalo nuevamente.';
      }
      const detail = error.message?.trim();
      return detail
        ? `No pudimos comunicarnos con el servidor. Detalle: ${detail}`
        : 'No pudimos comunicarnos con el servidor. Intenta nuevamente en unos minutos.';
    }

    const { status, statusText, config, data } = error.response;
    const messages = collectMessages(data);
    const method = config?.method ? config.method.toUpperCase() : undefined;
    const endpoint = config?.url;
    const statusLabel = statusText ? `${status} ${statusText}` : status ? `${status}` : undefined;
    const contextParts = [
      statusLabel ? `Error ${statusLabel}` : null,
      method,
      endpoint,
    ].filter(Boolean);
    const context = contextParts.length ? `${contextParts.join(' ')}:` : null;

    if (messages.length > 0) {
      const body = messages.join(' | ');
      return context ? `${context} ${body}` : body;
    }

    const fallbackMessage = error.message?.trim();
    if (fallbackMessage) {
      return context ? `${context} ${fallbackMessage}` : fallbackMessage;
    }

    if (context) {
      return context;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage.trim();
    }
  }

  return fallback;
};

export const extractMessageFromData = (data: unknown): string | null => extractFirstMessage(data);
