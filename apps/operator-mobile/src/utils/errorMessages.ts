import axios from 'axios';

const extractFirstMessage = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractFirstMessage(item);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = extractFirstMessage(nested);
      if (found) return found;
    }
  }
  return null;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (axios.isAxiosError(error)) {
    const message = extractFirstMessage(error.response?.data) ?? error.message;
    if (message && message.trim().length > 0) {
      return message.trim();
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
