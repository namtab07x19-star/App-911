// ──────────────────────────────────────────────────────────────
//  911 EMERGENCY MISSION LOGGER
//  Developer: [Adrian Reyes]   |   Matricula: [20231100]
//  Created for: Equipo de Emergencias 911
//  All data stored locally using IndexedDB
// ──────────────────────────────────────────────────────────────

const APP_VERSION  = '1.0';
const DEVELOPER    = '[Adrian Reyes]';      
const MATRICULA    = '[20231100]';   
const DB_NAME      = 'emergency911db';
const DB_VERSION   = 1;
const STORE_NAME   = 'missions';

// Inject developer info into footer
document.getElementById('devName').textContent = DEVELOPER;
document.getElementById('devID').textContent   = MATRICULA;

let db;
let currentPhotoBase64 = null;
let deferredInstallPrompt = null;

// ── SAVE EVENT ───────────────────────────────────────────────────
async function saveEvent() {
  const date  = document.getElementById('eventDate').value.trim();
  const title = document.getElementById('eventTitle').value.trim();
  const desc  = document.getElementById('eventDesc').value.trim();

  if (!date || !title) {
    showToast('⚠ FECHA Y TÍTULO SON OBLIGATORIOS', true);
    return;
  }

  const event = {
    date,
    title,
    description: desc,
    photo: currentPhotoBase64 || null,
    createdAt: new Date().toISOString(),
    // Developer info embedded in data — Matrícula: MATRICULA
    _dev: DEVELOPER,
    _mat: MATRICULA
  };

  try {
    await addEvent(event);
    showToast('✔ MISIÓN REGISTRADA EXITOSAMENTE');
    clearForm();
    updateDashboard();
  } catch(err) {
    showToast('✘ ERROR AL GUARDAR', true);
    console.error(err);
  }
}

function clearForm() {
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDesc').value  = '';
  document.getElementById('photoInput').value = '';
  const preview = document.getElementById('photoPreview');
  preview.style.display = 'none';
  preview.src = '';
  document.getElementById('uploadPrompt').style.display = 'block';
  currentPhotoBase64 = null;
  setDefaultDate();
}

// ── UTILS ─────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${months[+m-1]} ${y}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, isError=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}

function setupInstallExperience() {
  const installBtn = document.getElementById('installBtn');
  const installHint = document.getElementById('installHint');
  if (!installBtn || !installHint) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isStandalone) {
    installBtn.style.display = 'none';
    installHint.style.display = 'none';
    return;
  }

  if (isIOS) {
    installHint.style.display = 'block';
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.style.display = 'inline-flex';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('Abre el menu del navegador y selecciona instalar aplicacion');
      return;
    }

    deferredInstallPrompt.prompt();

    try {
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('✔ APLICACION INSTALADA');
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
    }

    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
    installHint.style.display = 'none';
    showToast('✔ APP LISTA EN EL DISPOSITIVO');
  });
}

// ── BOOT ─────────────────────────────────────────────────────────
(async () => {
  registerServiceWorker();
  setupInstallExperience();
  await initDB();
  setDefaultDate();
  updateDashboard();
})();