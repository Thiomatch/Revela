import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'eetzijzdgehgjacitygr.supabase.co';
const supabaseKey = 'sb_publishable_qeIUyMVRPFIv84mpbAOGnQ_SJuOros4;

export const supabase = createClient(supabaseUrl, supabaseKey);