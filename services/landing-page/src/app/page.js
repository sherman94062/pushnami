import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { getAssignment, getToggles } from '../lib/api';
import TrackingProvider from '../context/TrackingProvider';
import PromoBanner from '../components/PromoBanner';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get('visitor_id')?.value;
  if (!visitorId) {
    visitorId = uuidv4();
  }

  // Fetch assignment and toggles server-side (parallel)
  const [assignment, toggles] = await Promise.all([
    getAssignment(visitorId, 'homepage_hero').catch(() => null),
    getToggles().catch(() => []),
  ]);

  const toggleMap = {};
  for (const t of toggles) {
    toggleMap[t.key] = t;
  }

  const variantConfig = assignment?.variant?.config || {
    hero_title: 'Grow Your Audience',
    hero_subtitle:
      'The all-in-one platform to reach, engage, and convert your visitors into loyal customers.',
    cta_text: 'Get Started',
    layout: 'default',
  };

  // CTA text override from feature toggle
  let ctaText = variantConfig.cta_text;
  if (toggleMap.cta_text_override?.enabled && toggleMap.cta_text_override.config?.text) {
    ctaText = toggleMap.cta_text_override.config.text;
  }

  return (
    <TrackingProvider visitorId={visitorId} assignment={assignment}>
      {toggleMap.show_banner?.enabled && (
        <PromoBanner
          text={toggleMap.show_banner.config?.banner_text}
          color={toggleMap.show_banner.config?.banner_color}
        />
      )}
      <HeroSection
        title={variantConfig.hero_title}
        subtitle={variantConfig.hero_subtitle}
        ctaText={ctaText}
        layout={variantConfig.layout}
      />
      <FeaturesSection />
      {toggleMap.show_testimonials?.enabled && <TestimonialsSection />}
      <Footer />
    </TrackingProvider>
  );
}
