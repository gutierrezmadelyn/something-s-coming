import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otyxjhrfyudbprbzoubo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eXhqaHJmeXVkYnByYnpvdWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTY5NDYsImV4cCI6MjA4OTc5Mjk0Nn0.LgXes0GJ80AcivPjpP8hX_fWHGTtxyYfTFnn9CjfuO0';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type { Database };
