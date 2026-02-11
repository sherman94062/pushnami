'use client';

import { useEffect } from 'react';
import { useTracking } from '../context/TrackingProvider';

const testimonials = [
  {
    quote:
      'We saw a 40% increase in engagement within the first month. The targeting capabilities are unmatched.',
    author: 'Sarah M., Head of Growth',
  },
  {
    quote:
      'Finally a platform that combines analytics and messaging in one place. Our team saves hours every week.',
    author: 'James K., Marketing Director',
  },
  {
    quote:
      'The A/B testing features helped us optimize our conversion funnel and double our sign-up rate.',
    author: 'Lisa T., Product Manager',
  },
];

export default function TestimonialsSection() {
  const { trackEvent } = useTracking();

  useEffect(() => {
    trackEvent('section_view', { section: 'testimonials' });
  }, [trackEvent]);

  return (
    <section className="testimonials">
      <div className="testimonials-inner">
        <h2>What Our Customers Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.author} className="testimonial-card">
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <cite>— {t.author}</cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
