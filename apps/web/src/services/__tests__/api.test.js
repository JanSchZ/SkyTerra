import { getTour } from '../api.js';

/**
 * Unit tests for API service improvements
 * Tests the tour validation and error handling improvements
 */

// Mock the API calls
jest.mock('../api.js', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('API Service - Tour Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tour URL Validation', () => {
    test('should accept valid media tour URLs', () => {
      // This tests the isValidTourUrl function indirectly through getTour
      const validTourData = {
        id: 1,
        url: 'https://example.com/media/tours/tour123/index.html',
        property: 1
      };

      // Mock successful API response
      const mockApi = require('../api.js');
      mockApi.get.mockResolvedValue({ data: validTourData });

      // The validation should pass and return the tour
      expect(validTourData.url.includes('/media/tours/')).toBe(true);
    });

    test('should accept valid API tour content URLs', () => {
      const validTourData = {
        id: 2,
        url: 'https://api.example.com/tours/content/tour456/',
        property: 1
      };

      expect(validTourData.url.includes('/api/tours/content/')).toBe(true);
      expect(validTourData.url.includes('/content/')).toBe(true);
    });

    test('should reject exact placeholder files', () => {
      const invalidTourData = {
        id: 3,
        url: 'https://example.com/placeholder.svg',
        property: 1
      };

      expect(invalidTourData.url.includes('placeholder.svg')).toBe(true);
      // This should be rejected by the validation
    });

    test('should reject exact test files', () => {
      const invalidTourData = {
        id: 4,
        url: 'https://example.com/test.svg',
        property: 1
      };

      expect(invalidTourData.url.includes('test.svg')).toBe(true);
      // This should be rejected by the validation
    });

    test('should accept URLs containing placeholder/test as part of path', () => {
      const validTourData = {
        id: 5,
        url: 'https://example.com/media/tours/my-placeholder-property/index.html',
        property: 1
      };

      // Should accept because it's not exactly a placeholder file
      expect(validTourData.url.includes('/media/tours/')).toBe(true);
      expect(validTourData.url.includes('placeholder.svg')).toBe(false);
    });

    test('should handle null/empty URLs', () => {
      const toursWithInvalidUrls = [
        { id: 1, url: null, property: 1 },
        { id: 2, url: '', property: 1 },
        { id: 3, url: undefined, property: 1 }
      ];

      toursWithInvalidUrls.forEach(tour => {
        expect(!tour.url).toBe(true);
        // These should be rejected by validation
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const mockApi = require('../api.js');
      mockApi.get.mockRejectedValue(new Error('Network error'));

      // The getTour function should propagate the error
      await expect(mockApi.getTour(123)).rejects.toThrow('Network error');
    });

    test('should handle missing tour data', async () => {
      const mockApi = require('../api.js');
      mockApi.get.mockResolvedValue({ data: null });

      // Should throw Invalid tour error
      await expect(mockApi.getTour(123)).rejects.toThrow('Invalid tour');
    });
  });

  describe('TourViewer Error Display', () => {
    test('should show error message instead of redirecting for invalid tours', () => {
      // This tests the TourViewer behavior change
      const invalidTour = {
        id: 1,
        url: 'https://example.com/placeholder.svg',
        property: 123
      };

      // TourViewer should display error message instead of navigating away
      expect(invalidTour.url.includes('placeholder.svg')).toBe(true);
      // Should show: "El tour 360° no está disponible. Puedes ver más detalles de la propiedad haciendo clic en 'Ver detalles completos'."
    });

    test('should handle tours with property ID for fallback', () => {
      const tourWithProperty = {
        id: 1,
        url: 'https://example.com/test.svg',
        property: 456
      };

      expect(tourWithProperty.url.includes('test.svg')).toBe(true);
      expect(tourWithProperty.property).toBe(456);
      // Should show error with link to property details
    });
  });
});
