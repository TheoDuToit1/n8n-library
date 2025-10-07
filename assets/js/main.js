(function(){
  // Page enter transition
  const root = document.documentElement;
  root.classList.add('page-enter');
  setTimeout(()=> root.classList.remove('page-enter'), 320);

  const themeKey = 'theme-preference';
  const prefers = localStorage.getItem(themeKey) || 'light';
  document.documentElement.setAttribute('data-theme', prefers);

  // Support new Galahhad toggle (.theme-switch__checkbox) and fallbacks
  const themeSwitch = document.querySelector('.theme-switch__checkbox') || document.getElementById('toggle') || document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.checked = (prefers === 'dark');
    themeSwitch.addEventListener('change', () => {
      const next = themeSwitch.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(themeKey, next);
    });
  }

  const state = {
    items: [],
    search: '',
    usecase: '',
    integration: '',
    difficulty: ''
  };
  let gridListenersSetup = false;

  const els = {
    search: document.getElementById('searchInput'),
    usecase: document.getElementById('usecaseFilter'),
    integration: document.getElementById('integrationFilter'),
    difficulty: document.getElementById('difficultyFilter'),
    grid: document.getElementById('cardsGrid'),
    count: document.getElementById('resultsCount'),
    title: document.getElementById('resultsTitle'),
    modal: document.getElementById('projectModal'),
    mTitle: document.getElementById('mTitle'),
    mDesc: document.getElementById('mDesc'),
    mMeta: document.getElementById('mMeta'),
    mOverview: document.getElementById('mOverview'),
    mTags: document.getElementById('mTags'),
    mDetails: document.getElementById('mDetails'),
  };

  // Optional: load icons manifest so we only use icons that exist
  let iconManifest = null; // Set of available icon slugs (no extension)
  fetch('./assets/icons/icons.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(list => {
      if (Array.isArray(list)) iconManifest = new Set(list.map(x => String(x).toLowerCase()));
      // manifest loaded: re-render if items already present
      render();
    })
    .catch(() => { /* manifest optional */ });

  // Load data
  fetch('./data/projects.json')
    .then(r => r.json())
    .then(data => {
      state.items = data.projects || [];
      populateFilters(state.items);
      render();
    })
    .catch(err => {
      console.error('Failed to load projects.json', err);
      els.grid.innerHTML = '<div class="muted">No data found. Please add data/projects.json</div>';
    });

  // Event bindings
  els.search.addEventListener('input', (e) => { state.search = e.target.value; render(); });
  els.usecase.addEventListener('change', (e) => { state.usecase = e.target.value; render(); });
  els.integration.addEventListener('change', (e) => { state.integration = e.target.value; render(); });
  if (els.difficulty) els.difficulty.addEventListener('change', (e) => { state.difficulty = e.target.value; render(); });
  // no tags filter

  function populateFilters(items){
    const set = (arr) => Array.from(new Set(arr)).sort();
    const usecases = set(items.flatMap(p => p.useCases || []));
    const integrations = set(items.flatMap(p => p.integrations || []));

    for (const v of usecases) addOpt(els.usecase, v);
    for (const v of integrations) addOpt(els.integration, v);
  }
  function addOpt(sel, value){
    const o = document.createElement('option');
    o.value = value; o.textContent = value; sel.appendChild(o);
  }

  function filterItems(){
    const q = state.search.trim().toLowerCase();
    return state.items.filter(p => {
      const textMatch = !q || (p.title+" "+(p.description||'')+" "+(p.tags||[]).join(' ')).toLowerCase().includes(q);
      const useMatch = !state.usecase || (p.useCases||[]).includes(state.usecase);
      const intMatch = !state.integration || (p.integrations||[]).includes(state.integration);
      const diffMatch = !state.difficulty || (p.difficulty||'') === state.difficulty;
      return textMatch && useMatch && intMatch && diffMatch;
    });
  }

  function render(){
    const items = filterItems();
    els.count.textContent = `${items.length} result${items.length===1?'':'s'}`;

    els.grid.innerHTML = items.map(cardTpl).join('');

    // One-time event delegation for better reliability
    if (!gridListenersSetup) {
      gridListenersSetup = true;
      els.grid.addEventListener('click', (e) => {
        // Only open when clicking explicit action triggers
        const btn = e.target.closest('.card-cta, .link');
        if (!btn) return;
        const card = btn.closest('[data-card-id]');
        if (!card) return;
        const id = card.getAttribute('data-card-id');
        const project = state.items.find(p => String(p.id) === String(id));
        if (project) openModal(project);
      });
      els.grid.addEventListener('keydown', (e) => {
        if (!(e.key === 'Enter' || e.key === ' ')) return;
        // Only trigger from button/link focus
        const btn = e.target.closest('.card-cta, .link');
        if (!btn) return;
        const card = btn.closest('[data-card-id]');
        if (!card) return;
        e.preventDefault();
        const id = card.getAttribute('data-card-id');
        const project = state.items.find(p => String(p.id) === String(id));
        if (project) openModal(project);
      });
    }

    // Setup icon fallbacks for integrations (.svg -> .png -> .webp -> letter)
    setupIconFallbacks();
  }

  function setupIconFallbacks(){
    els.grid.querySelectorAll('img.icon-img').forEach(img => {
      img.addEventListener('error', function handler(){
        const candidates = (img.getAttribute('data-candidates')||'').split('|').filter(Boolean);
        const exts = (img.getAttribute('data-exts')||'').split(',');
        let cIdx = parseInt(img.getAttribute('data-cidx')||'0', 10);
        let eIdx = parseInt(img.getAttribute('data-eidx')||'0', 10);

        // advance extension first
        eIdx += 1;
        if (!exts[eIdx]){ eIdx = 0; cIdx += 1; }

        if (candidates[cIdx]){
          img.setAttribute('data-cidx', String(cIdx));
          img.setAttribute('data-eidx', String(eIdx));
          const nextBase = `./assets/icons/${candidates[cIdx]}`;
          img.src = `${nextBase}.${exts[eIdx]}`;
        } else {
          // remove badge entirely instead of letter fallback
          const parent = img.parentElement;
          img.removeEventListener('error', handler);
          img.remove();
          if (parent) parent.remove();
        }
      }, { once: false });
    });
  }

  function iconBadgeForIntegration(name){
    // Build multiple candidate slugs; use manifest if provided
    const raw = String(name || '');
    const norm = raw.toLowerCase();
    const slug = norm
      .replace(/\+/g, 'plus')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const words = slug.split('-').filter(Boolean);
    const lastWord = words[words.length-1] || slug;

    // Common aliases to match typical filenames
    const aliasMap = {
      'google-sheets': ['google-sheets','sheets','sheet','gsheets'],
      'google-drive': ['google-drive','drive','gdrive'],
      'google-calendar': ['google-calendar','calendar','gcal'],
      'docs': ['docs','google-docs','gdocs','doc'],
      'gmail': ['gmail','mail-gmail'],
      'outlook': ['outlook','microsoft-outlook'],
      'slack': ['slack'],
      'linkedin': ['linkedin'],
      'youtube': ['youtube','yt'],
      'chatgpt': ['chatgpt','openai-chatgpt','gpt'],
      'openai': ['openai'],
      'tavily': ['tavily'],
      'firecrawl': ['firecrawl','fire'],
      'apify': ['apify'],
      'gemini': ['gemini'],
      'claude': ['claude'],
      'chat': ['chat','google-chat'],
      'registration-form': ['registration-form','form'],
      'files': ['files','file']
    };

    const baseCandidates = [slug];
    if (lastWord && lastWord !== slug) baseCandidates.push(lastWord);
    if (aliasMap[slug]) baseCandidates.push(...aliasMap[slug]);

    // Deduplicate
    let candidates = Array.from(new Set(baseCandidates));
    // If manifest exists, prefer those present; if none present, keep original candidates
    if (iconManifest){
      const inManifest = candidates.filter(c => iconManifest.has(c));
      const notInManifest = candidates.filter(c => !iconManifest.has(c));
      candidates = inManifest.length ? [...inManifest, ...notInManifest] : candidates;
    }

    const exts = ['svg','png','webp'];
    const startBase = `./assets/icons/${candidates[0] || slug}`;
    const src = `${startBase}.${exts[0]}`;
    const title = escapeHtml(String(name));
    return `<div class="icon-badge" title="${title}"><img class="icon-img" src="${src}" alt="${title}" data-candidates="${candidates.join('|')}" data-cidx="0" data-exts="${exts.join(',')}" data-eidx="0"/></div>`;
  }

  function cardTpl(p){
    const ints = (p.integrations||[]).slice(0,6).map(x=>iconBadgeForIntegration(x)).join('');
    // Hide tags on cards to avoid any concatenated tag text
    // const tags = (p.tags||[]).slice(0,4).map(t=>`<span class="badge">${t}</span>`).join('');
    // Ensure description presents at least 3 sentences (for 3-line clamp)
    let descRaw = String(p.description || '');
    const countSentences = (s)=> s.replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean).length;
    let sCount = countSentences(descRaw);
    const filler = ' More details inside.';
    while (sCount < 3) { descRaw += filler; sCount++; }
    const descEsc = escapeHtml(descRaw);
    return `
      <article class="card-new" data-card-id="${p.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(p.title)} details">
        <div class="card-new__hero">
          <div class="card-new__hero-overlay"></div>
          <div class="card-new__hero-grid"></div>
          <div class="card-new__hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" class="card-new__svg">
              <path d="M12 2L1 21h22L12 2zm0 3.83L19.17 19H4.83L12 5.83zM11 16h2v2h-2zm0-6h2v4h-2z"></path>
            </svg>
          </div>
        </div>
        <div class="card-new__body">
          <h5 class="card-new__title">${escapeHtml(p.title)}</h5>
          <p class="card-new__desc">${descEsc}</p>
          <!-- Tags removed intentionally to prevent unwanted text rendering in cards -->
        </div>
        <div class="card-new__actions">
          <button class="btn btn-primary card-cta" type="button" aria-label="Download ${escapeHtml(p.title)}">Download</button>
        </div>
        <div class="card-new__icons" aria-label="Integrations">${ints}</div>
      </article>
    `;
  }

  // Modal logic
  function openModal(p){
    // Fill content
    els.mTitle.textContent = p.title;
    els.mDesc.textContent = p.description || '';
    const meta = [];
    if (p.useCases?.length) meta.push(`Use cases: ${p.useCases.join(', ')}`);
    if (p.integrations?.length) meta.push(`Integrations: ${p.integrations.join(', ')}`);
    els.mMeta.innerHTML = meta.map(t=>`<span class="tag">${t}</span>`).join(' ');
    els.mOverview.innerHTML = p.overview || 'No overview yet.';
    const details = [
      ['ID', p.id],
      ['Created', p.created || '—'],
      ['Updated', p.updated || '—'],
      ['Owner', p.owner || '—'],
      ['Version', p.version || '—'],
    ];
    els.mDetails.innerHTML = details.map(([k,v])=>`<div class="row"><div class="key">${k}</div><div>${escapeHtml(String(v))}</div></div>`).join('');
    els.mTags.innerHTML = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
    // Actions
    const url = p.downloadUrl || p.workflowUrl || p.url;
    const actWrap = document.getElementById('mActions');
    if (actWrap) {
      if (url) {
        actWrap.innerHTML = `
          <!-- From Uiverse.io by satyamchaudharydev (namespaced) -->
          <div class="dl-button" data-tooltip="Download workflow">
            <div class="dl-button-wrapper">
              <div class="dl-text">Download</div>
              <span class="dl-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="2em" height="2em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"></path></svg>
              </span>
            </div>
          </div>`;
        const btn = actWrap.querySelector('.dl-button');
        if (btn) btn.addEventListener('click', () => doDownload(url, p.title || 'workflow'));
      } else {
        actWrap.innerHTML = '';
      }
    }

    // Show modal
    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // trigger CSS animations
    requestAnimationFrame(()=> els.modal.classList.add('open'));

    // Close interactions
    els.modal.querySelectorAll('[data-close]').forEach(btn=>btn.onclick = closeModal);
    document.addEventListener('keydown', escHandler);
  }

  function closeModal(){
    els.modal.classList.remove('open');
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escHandler);
    // wait for animation end then hide
    setTimeout(()=>{
      els.modal.classList.add('hidden');
    }, 260);
  }

  function escHandler(e){ if(e.key === 'Escape') closeModal(); }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'
    })[c] || c);
  }

  // =========================
  // Slider (hero replacement)
  // =========================
  (function initSlider(){
    const slidesContainer = document.querySelector('.slides');
    if (!slidesContainer) return; // slider not present
    const slides = slidesContainer.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let current = 0;

    function showSlide(index){
      if (!slides.length) return;
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      current = index;
      slidesContainer.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach(d=>d.classList.remove('active'));
      if (dots[current]) dots[current].classList.add('active');
    }

    // Click dots
    dots.forEach((dot)=>{
      dot.addEventListener('click', ()=>{
        const idx = Number(dot.getAttribute('data-slide')) || 0;
        showSlide(idx);
      });
    });

    // Initialize position
    showSlide(0);
    // Auto rotate
    setInterval(()=> showSlide(current + 1), 4000);
  })();

  // Bottom-left live popup: random "took template" notifications
  (function initLiveNotifs(){
    const rootId = 'notif-root';
    let root = document.querySelector('.notif-root');
    if (!root){
      root = document.createElement('div');
      root.className = 'notif-root';
      root.id = rootId;
      document.body.appendChild(root);
    }

    const names = ['Mia','Noah','Liam','Emma','Olivia','Ava','Isabella','Sophia','Lucas','Ethan','Amelia','Jack','Leo','Aria','Ivy','Zoe'];
    const timezones = ['PST','MST','CST','EST','GMT','CET','EET','IST','SGT','JST','AEST','NZST'];

    function sample(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
    function randomMinutes(){ return Math.floor(Math.random()*15) + 1; } // 1..15
    function pickTemplate(){
      // Prefer real titles on the page
      const titleEls = Array.from(document.querySelectorAll('.card-new__title, .card .title, h5.card-new__title'));
      if (titleEls.length){
        return titleEls[Math.floor(Math.random()*titleEls.length)].textContent.trim().slice(0, 80);
      }
      // Fallbacks
      const fallback = ['LinkedIn Enrichment Sheets','AI Email Sales','YouTube Research Pipeline','Slack Alerts','Knowledge Base Sync'];
      return sample(fallback);
    }

    function renderNotif(){
      const who = sample(names);
      const tpl = pickTemplate();
      const tz = sample(timezones);
      const mins = randomMinutes();
      const n = document.createElement('div');
      n.className = 'notif enter';
      n.setAttribute('role','status');
      n.setAttribute('aria-live','polite');
      n.innerHTML = `
        <div class="avatar">${who[0]}</div>
        <div>
          <div class="title">${who} just took "${tpl}"</div>
          <div class="meta">from ${tz} • ${mins} min ago</div>
        </div>
      `;
      n.addEventListener('click', ()=> dismiss(n));
      root.appendChild(n);
      // auto dismiss
      setTimeout(()=> dismiss(n), 5500);
    }

    function dismiss(el){
      if (!el || el.classList.contains('exit')) return;
      el.classList.remove('enter');
      el.classList.add('exit');
      setTimeout(()=> el.remove(), 220);
    }

    function loop(){
      renderNotif();
      // next between 15s and 45s
      const next = 15000 + Math.floor(Math.random()*30000);
      setTimeout(loop, next);
    }
    // initial after short delay so it doesn't clash with page enter
    setTimeout(loop, 4000);
  })();

  // Page exit transitions for bottom nav links and any [data-transition] links
  (function initPageTransitions(){
    const candidates = Array.from(document.querySelectorAll('.bottom-nav a, a[data-transition]'));
    candidates.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
        e.preventDefault();
        root.classList.add('page-exit');
        setTimeout(() => { window.location.href = a.href; }, 240);
      });
    });
  })();
})();
