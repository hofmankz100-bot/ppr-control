CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ppr_records (
  collection text NOT NULL,
  record_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (collection, record_id)
);

CREATE INDEX IF NOT EXISTS ppr_records_collection_updated_idx
  ON ppr_records (collection, updated_at DESC);

CREATE INDEX IF NOT EXISTS ppr_records_payload_gin_idx
  ON ppr_records USING gin (payload);

CREATE TABLE IF NOT EXISTS ppr_users (
  id text PRIMARY KEY,
  employee_id text,
  phone text,
  name text NOT NULL,
  role text,
  area text,
  password_hash text,
  approved boolean NOT NULL DEFAULT false,
  pending_approval boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ppr_users_employee_id_idx
  ON ppr_users (employee_id) WHERE employee_id IS NOT NULL AND employee_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS ppr_users_phone_idx
  ON ppr_users (phone) WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS ppr_operations (
  operation_id text PRIMARY KEY,
  client_id text,
  user_name text,
  user_role text,
  operation_type text NOT NULL,
  collection text,
  record_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ppr_operations_created_idx
  ON ppr_operations (created_at DESC);

CREATE TABLE IF NOT EXISTS ppr_settings (
  setting_key text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ppr_photo_links (
  photo_id text PRIMARY KEY,
  storage_key text NOT NULL,
  public_url text,
  mime_type text,
  byte_size bigint,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
