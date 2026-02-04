/* ========================================
   ZakatCalc — Fiqih Harian Page Script
   ======================================== */

(function() {
  'use strict';

  // ===== KONFIGURASI =====
  const CONFIG = {
    SUPABASE_URL: 'https://ynsyiesajoggykqybqsn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ',
    SEARCH_DEBOUNCE: 300
  };

  // ===== STATE =====
  const state = {
    kitabList: [],
    babList: [],
    contentList: [],
    searchResults: [],
    currentKitab: null,
    currentBab: null,
    currentView: 'kitab',
    isLoading: false,
    searchQuery: ''
  };

  // ===== DOM CACHE =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // DOM Elements
  let kitabSection, babSection, contentSection, searchResultsSection;
  let kitabGrid, babGrid, contentGrid, searchGrid;
  let searchInput, searchClear;
  let detailModal, detailModalBody, detailModalTitle;

  // ===== SUPABASE HELPERS =====
  async function supabaseFetch(table, query = '') {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?${query}`;
    const response = await fetch(url, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // ===== DATA FETCHING =====
  async function fetchKitabList() {
    try {
      const data = await supabaseFetch('fiqih_kitab', 'order=urutan.asc');
      state.kitabList = data;
      console.log(`✅ Loaded ${data.length} kitab categories`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load kitab:', error);
      state.kitabList = getDefaultKitabData();
      return state.kitabList;
    }
  }

  async function fetchBabList(kitabId) {
    try {
      const data = await supabaseFetch('fiqih_bab', `kitab_id=eq.${kitabId}&order=urutan.asc`);
      state.babList = data;
      console.log(`✅ Loaded ${data.length} bab for kitab: ${kitabId}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load bab:', error);
      state.babList = getDefaultBabData(kitabId);
      return state.babList;
    }
  }

  async function fetchContent(kitabId, babId) {
    try {
      const data = await supabaseFetch('fiqih', `kitab=eq.${kitabId}&bab=eq.${babId}&is_active=eq.true&order=urutan.asc`);
      state.contentList = data;
      console.log(`✅ Loaded ${data.length} content items`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load content:', error);
      state.contentList = [];
      return [];
    }
  }

  async function searchContent(query) {
    if (!query || query.length < 2) return [];

    try {
      const searchQuery = `or=(judul.ilike.*${query}*,ringkasan.ilike.*${query}*,penjelasan.ilike.*${query}*)&is_active=eq.true&limit=20`;
      const data = await supabaseFetch('fiqih', searchQuery);
      state.searchResults = data;
      console.log(`✅ Found ${data.length} search results for: ${query}`);
      return data;
    } catch (error) {
      console.error('❌ Search failed:', error);
      state.searchResults = [];
      return [];
    }
  }

  // ===== FALLBACK DATA =====
  function getDefaultKitabData() {
    return [
      { id: 'thaharah', nama: 'Kitab Thaharah (Bersuci)', nama_singkat: 'Bersuci', deskripsi: 'Dasar dari ibadah, membahas tentang cara bersuci dari hadats dan najis.', icon: '💧', warna: 'blue' },
      { id: 'shalat', nama: 'Kitab Shalat', nama_singkat: 'Shalat', deskripsi: 'Pembahasan lengkap tentang shalat wajib, sunnah, dan tata caranya.', icon: '🕌', warna: 'emerald' },
      { id: 'zakat', nama: 'Kitab Zakat', nama_singkat: 'Zakat', deskripsi: 'Jenis harta wajib zakat dan golongan yang berhak menerima.', icon: '💰', warna: 'gold' },
      { id: 'puasa', nama: 'Kitab Puasa (Shiyam)', nama_singkat: 'Puasa', deskripsi: 'Syarat, rukun, dan hal-hal yang berkaitan dengan puasa.', icon: '🌙', warna: 'purple' },
      { id: 'haji', nama: 'Kitab Haji dan Umrah', nama_singkat: 'Haji', deskripsi: 'Rukun, wajib, dan tata cara pelaksanaan haji dan umrah.', icon: '🕋', warna: 'brown' },
      { id: 'muamalah', nama: 'Kitab Muamalah', nama_singkat: 'Muamalah', deskripsi: 'Hukum transaksi, jual beli, dan hubungan sosial dalam Islam.', icon: '🤝', warna: 'cyan' }
    ];
  }

  function getDefaultBabData(kitabId) {
    const babData = {
      thaharah: [
        { id: 'macam_air', nama: 'Macam-macam Air', deskripsi: 'Air yang boleh dan tidak boleh digunakan untuk bersuci', icon: '🚰' },
        { id: 'najis', nama: 'Najis dan Cara Mensucikan', deskripsi: 'Jenis najis dan tata cara membersihkannya', icon: '🧹' },
        { id: 'wudhu', nama: 'Wudhu', deskripsi: 'Rukun, sunnah, dan pembatal wudhu', icon: '🤲' },
        { id: 'mandi_wajib', nama: 'Mandi Wajib', deskripsi: 'Penyebab dan tata cara mandi janabah', icon: '🚿' },
        { id: 'tayamum', nama: 'Tayamum', deskripsi: 'Syarat dan tata cara tayamum', icon: '🏜️' },
        { id: 'haid_nifas', nama: 'Haid, Nifas, Istihadhah', deskripsi: 'Hukum darah kebiasaan wanita', icon: '📅' }
      ],
      shalat: [
        { id: 'syarat_shalat', nama: 'Syarat Sah & Wajib Shalat', deskripsi: 'Syarat yang harus dipenuhi sebelum shalat', icon: '✅' },
        { id: 'rukun_shalat', nama: 'Rukun Shalat', deskripsi: '13 rukun yang wajib dipenuhi dalam shalat', icon: '📋' },
        { id: 'sunnah_shalat', nama: 'Sunnah-sunnah Shalat', deskripsi: 'Amalan sunnah sebelum dan di dalam shalat', icon: '⭐' },
        { id: 'pembatal_shalat', nama: 'Pembatal Shalat', deskripsi: 'Hal-hal yang membatalkan shalat', icon: '❌' },
        { id: 'shalat_jamaah', nama: 'Shalat Berjamaah', deskripsi: 'Keutamaan dan tata cara shalat berjamaah', icon: '👥' },
        { id: 'shalat_jumat', nama: 'Shalat Jumat', deskripsi: 'Syarat dan ketentuan shalat Jumat', icon: '🕌' },
        { id: 'shalat_musafir', nama: 'Shalat Musafir', deskripsi: 'Jamak dan qashar bagi musafir', icon: '✈️' },
        { id: 'shalat_sunnah', nama: 'Shalat Sunnah', deskripsi: 'Rawatib, tarawih, witir, dhuha, dll', icon: '🌟' }
      ],
      zakat: [
        { id: 'zakat_fitrah', nama: 'Zakat Fitrah', deskripsi: 'Ketentuan zakat fitrah di bulan Ramadhan', icon: '🌾' },
        { id: 'zakat_maal', nama: 'Zakat Maal', deskripsi: 'Zakat harta: emas, perak, uang, dll', icon: '💎' },
        { id: 'zakat_pertanian', nama: 'Zakat Pertanian', deskripsi: 'Zakat hasil bumi dan pertanian', icon: '🌱' },
        { id: 'zakat_ternak', nama: 'Zakat Peternakan', deskripsi: 'Zakat binatang ternak', icon: '🐄' },
        { id: 'mustahiq', nama: 'Mustahiq Zakat', deskripsi: '8 golongan penerima zakat', icon: '🎁' }
      ],
      puasa: [
        { id: 'syarat_puasa', nama: 'Syarat Wajib & Sah Puasa', deskripsi: 'Syarat-syarat puasa', icon: '📝' },
        { id: 'rukun_puasa', nama: 'Rukun Puasa', deskripsi: 'Niat dan menahan diri', icon: '💪' },
        { id: 'pembatal_puasa', nama: 'Pembatal Puasa', deskripsi: 'Hal yang membatalkan puasa', icon: '🚫' },
        { id: 'puasa_sunnah', nama: 'Puasa Sunnah', deskripsi: 'Puasa-puasa sunnah yang dianjurkan', icon: '📆' },
        { id: 'puasa_haram', nama: 'Puasa yang Dilarang', deskripsi: 'Hari-hari yang diharamkan berpuasa', icon: '⛔' }
      ],
      haji: [
        { id: 'rukun_haji', nama: 'Rukun Haji', deskripsi: 'Rukun-rukun haji yang wajib dipenuhi', icon: '📋' },
        { id: 'wajib_haji', nama: 'Wajib Haji', deskripsi: 'Amalan wajib dalam haji', icon: '✅' },
        { id: 'sunnah_haji', nama: 'Sunnah Haji', deskripsi: 'Amalan sunnah dalam haji', icon: '⭐' },
        { id: 'jenis_haji', nama: 'Jenis-jenis Haji', deskripsi: 'Tamattu, Ifrad, dan Qiran', icon: '🔄' },
        { id: 'umrah', nama: 'Umrah', deskripsi: 'Tata cara pelaksanaan umrah', icon: '🕋' }
      ],
      muamalah: [
        { id: 'jual_beli', nama: 'Jual Beli (Ba\'i)', deskripsi: 'Syarat, rukun, dan jenis jual beli', icon: '🛒' },
        { id: 'riba', nama: 'Riba', deskripsi: 'Pengertian dan larangan riba', icon: '🚫' },
        { id: 'sewa', nama: 'Sewa-menyewa (Ijarah)', deskripsi: 'Hukum sewa-menyewa', icon: '🏠' },
        { id: 'utang', nama: 'Utang-piutang', deskripsi: 'Hukum utang dan tata caranya', icon: '💳' },
        { id: 'gadai', nama: 'Gadai (Rahn)', deskripsi: 'Hukum menggadaikan barang', icon: '🔐' }
      ]
    };
    return babData[kitabId] || [];
  }

  // ===== RENDER FUNCTIONS =====
  function renderKitabGrid() {
    if (state.kitabList.length === 0) {
      kitabGrid.innerHTML = `
        <div class="fiqih-empty full-width">
          <span class="empty-icon">📭</span>
          <h4>Tidak Ada Kategori</h4>
          <p>Kategori kitab belum tersedia.</p>
        </div>
      `;
      return;
    }

    kitabGrid.innerHTML = state.kitabList.map(kitab => `
      <button type="button" class="kitab-card kitab-${kitab.warna || 'default'}" data-kitab-id="${kitab.id}">
        <div class="kitab-card-icon">
          <span>${kitab.icon || '📖'}</span>
        </div>
        <div class="kitab-card-content">
          <h3 class="kitab-card-title">${kitab.nama_singkat}</h3>
          <p class="kitab-card-desc">${kitab.deskripsi || ''}</p>
        </div>
        <div class="kitab-card-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>
    `).join('');

    // Add click handlers
    $$('.kitab-card').forEach(card => {
      card.addEventListener('click', () => {
        const kitabId = card.dataset.kitabId;
        selectKitab(kitabId);
      });
    });
  }

  function renderBabGrid() {
    if (state.babList.length === 0) {
      babGrid.innerHTML = `
        <div class="fiqih-empty full-width">
          <span class="empty-icon">📭</span>
          <h4>Tidak Ada Sub-kategori</h4>
          <p>Sub-kategori untuk kitab ini belum tersedia.</p>
        </div>
      `;
      return;
    }

    babGrid.innerHTML = state.babList.map(bab => `
      <button type="button" class="bab-card" data-bab-id="${bab.id}">
        <div class="bab-card-icon">
          <span>${bab.icon || '📄'}</span>
        </div>
        <div class="bab-card-content">
          <h4 class="bab-card-title">${bab.nama}</h4>
          <p class="bab-card-desc">${bab.deskripsi || ''}</p>
        </div>
        <div class="bab-card-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>
    `).join('');

    // Add click handlers
    $$('.bab-card').forEach(card => {
      card.addEventListener('click', () => {
        const babId = card.dataset.babId;
        selectBab(babId);
      });
    });
  }

  function renderContentGrid(contentList, gridElement) {
    if (contentList.length === 0) {
      return;
    }

    gridElement.innerHTML = contentList.map(item => createContentCardHTML(item)).join('');

    // Add click handlers for detail
    gridElement.querySelectorAll('.content-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.dataset.id;
        const item = contentList.find(c => c.id === itemId);
        if (item) {
          openDetailModal(item);
        }
      });
    });
  }

  function createContentCardHTML(item) {
    let poinPoin = [];
    if (item.poin_poin) {
      try {
        poinPoin = typeof item.poin_poin === 'string' ? JSON.parse(item.poin_poin) : item.poin_poin;
      } catch (e) {
        poinPoin = [];
      }
    }

    const hasArabic = item.teks_arab && item.teks_arab.trim() !== '';
    const hasPoin = poinPoin.length > 0;

    return `
      <article class="content-card" data-id="${item.id}">
        <div class="content-card-header">
          <div class="content-badges">
            <span class="content-badge kitab">${getKitabLabel(item.kitab)}</span>
            <span class="content-badge bab">${getBabLabel(item.bab)}</span>
          </div>
          ${hasArabic ? '<span class="has-arabic-badge">عربي</span>' : ''}
        </div>

        <h4 class="content-card-title">${item.judul}</h4>
        
        ${item.ringkasan ? `<p class="content-card-summary">${item.ringkasan}</p>` : ''}

        ${hasArabic ? `
          <div class="content-card-arabic">
            <p class="arabic-preview">${truncateText(item.teks_arab, 100)}</p>
          </div>
        ` : ''}

        ${hasPoin ? `
          <div class="content-card-poin">
            <span class="poin-label">${poinPoin[0].judul}:</span>
            <span class="poin-count">${poinPoin[0].items?.length || 0} poin</span>
          </div>
        ` : ''}

        <div class="content-card-footer">
          ${item.sumber ? `<span class="content-source">${item.sumber}</span>` : ''}
          <span class="read-more">
            Baca selengkapnya
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>
        </div>
      </article>
    `;
  }

  // ===== MODAL FUNCTIONS =====
  function openDetailModal(item) {
    detailModalTitle.textContent = item.judul;
    detailModalBody.innerHTML = createDetailContentHTML(item);
    
    detailModal.classList.add('active');
    detailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    detailModal.classList.remove('active');
    detailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function createDetailContentHTML(item) {
    let poinPoin = [];
    if (item.poin_poin) {
      try {
        poinPoin = typeof item.poin_poin === 'string' ? JSON.parse(item.poin_poin) : item.poin_poin;
      } catch (e) {
        poinPoin = [];
      }
    }

    let html = `<div class="detail-content">`;

    // Badges
    html += `
      <div class="detail-badges">
        <span class="detail-badge kitab">${getKitabLabel(item.kitab)}</span>
        <span class="detail-badge bab">${getBabLabel(item.bab)}</span>
      </div>
    `;

    // Teks Arab
    if (item.teks_arab && item.teks_arab.trim() !== '') {
      html += `
        <div class="detail-arabic">
          <p class="arabic-text">${item.teks_arab}</p>
        </div>
      `;
    }

    // Teks Latin
    if (item.teks_latin && item.teks_latin.trim() !== '') {
      html += `<p class="detail-latin">${item.teks_latin}</p>`;
    }

    // Penjelasan
    html += `
      <div class="detail-explanation">
        <h4>Penjelasan</h4>
        <p>${formatParagraphs(item.penjelasan)}</p>
      </div>
    `;

    // Poin-poin
    if (poinPoin.length > 0) {
      html += `<div class="detail-poin-section">`;
      poinPoin.forEach(poin => {
        html += `
          <div class="detail-poin-group">
            <h4>${poin.judul}</h4>
            <ol class="detail-poin-list">
              ${poin.items.map(item => `<li>${item}</li>`).join('')}
            </ol>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Sumber
    if (item.sumber) {
      html += `
        <div class="detail-source">
          <span class="source-label">Sumber:</span>
          ${item.sumber_url ? 
            `<a href="${item.sumber_url}" target="_blank" rel="noopener noreferrer" class="source-link">
              ${item.sumber}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>` 
            : `<span class="source-text">${item.sumber}</span>`
          }
          ${item.sumber_detail ? `<p class="source-detail">${item.sumber_detail}</p>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  // ===== NAVIGATION FUNCTIONS =====
  async function selectKitab(kitabId) {
    const kitab = state.kitabList.find(k => k.id === kitabId);
    if (!kitab) return;

    state.currentKitab = kitab;
    state.currentView = 'bab';

    // Update UI
    $('#current-kitab-icon').textContent = kitab.icon || '📖';
    $('#current-kitab-nama').textContent = kitab.nama_singkat;
    $('#current-kitab-desc').textContent = kitab.deskripsi || '';

    // Fetch and render bab
    await fetchBabList(kitabId);
    renderBabGrid();

    // Show bab section
    showSection('bab');
  }

  async function selectBab(babId) {
    const bab = state.babList.find(b => b.id === babId);
    if (!bab) return;

    state.currentBab = bab;
    state.currentView = 'content';

    // Update UI
    $('#current-bab-icon').textContent = bab.icon || '📄';
    $('#current-bab-nama').textContent = bab.nama;
    $('#current-bab-desc').textContent = bab.deskripsi || '';

    // Show loading
    $('#content-loading').style.display = 'flex';
    $('#content-empty').style.display = 'none';
    contentGrid.innerHTML = '';

    // Fetch content
    const content = await fetchContent(state.currentKitab.id, babId);

    // Hide loading
    $('#content-loading').style.display = 'none';

    if (content.length === 0) {
      $('#content-empty').style.display = 'flex';
    } else {
      renderContentGrid(content, contentGrid);
    }

    // Show content section
    showSection('content');
  }

  function showSection(section) {
    // Hide all sections
    kitabSection.style.display = 'none';
    babSection.style.display = 'none';
    contentSection.style.display = 'none';
    searchResultsSection.style.display = 'none';

    // Show target section
    switch (section) {
      case 'kitab':
        kitabSection.style.display = 'block';
        state.currentView = 'kitab';
        break;
      case 'bab':
        babSection.style.display = 'block';
        state.currentView = 'bab';
        break;
      case 'content':
        contentSection.style.display = 'block';
        state.currentView = 'content';
        break;
      case 'search':
        searchResultsSection.style.display = 'block';
        state.currentView = 'search';
        break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== SEARCH FUNCTIONS =====
  let searchTimeout = null;

  function handleSearch(query) {
    state.searchQuery = query.trim();

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchClear.style.display = query.length > 0 ? 'flex' : 'none';

    if (query.length === 0) {
      showSection('kitab');
      return;
    }

    if (query.length >= 2) {
      searchTimeout = setTimeout(async () => {
        await performSearch(query);
      }, CONFIG.SEARCH_DEBOUNCE);
    }
  }

  async function performSearch(query) {
    showSection('search');

    $('#search-loading').style.display = 'flex';
    $('#search-empty').style.display = 'none';
    searchGrid.innerHTML = '';

    const results = await searchContent(query);

    $('#search-loading').style.display = 'none';
    $('#search-results-count').textContent = `${results.length} hasil ditemukan untuk "${query}"`;

    if (results.length === 0) {
      $('#search-empty').style.display = 'flex';
    } else {
      renderContentGrid(results, searchGrid);
    }
  }

  function clearSearch() {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.style.display = 'none';
    showSection('kitab');
  }

  // ===== HELPER FUNCTIONS =====
  function getKitabLabel(kitabId) {
    const kitab = state.kitabList.find(k => k.id === kitabId);
    return kitab ? kitab.nama_singkat : kitabId;
  }

  function getBabLabel(babId) {
    const allBabs = Object.values(getDefaultBabData('thaharah'))
      .concat(Object.values(getDefaultBabData('shalat')))
      .concat(Object.values(getDefaultBabData('zakat')))
      .concat(Object.values(getDefaultBabData('puasa')))
      .concat(Object.values(getDefaultBabData('haji')))
      .concat(Object.values(getDefaultBabData('muamalah')));
    
    // Check current babList first
    const bab = state.babList.find(b => b.id === babId);
    if (bab) return bab.nama;
    
    // Fallback: format bab_id
    return babId.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  function formatParagraphs(text) {
    if (!text) return '';
    return text.split('\n').filter(p => p.trim()).map(p => p).join('<br><br>');
  }

  // ===== MOBILE NAV =====
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

  // ===== EVENT HANDLERS =====
  function initEventHandlers() {
    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearSearch();
        }
      });
    }

    // Search clear button
    if (searchClear) {
      searchClear.addEventListener('click', clearSearch);
    }

    // Back buttons
    $('#btn-back-kitab')?.addEventListener('click', () => {
      showSection('kitab');
    });

    $('#btn-back-bab')?.addEventListener('click', () => {
      showSection('bab');
    });

    $('#btn-back-search')?.addEventListener('click', () => {
      clearSearch();
    });

    // Detail modal close
    $('#close-detail-modal')?.addEventListener('click', closeDetailModal);

    // Close modal on backdrop click
    if (detailModal) {
      detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
          closeDetailModal();
        }
      });
    }

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && detailModal?.classList.contains('active')) {
        closeDetailModal();
      }
    });
  }

  // ===== INIT =====
  async function init() {
    console.log('🚀 Fiqih Harian - Memulai...');

    // Cache DOM elements
    kitabSection = $('#kitab-section');
    babSection = $('#bab-section');
    contentSection = $('#content-section');
    searchResultsSection = $('#search-results');
    kitabGrid = $('#kitab-grid');
    babGrid = $('#bab-grid');
    contentGrid = $('#content-grid');
    searchGrid = $('#search-grid');
    searchInput = $('#search-input');
    searchClear = $('#search-clear');
    detailModal = $('#detail-modal');
    detailModalBody = $('#detail-modal-body');
    detailModalTitle = $('#detail-modal-title');

    // Init mobile nav
    initMobileNav();

    // Init event handlers
    initEventHandlers();

    // Fetch and render kitab list
    await fetchKitabList();
    renderKitabGrid();

    console.log('✅ Fiqih Harian - Siap!');
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();