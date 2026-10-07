// File: src/lib/supabase.ts

/* EXECUTE IN SUPABASE SQL EDITOR:
CREATE TABLE reports ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, status VARCHAR DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW() );
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
alter publication supabase_realtime add table reports;
*/

import { createClient } from '@supabase/supabase-js';

export interface MosquitoReport {
  id?: string;
  latitude: number;
  longitude: number;
  status?: string;
  created_at?: string;
}

const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(url, key);

