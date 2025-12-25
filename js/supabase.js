// Failas: js/supabase.js
const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';

// PAKEITIMAS: Naudojame biblioteką klientui sukurti ir iškart priskiriame jį globaliam kintamajam
// Dabar 'window.supabase' bus Jūsų prisijungęs klientas, o ne tik biblioteka.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
