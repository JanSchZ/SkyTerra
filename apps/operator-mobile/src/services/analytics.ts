import { api } from './apiClient';

export interface AnalyticsEvent {
  event_type: 'offer_accepted' | 'offer_declined' | 'document_uploaded' | 'availability_changed' | 'radius_changed' | 'job_viewed' | 'profile_updated';
  event_data?: Record<string, any>;
  timestamp?: string;
}

export interface OfferEventData {
  job_id: number;
  offer_id: number;
  payout_amount?: number;
  distance_km?: number;
  property_type?: string;
}

export interface DocumentEventData {
  document_type: string;
  file_size_bytes?: number;
  is_update: boolean;
}

export interface AvailabilityEventData {
  previous_status: boolean;
  new_status: boolean;
}

export interface RadiusEventData {
  previous_radius_km: number;
  new_radius_km: number;
}

export interface JobViewEventData {
  job_id: number;
  source: 'dashboard' | 'jobs_list' | 'notification';
}

export interface ProfileUpdateEventData {
  fields_updated: string[];
  location_updated: boolean;
}

class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private isProcessing = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);

    // Flush on app close/page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  // Track offer acceptance
  trackOfferAccepted(data: OfferEventData): void {
    this.track({
      event_type: 'offer_accepted',
      event_data: data,
    });
  }

  // Track offer decline
  trackOfferDeclined(data: OfferEventData): void {
    this.track({
      event_type: 'offer_declined',
      event_data: data,
    });
  }

  // Track document upload
  trackDocumentUploaded(data: DocumentEventData): void {
    this.track({
      event_type: 'document_uploaded',
      event_data: data,
    });
  }

  // Track availability change
  trackAvailabilityChanged(data: AvailabilityEventData): void {
    this.track({
      event_type: 'availability_changed',
      event_data: data,
    });
  }

  // Track radius change
  trackRadiusChanged(data: RadiusEventData): void {
    this.track({
      event_type: 'radius_changed',
      event_data: data,
    });
  }

  // Track job view
  trackJobViewed(data: JobViewEventData): void {
    this.track({
      event_type: 'job_viewed',
      event_data: data,
    });
  }

  // Track profile update
  trackProfileUpdated(data: ProfileUpdateEventData): void {
    this.track({
      event_type: 'profile_updated',
      event_data: data,
    });
  }

  // Internal method to add event to queue
  private track(event: AnalyticsEvent): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.eventQueue.push(fullEvent);
    console.log('Analytics event queued:', fullEvent);

    // Try to flush immediately if not processing
    if (!this.isProcessing) {
      this.flush();
    }
  }

  // Flush events to backend
  private async flush(immediate = false): Promise<void> {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = []; // Clear queue

      if (eventsToSend.length > 0) {
        await api.post('/api/analytics/events/', {
          events: eventsToSend,
        });

        console.log(`Analytics: ${eventsToSend.length} events sent successfully`);
      }
    } catch (error) {
      console.error('Analytics flush failed:', error);

      // Re-queue events on failure (but don't retry immediately)
      if (immediate) {
        // For immediate flushes (like on app close), don't retry
        console.warn('Analytics: Failed to send events on app close');
      } else {
        // For regular flushes, re-queue for next attempt
        this.eventQueue.unshift(...eventsToSend);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Force flush (useful for testing or before critical actions)
  async forceFlush(): Promise<void> {
    await this.flush(true);
  }

  // Clean up resources
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(true); // Final flush
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Cleanup on process exit (for development/testing)
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => analytics.destroy());
  process.on('SIGINT', () => analytics.destroy());
  process.on('SIGTERM', () => analytics.destroy());
}

export default analytics;
