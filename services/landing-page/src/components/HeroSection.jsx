'use client';

import { useTracking } from '../context/TrackingProvider';
import CTAButton from './CTAButton';

export default function HeroSection({ title, subtitle, ctaText, layout }) {
  const { trackEvent } = useTracking();

  return (
    <section className={`hero ${layout === 'centered' ? 'hero--centered' : ''}`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <CTAButton
        text={ctaText}
        onClick={() => trackEvent('cta_click', { location: 'hero' })}
      />
    </section>
  );
}
