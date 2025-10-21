import { assignTicketPriority } from '../../services/aiService';
import { describe, it, expect } from 'vitest';

describe('aiService', () => {
  describe('assignTicketPriority', () => {
    it('should return "low" for "no puedo creer lo bueno que es"', () => {
      expect(assignTicketPriority('no puedo creer lo bueno que es')).toBe('low');
    });
  });
});
