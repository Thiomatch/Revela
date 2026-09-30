import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffsvbbmzwhwzzxpvcfrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmc3ZiYm16d2h3enp4cHZjZnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTg3MzcsImV4cCI6MjEwMzE3NDczN30.yNzjNjLy_eJuVcdziZhQQ4RijgGZsmyNLOczfQBOajc';

export const supabase = createClient(supabaseUrl, supabaseKey);