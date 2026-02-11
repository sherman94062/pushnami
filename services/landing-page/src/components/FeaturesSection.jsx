'use client';

import { useEffect } from 'react';
import { useTracking } from '../context/TrackingProvider';

const features = [
  {
    title: 'Smart Targeting',
    description:
      'Deliver the right message to the right audience with AI-powered segmentation and behavioral targeting.',
  },
  {
    title: 'Real-Time Analytics',
    description:
      'Track engagement, conversions, and revenue in real time with dashboards built for marketers.',
  },
  {
    title: 'Multi-Channel Reach',
    description:
      'Connect with your audience across push notifications, email, and in-app messaging from a single platform.',
  },
];

export default function FeaturesSection() {
  const { trackEvent } = useTracking();

  useEffect(() => {
    trackEvent('section_view', { section: 'features' });
  }, [trackEvent]);

  return (
    <section className="features">
      <div className="features-inner">
        <h2>Why Choose Us</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
