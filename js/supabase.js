// Failas: js/supabase.js
const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';

// KRITINIS PATAISYMAS:
// Sukuriame klientą ir priskiriame jį globaliam window objektui.
// Dabar auth.js ir logger.js tikrai jį matys.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
