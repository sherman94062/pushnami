CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Experiments
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Variants belonging to an experiment
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    weight NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(experiment_id, name)
);

-- Deterministic visitor-to-variant assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255) NOT NULL,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(experiment_id, visitor_id)
);

-- Tracked events from the landing page
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id VARCHAR(255) NOT NULL,
    experiment_id UUID REFERENCES experiments(id),
    variant_id UUID REFERENCES variants(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature toggles
CREATE TABLE feature_toggles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_visitor_id ON events(visitor_id);
CREATE INDEX idx_events_experiment_id ON events(experiment_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_experiment_variant ON events(experiment_id, variant_id);
CREATE INDEX idx_assignments_visitor_experiment ON assignments(visitor_id, experiment_id);
CREATE INDEX idx_assignments_experiment_id ON assignments(experiment_id);
CREATE INDEX idx_variants_experiment_id ON variants(experiment_id);
