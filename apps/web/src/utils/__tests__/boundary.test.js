import { safeParseBoundary, normalizeBoundary, areBoundaryCoordinatesEqual } from '../boundary.js';

/**
 * Unit tests for boundary utility functions
 * Tests the improvements made to prevent parsing errors and ensure robust boundary handling
 */
describe('Boundary Utils', () => {
  describe('safeParseBoundary', () => {
    test('should handle null/undefined input gracefully', () => {
      expect(safeParseBoundary(null)).toBeNull();
      expect(safeParseBoundary(undefined)).toBeNull();
      expect(safeParseBoundary('')).toBeNull();
    });

    test('should parse valid JSON string boundaries', () => {
      const validBoundary = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };
      const jsonString = JSON.stringify(validBoundary);

      const result = safeParseBoundary(jsonString);
      expect(result).toEqual(validBoundary);
    });

    test('should reject invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = safeParseBoundary(invalidJson);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing boundary data:',
        expect.any(Error),
        'Input:',
        invalidJson
      );

      consoleSpy.mockRestore();
    });

    test('should validate boundary object structure', () => {
      const invalidObject = { type: 'NotFeature' };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = safeParseBoundary(invalidObject);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Boundary object missing required structure:',
        invalidObject
      );

      consoleSpy.mockRestore();
    });

    test('should accept valid boundary objects', () => {
      const validBoundary = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      const result = safeParseBoundary(validBoundary);
      expect(result).toEqual(validBoundary);
    });
  });

  describe('areBoundaryCoordinatesEqual', () => {
    test('should return true for identical boundaries', () => {
      const boundary1 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      const boundary2 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      expect(areBoundaryCoordinatesEqual(boundary1, boundary2)).toBe(true);
    });

    test('should return false for different coordinates', () => {
      const boundary1 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      const boundary2 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-71, -30], [-71, -31], [-70, -31], [-70, -30], [-71, -30]]]
        }
      };

      expect(areBoundaryCoordinatesEqual(boundary1, boundary2)).toBe(false);
    });

    test('should handle null/undefined inputs', () => {
      const validBoundary = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      expect(areBoundaryCoordinatesEqual(null, validBoundary)).toBe(false);
      expect(areBoundaryCoordinatesEqual(validBoundary, null)).toBe(false);
      expect(areBoundaryCoordinatesEqual(null, null)).toBe(true);
    });
  });

  describe('normalizeBoundary integration', () => {
    test('should work with safeParseBoundary output', () => {
      const validBoundary = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-70, -30], [-70, -31], [-69, -31], [-69, -30], [-70, -30]]]
        }
      };

      // First parse safely, then normalize
      const parsed = safeParseBoundary(validBoundary);
      expect(parsed).toEqual(validBoundary);

      // Then normalize should work without errors
      const normalized = normalizeBoundary(parsed);
      expect(normalized).toBeTruthy();
      expect(normalized.feature).toBeTruthy();
      expect(normalized.areaHa).toBeGreaterThan(0);
    });

    test('should handle malformed input without crashing', () => {
      const malformedInputs = [
        null,
        undefined,
        '',
        '{ invalid json }',
        { type: 'NotFeature' },
        'not json at all'
      ];

      malformedInputs.forEach(input => {
        const parsed = safeParseBoundary(input);
        expect(parsed).toBeNull();

        // normalizeBoundary should handle null gracefully
        const normalized = normalizeBoundary(parsed);
        expect(normalized).toBeNull();
      });
    });
  });
});
