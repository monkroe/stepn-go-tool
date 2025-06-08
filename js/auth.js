// Failas: auth.js (Pataisyta versija be 'redirectTo' parinkties)

// Surandame reikalingus HTML elementus
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');

// Iškart po puslapio užkrovimo, patikriname dabartinę sesiją
// Tai naudinga, jei vartotojas grįžta į puslapį jau būdamas prisijungęs
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
});

// === SVARBIAUSIA DALIS ===
// Nustatome "klausytoją", kuris realiu laiku reaguoja į autentifikacijos
// būsenos pasikeitimus (prisijungimą, atsijungimą).
supabase.auth.onAuthStateChange((_event, session) => {
  // Gavus naują sesijos informaciją, atnaujiname vartotojo sąsają
  updateAuthUI(session);
});

// Prisijungimo mygtuko veiksmas
loginBtn.addEventListener('click', () => {
  // === PATAISYMAS ===
  // Nebenaudojame 'options.redirectTo'. Supabase automatiškai naudos
  // "Site URL" adresą iš jūsų projekto nustatymų. Tai yra
  // patikimiausias būdas.
  supabase.auth.signInWithOAuth({
    provider: 'google',
  });
});

// Atsijungimo mygtuko veiksmas
logoutBtn.addEventListener('click', () => {
  supabase.auth.signOut();
});

// Pagalbinė funkcija, kuri atnaujina vartotojo sąsają (UI)
// priklausomai nuo to, ar vartotojas prisijungęs, ar ne.
function updateAuthUI(session) {
  if (session && session.user) {
    // Vartotojas yra prisijungęs
    loginBtn.classList.add('hidden');       // Paslepiame prisijungimo mygtuką
    logoutBtn.classList.remove('hidden'); // Rodome atsijungimo mygtuką
    userEmail.textContent = `Prisijungęs kaip: ${session.user.email}`;
  } else {
    // Vartotojas yra neprisijungęs
    loginBtn.classList.remove('hidden'); // Rodome prisijungimo mygtuką
    logoutBtn.classList.add('hidden');      // Paslepiame atsijungimo mygtuką
    userEmail.textContent = '';               // Išvalome el. pašto tekstą
  }
}
