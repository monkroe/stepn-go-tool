// Failas: auth.js (Galutinė pataisyta versija)

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');

// OAuth callback apdorojimas
async function handleOAuthCallback() {
  if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('OAuth klaida:', error);
      alert('Prisijungimo klaida. Bandykite dar kartą.');
    }
    
    // Išvalyti URL nuo hash parametrų
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (data.session) {
      updateAuthUI(data.session);
      // Inicializuoti Logger po prisijungimo
      if (window.appActions && window.appActions.loadAndRenderLogTable) {
        window.appActions.loadAndRenderLogTable();
      }
    }
  }
}

// Paleisti OAuth callback tikrinimą
handleOAuthCallback();

// Patikriname sesiją
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
  // Įkelti transakcijas jei prisijungęs
  if (session && window.appActions && window.appActions.loadAndRenderLogTable) {
    window.appActions.loadAndRenderLogTable();
  }
});

// Klausomės būsenos pasikeitimų
supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
  // Perkrauti transakcijas kai būsena pasikeičia
  if (session && window.appActions && window.appActions.loadAndRenderLogTable) {
    window.appActions.loadAndRenderLogTable();
  }
});

// Prisijungimo mygtuko veiksmas
loginBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://monkroe.github.io/stepn-go-tool'
    }
  });
  
  if (error) {
    console.error('Prisijungimo klaida:', error);
    alert('Nepavyko pradėti prisijungimo. Bandykite dar kartą.');
  }
});

// Atsijungimo mygtuko veiksmas
logoutBtn.addEventListener('click', async () => {
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
