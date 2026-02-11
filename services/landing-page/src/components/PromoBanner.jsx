'use client';

import { useTracking } from '../context/TrackingProvider';
import { useEffect } from 'react';

export default function PromoBanner({ text, color }) {
  const { trackEvent } = useTracking();

  useEffect(() => {
    trackEvent('section_view', { section: 'promo_banner' });
  }, [trackEvent]);

  return (
    <div
      className="promo-banner"
      style={{ backgroundColor: color || '#FF6B35' }}
    >
      {text || 'Special offer available!'}
    </div>
  );
}
