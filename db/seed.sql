-- Seed experiment: homepage_hero
INSERT INTO experiments (id, name, description, is_active) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'homepage_hero', 'Homepage hero section A/B test', true);

-- Variants for homepage_hero
INSERT INTO variants (id, experiment_id, name, weight, config) VALUES
    ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'control', 0.5000,
     '{"hero_title": "Grow Your Audience", "hero_subtitle": "The all-in-one platform to reach, engage, and convert your visitors into loyal customers.", "cta_text": "Get Started", "layout": "default"}'),
    ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'variant_b', 0.5000,
     '{"hero_title": "Reach More Customers Today", "hero_subtitle": "Powerful tools that help you connect with your audience and drive measurable growth.", "cta_text": "Start Free Trial", "layout": "centered"}');

-- Seed feature toggles
INSERT INTO feature_toggles (key, label, description, enabled, config) VALUES
    ('show_testimonials', 'Show Testimonials', 'Toggle the testimonials section on the landing page', true, '{}'),
    ('cta_text_override', 'CTA Text Override', 'Override the CTA button text across the landing page', false, '{"text": "Sign Up Now"}'),
    ('show_banner', 'Show Promotional Banner', 'Toggle the promotional banner at the top of the landing page', true, '{"banner_text": "Limited time offer — 30% off your first month!", "banner_color": "#FF6B35"}');
