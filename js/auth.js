// Failas: auth.js (Galutinė, hibridinė versija)

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');

// Iškart patikriname sesiją
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
});

// Klausomės būsenos pasikeitimų
supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});

// Prisijungimo mygtuko veiksmas
loginBtn.addEventListener('click', () => {
  // === GALUTINIS PATAISYMAS ===
  // Aišiai nurodome 'redirectTo' su teisingu, "švariu" adresu.
  // Tai išsprendžia 404 klaidą.
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://monkroe.github.io/stepn-go-tool/'
    }
  });
});

// Atsijungimo mygtuko veiksmas
logoutBtn.addEventListener('click', async () => {
  // Naudojame patikimą puslapio perkrovimą, kad išvengtume problemų
  // su pakartotiniu prisijungimu.
  await supabase.auth.signOut();
  window.location.reload();
});

// UI atnaujinimo funkcija
function updateAuthUI(session) {
  if (session && session.user) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userEmail.textContent = `Prisijungęs kaip: ${session.user.email}`;
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userEmail.textContent = '';
  }
}
