  -- ── disputes table ────────────────────────────────────────────────────────────
  -- Stores platform disputes raised by realtors or directors.
  -- Admins review and resolve disputes via /admin/disputes.

  CREATE TABLE IF NOT EXISTS disputes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raised_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    dispute_type   TEXT NOT NULL CHECK (dispute_type IN ('lead','commission','listing','payment','other')),
    entity_type    TEXT CHECK (entity_type IN ('lead','commission','listing','payment')),
    entity_id      UUID,
    subject        TEXT NOT NULL,
    description    TEXT,
    status         TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','under_review','resolved','dismissed')),
    resolution     TEXT,
    resolved_by    UUID REFERENCES profiles(id),
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ── Indexes ───────────────────────────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);
  CREATE INDEX IF NOT EXISTS idx_disputes_status    ON disputes(status);
  CREATE INDEX IF NOT EXISTS idx_disputes_entity    ON disputes(entity_type, entity_id);

  -- ── RLS ───────────────────────────────────────────────────────────────────────
  ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

  -- Admin: full access
  CREATE POLICY "admin_all_disputes" ON disputes
    FOR ALL
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

  -- Realtors/Directors: can INSERT their own disputes and SELECT their own
  CREATE POLICY "user_insert_disputes" ON disputes
    FOR INSERT
    WITH CHECK (raised_by = auth.uid());

  CREATE POLICY "user_select_own_disputes" ON disputes
    FOR SELECT
    USING (raised_by = auth.uid());

  -- ── payout_requests: add admin columns if not present ─────────────────────────
  ALTER TABLE payout_requests
    ADD COLUMN IF NOT EXISTS admin_notes   TEXT,
    ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processed_by  UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;
