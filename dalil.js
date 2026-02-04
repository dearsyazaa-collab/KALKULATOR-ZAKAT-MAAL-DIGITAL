/* ========================================
   ZakatCalc — Dalil & Fatwa Page Script
   ======================================== */

(function() {
  'use strict';

  // ===== KONFIGURASI =====
  const CONFIG = {
    SUPABASE_URL: 'https://ynsyiesajoggykqybqsn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ'
  };

  // ===== STATE =====
  const state = {
    data: [],
    filteredData: [],
    kategori: 'semua',
    subKategori: 'semua',
    isLoading: false,
    error: null
  };

  // ===== DOM ELEMENTS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== SUPABASE FETCH =====
  async function fetchDalilData() {
    setState({ isLoading: true, error: null });
    renderState();

    try {
      const response = await fetch(
        `${CONFIG.SUPABASE_URL}/rest/v1/dalil_zakat?is_active=eq.true&order=urutan.asc,created_at.desc`,
        {
          headers: {
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Berhasil memuat ${data.length} data dalil`);

      setState({ data, isLoading: false });
      applyFilters();

    } catch (error) {
      console.error('❌ Gagal memuat data dalil:', error);
      setState({ isLoading: false, error: error.message });
      renderState();
    }
  }

  // ===== STATE MANAGEMENT =====
  function setState(newState) {
    Object.assign(state, newState);
  }

  function applyFilters() {
    let filtered = [...state.data];

    // Filter by kategori
    if (state.kategori !== 'semua') {
      filtered = filtered.filter(item => item.kategori_zakat === state.kategori);
    }

    // Filter by sub kategori
    if (state.subKategori !== 'semua') {
      filtered = filtered.filter(item => item.sub_kategori === state.subKategori);
    }

    state.filteredData = filtered;
    renderState();
  }

  // ===== RENDER FUNCTIONS =====
  function renderState() {
    const loadingEl = $('#dalil-loading');
    const emptyEl = $('#dalil-empty');
    const errorEl = $('#dalil-error');
    const gridEl = $('#dalil-grid');

    // Hide all states
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'none';
    errorEl.style.display = 'none';
    gridEl.style.display = 'none';

    if (state.isLoading) {
      loadingEl.style.display = 'flex';
      return;
    }

    if (state.error) {
      errorEl.style.display = 'flex';
      return;
    }

    if (state.filteredData.length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }

    // Render cards
    gridEl.style.display = 'grid';
    renderCards();
  }

  function renderCards() {
    const gridEl = $('#dalil-grid');
    
    gridEl.innerHTML = state.filteredData.map(item => createCardHTML(item)).join('');
  }

  function createCardHTML(item) {
    const subKategoriLabels = {
      dalil: { icon: '📜', label: 'Dalil', class: 'dalil' },
      hukum: { icon: '⚖️', label: 'Hukum', class: 'hukum' },
      fatwa: { icon: '🏛️', label: 'Fatwa', class: 'fatwa' }
    };

    const kategoriLabels = {
      umum: 'Umum',
      emas: 'Emas & Perak',
      penghasilan: 'Penghasilan',
      tabungan: 'Tabungan',
      perdagangan: 'Perdagangan',
      saham: 'Saham',
      crypto: 'Crypto',
      pertanian: 'Pertanian',
      peternakan: 'Peternakan'
    };

    const subInfo = subKategoriLabels[item.sub_kategori] || { icon: '📄', label: item.sub_kategori, class: 'default' };
    const kategoriLabel = kategoriLabels[item.kategori_zakat] || item.kategori_zakat;

    // Build source link
    let sumberHTML = `<span class="dalil-sumber-text">${item.sumber}</span>`;
    if (item.sumber_url) {
      sumberHTML = `<a href="${item.sumber_url}" target="_blank" rel="noopener noreferrer" class="dalil-sumber-link">
        ${item.sumber}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>`;
    }

    return `
      <article class="dalil-card">
        <div class="dalil-card-header">
          <div class="dalil-badges">
            <span class="dalil-badge ${subInfo.class}">
              <span class="badge-icon">${subInfo.icon}</span>
              ${subInfo.label}
            </span>
            <span class="dalil-badge kategori">${kategoriLabel}</span>
          </div>
        </div>

        <h3 class="dalil-card-title">${item.judul}</h3>

        ${item.teks_arab ? `
          <div class="dalil-arab">
            <p class="arab-text">${item.teks_arab}</p>
          </div>
        ` : ''}

        ${item.teks_latin ? `
          <p class="dalil-latin">${item.teks_latin}</p>
        ` : ''}

        <div class="dalil-terjemahan">
          <p>${item.terjemahan}</p>
        </div>

        <div class="dalil-card-footer">
          <div class="dalil-sumber">
            <span class="sumber-label">Sumber:</span>
            ${sumberHTML}
          </div>
          ${item.sumber_detail ? `
            <p class="dalil-sumber-detail">${item.sumber_detail}</p>
          ` : ''}
        </div>
      </article>
    `;
  }

  // ===== EVENT HANDLERS =====
  function initFilterTabs() {
    // Kategori tabs
    const kategoriTabs = $$('#kategori-tabs .filter-tab');
    kategoriTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        kategoriTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        state.kategori = this.dataset.kategori;
        applyFilters();
      });
    });

    // Sub kategori tabs
    const subTabs = $$('#subkategori-tabs .filter-tab');
    subTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        subTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        state.subKategori = this.dataset.sub;
        applyFilters();
      });
    });
  }

  function initRetryButton() {
    const btnRetry = $('#btn-retry');
    if (btnRetry) {
      btnRetry.addEventListener('click', fetchDalilData);
    }
  }

  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const nav = $('#main-nav');
    
    if (toggle && nav) {
      toggle.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        nav.classList.toggle('active');
      });
    }
  }

  // ===== INIT =====
  function init() {
    console.log('🚀 Dalil & Fatwa - Memulai...');
    
    initMobileNav();
    initFilterTabs();
    initRetryButton();
    
    // Fetch data from Supabase
    fetchDalilData();
    
    console.log('✅ Dalil & Fatwa - Siap!');
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();