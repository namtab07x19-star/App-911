// ── UI NAVIGATION ────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'events') { renderList(); showListView(); }
  if (name === 'dashboard') updateDashboard();
}

function showListView() {
  document.getElementById('listView').style.display   = 'block';
  document.getElementById('detailView').style.display = 'none';
}

// ── CLOCK ────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const date = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('liveClock').textContent = `📅 ${date}   ⏱ ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── SET DEFAULT DATE ─────────────────────────────────────────────
function setDefaultDate() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth()+1).padStart(2,'0');
  const dd    = String(today.getDate()).padStart(2,'0');
  document.getElementById('eventDate').value = `${yyyy}-${mm}-${dd}`;
}

// ── PHOTO HANDLING ───────────────────────────────────────────────
function handlePhotoSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    currentPhotoBase64 = e.target.result;
    const preview = document.getElementById('photoPreview');
    preview.src   = currentPhotoBase64;
    preview.style.display = 'block';
    document.getElementById('uploadPrompt').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── RENDER LIST ───────────────────────────────────────────────────
async function renderList() {
  const allEvents = await getAllEvents();
  const query     = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered  = query
    ? allEvents.filter(e => e.title.toLowerCase().includes(query) || e.description?.toLowerCase().includes(query))
    : allEvents;

  const container = document.getElementById('eventsList');
  const label     = document.getElementById('listLabel');
  label.textContent = `${filtered.length} misión(es) encontrada(s)`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">${query ? 'Sin resultados para "'+query+'"' : 'No hay misiones registradas'}</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(ev => `
    <div class="event-card" onclick="showDetail(${ev.id})">
      <div class="event-card-header">
        ${ev.photo
          ? `<img class="event-thumb" src="${ev.photo}" alt="foto">`
          : `<div class="event-thumb">🚨</div>`
        }
        <div class="event-info">
          <div class="event-title">${escHtml(ev.title)}</div>
          <div class="event-date">📅 ${formatDate(ev.date)}</div>
          <div class="event-desc">${escHtml(ev.description || '—')}</div>
          <span class="event-tag">${ev.photo ? '📸 CON FOTO' : '📄 SIN FOTO'}</span>
        </div>
      </div>
    </div>`).join('');
}

// ── SHOW DETAIL ───────────────────────────────────────────────────
async function showDetail(id) {
  const allEvents = await getAllEvents();
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('listView').style.display   = 'none';
  const detail = document.getElementById('detailView');
  detail.style.display = 'block';

  detail.innerHTML = `
    <button class="back-btn" onclick="showListView(); renderList();">
      ← VOLVER A LISTA
    </button>
    ${ev.photo
      ? `<img class="detail-photo" src="${ev.photo}" alt="Foto de la misión">`
      : `<div class="detail-photo-placeholder">🚨</div>`
    }
    <div class="detail-meta">
      <div class="detail-field">
        <div class="detail-field-label">Título</div>
        <div class="detail-field-value" style="font-family:var(--head);font-size:20px;font-weight:700">${escHtml(ev.title)}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">📅 Fecha del Evento</div>
        <div class="detail-field-value" style="font-family:var(--mono);color:var(--red-hot)">${formatDate(ev.date)}</div>
      </div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">🗒️ Descripción</div>
      <div class="detail-field-value">${escHtml(ev.description || 'Sin descripción').replace(/\n/g,'<br>')}</div>
    </div>
    <div class="detail-id">
      ID MISIÓN: #${String(ev.id).padStart(5,'0')} · REG: ${new Date(ev.createdAt).toLocaleString('es-DO')}
    </div>
    <br>
    <div class="btn-row">
      <button class="btn btn-danger" onclick="confirmDelete(${ev.id})">🗑 ELIMINAR</button>
    </div>`;
}

async function confirmDelete(id) {
  if (!confirm('¿Eliminar esta misión del registro? Esta acción no se puede deshacer.')) return;
  await deleteEventById(id);
  showToast('✔ MISIÓN ELIMINADA');
  showListView();
  renderList();
  updateDashboard();
}

// ── DASHBOARD STATS ───────────────────────────────────────────────
async function updateDashboard() {
  const all   = await getAllEvents();
  const today = new Date().toISOString().slice(0,10);
  const month = new Date().toISOString().slice(0,7);

  document.getElementById('statTotal').textContent    = all.length;
  document.getElementById('statToday').textContent    = all.filter(e => e.date === today).length;
  document.getElementById('statWithPhoto').textContent= all.filter(e => e.photo).length;
  document.getElementById('statMonth').textContent    = all.filter(e => e.date?.startsWith(month)).length;

  const lastEv = all[0];
  const preview = document.getElementById('lastEventPreview');
  if (lastEv) {
    preview.innerHTML = `
      <div class="event-card" onclick="showSection('events'); setTimeout(()=>showDetail(${lastEv.id}),100)">
        <div class="event-card-header">
          ${lastEv.photo ? `<img class="event-thumb" src="${lastEv.photo}" alt="">` : '<div class="event-thumb">🚨</div>'}
          <div class="event-info">
            <div class="event-title">${escHtml(lastEv.title)}</div>
            <div class="event-date">📅 ${formatDate(lastEv.date)}</div>
            <div class="event-desc">${escHtml(lastEv.description || '—')}</div>
          </div>
        </div>
      </div>`;
  } else {
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No hay misiones registradas aún</div></div>`;
  }
}