// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Membuat satu instance client supabase yang akan digunakan di seluruh aplikasi
export const supabase = createClient(supabaseUrl, supabaseAnonKey)