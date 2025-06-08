// Failas: auth.js (Versija su patikimu puslapio perkrovimu po atsijungimo)

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');

supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});

loginBtn.addEventListener('click', () => {
  supabase.auth.signInWithOAuth({
    provider: 'google',
  });
});

// === PATAISYMAS ===
// Dabar atsijungimas ne tik išvalo sesiją, bet ir perkrauna puslapį,
// kad būtų užtikrinta švari programėlės būsena.
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

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
