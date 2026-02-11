'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

const TrackingContext = createContext(null);

export function useTracking() {
  return useContext(TrackingContext);
}

export default function TrackingProvider({ visitorId, assignment, children }) {
  useEffect(() => {
    if (!Cookies.get('visitor_id')) {
      Cookies.set('visitor_id', visitorId, { expires: 365 });
    }
  }, [visitorId]);

  const trackEvent = useCallback(
    async (eventType, eventData = {}) => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        await fetch(`${apiBase}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId,
            experiment_id: assignment?.experiment_id || null,
            variant_id: assignment?.variant_id || null,
            event_type: eventType,
            event_data: eventData,
            page_url: window.location.pathname,
          }),
        });
      } catch (err) {
        // Tracking should never break the user experience
        console.error('Tracking error:', err);
      }
    },
    [visitorId, assignment]
  );

  // Fire page_view on mount
  useEffect(() => {
    trackEvent('page_view');
  }, [trackEvent]);

  return (
    <TrackingContext.Provider value={{ visitorId, assignment, trackEvent }}>
      {children}
    </TrackingContext.Provider>
  );
}
