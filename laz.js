/* ========================================
   ZakatCalc — LAZ / UPZ Page Script
   ======================================== */

(function() {
  'use strict';

  const CONFIG = {
    SUPABASE_URL: 'https://ynsyiesajoggykqybqsn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ',
    MAP_CENTER: [-2.5, 118],
    MAP_ZOOM: 5,
    MAP_TILE: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    MAP_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
  };

  const TIPE_LABELS = {
    baznas: { label: 'BAZNAS', color: '#34d399', icon: '🏛️' },
    laz_nasional: { label: 'LAZ Nasional', color: '#c9a227', icon: '⭐' },
    laz_provinsi: { label: 'LAZ Provinsi', color: '#60a5fa', icon: '🏢' },
    laz_kabupaten: { label: 'LAZ Kabupaten', color: '#a78bfa', icon: '🏠' },
    upz: { label: 'UPZ', color: '#fb923c', icon: '📍' }
  };

  // State
  const state = {
    map: null,
    markers: [],
    markerGroup: null,
    lazList: [],
    filteredList: [],
    provinsiList: [],
    kabupatenList: [],
    kecamatanList: [],
    filters: {
      provinsi: '',
      kabupaten: '',
      kecamatan: '',
      tipe: 'semua',
      search: ''
    }
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== SUPABASE =====
  async function supabaseFetch(table, query = '') {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?${query}`;
    const response = await fetch(url, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ===== DATA FETCH =====
  async function fetchProvinsi() {
    try {
      const data = await supabaseFetch('provinsi', 'order=nama.asc');
      state.provinsiList = data;
      return data;
    } catch (e) {
      console.error('❌ Fetch provinsi error:', e);
      return [];
    }
  }

  async function fetchKabupaten(provinsiId) {
    try {
      const data = await supabaseFetch('kabupaten', `provinsi_id=eq.${provinsiId}&order=nama.asc`);
      state.kabupatenList = data;
      return data;
    } catch (e) {
      console.error('❌ Fetch kabupaten error:', e);
      return [];
    }
  }

  async function fetchKecamatan(kabupatenId) {
    try {
      const data = await supabaseFetch('kecamatan', `kabupaten_id=eq.${kabupatenId}&order=nama.asc`);
      state.kecamatanList = data;
      return data;
    } catch (e) {
      console.error('❌ Fetch kecamatan error:', e);
      return [];
    }
  }

  async function fetchLazData() {
    try {
      const data = await supabaseFetch('laz', 'is_active=eq.true&order=nama.asc');
      state.lazList = data;
      console.log(`✅ Loaded ${data.length} LAZ/UPZ`);
      return data;
    } catch (e) {
      console.error('❌ Fetch LAZ error:', e);
      return [];
    }
  }

  // ===== MAP =====
  function initMap() {
    state.map = L.map('laz-map', {
      center: CONFIG.MAP_CENTER,
      zoom: CONFIG.MAP_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true
    });

    L.tileLayer(CONFIG.MAP_TILE, {
      attribution: CONFIG.MAP_ATTRIBUTION,
      maxZoom: 18
    }).addTo(state.map);

    state.markerGroup = L.featureGroup().addTo(state.map);
  }

  function createMarkerIcon(tipe) {
    const info = TIPE_LABELS[tipe] || { color: '#9aa8a2', icon: '📍' };
    return L.divIcon({
      className: 'laz-marker-icon',
      html: `<div class="marker-pin" style="background:${info.color}"><span>${info.icon}</span></div>`,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42]
    });
  }

  function renderMarkers() {
    state.markerGroup.clearLayers();

    state.filteredList.forEach(laz => {
      if (!laz.latitude || !laz.longitude) return;

      const info = TIPE_LABELS[laz.tipe] || { label: laz.tipe, icon: '📍' };
      const marker = L.marker([laz.latitude, laz.longitude], {
        icon: createMarkerIcon(laz.tipe)
      });

      marker.bindPopup(`
        <div class="map-popup">
          <strong>${laz.nama}</strong>
          <span class="popup-tipe">${info.label}</span>
          <p>${laz.alamat || ''}</p>
          ${laz.telepon ? `<p>📞 ${laz.telepon}</p>` : ''}
          <button class="popup-detail-btn" onclick="window.__openLazDetail__('${laz.id}')">Lihat Detail</button>
        </div>
      `);

      state.markerGroup.addLayer(marker);
    });

    // Fit bounds if markers exist
    if (state.markerGroup.getLayers().length > 0) {
      state.map.fitBounds(state.markerGroup.getBounds().pad(0.1));
    }
  }

  // Expose detail opener globally for popup onclick
  window.__openLazDetail__ = function(id) {
    const laz = state.lazList.find(l => l.id === id);
    if (laz) openDetailModal(laz);
  };

  // ===== FILTERS =====
  function applyFilters() {
    let filtered = [...state.lazList];

    // Filter provinsi
    if (state.filters.provinsi) {
      filtered = filtered.filter(l => l.provinsi_id === state.filters.provinsi);
    }

    // Filter kabupaten
    if (state.filters.kabupaten) {
      filtered = filtered.filter(l => l.kabupaten_id === state.filters.kabupaten);
    }

    // Filter kecamatan
    if (state.filters.kecamatan) {
      filtered = filtered.filter(l => l.kecamatan_id === state.filters.kecamatan);
    }

    // Filter tipe
    if (state.filters.tipe !== 'semua') {
      filtered = filtered.filter(l => l.tipe === state.filters.tipe);
    }

    // Filter search
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.nama.toLowerCase().includes(q) ||
        (l.alamat && l.alamat.toLowerCase().includes(q))
      );
    }

    state.filteredList = filtered;

    // Update count
    const countEl = $('#results-count');
    if (countEl) countEl.textContent = `${filtered.length} lembaga ditemukan`;

    // Show/hide reset button
    const resetBtn = $('#btn-reset-filter');
    const hasFilter = state.filters.provinsi || state.filters.kabupaten || state.filters.kecamatan || state.filters.tipe !== 'semua' || state.filters.search;
    if (resetBtn) resetBtn.style.display = hasFilter ? 'inline-flex' : 'none';

    renderResults();
    renderMarkers();
  }

  function resetFilters() {
    state.filters = { provinsi: '', kabupaten: '', kecamatan: '', tipe: 'semua', search: '' };

    $('#filter-provinsi').value = '';
    $('#filter-kabupaten').value = '';
    $('#filter-kabupaten').disabled = true;
    $('#filter-kabupaten').innerHTML = '<option value="">-- Pilih Provinsi Dulu --</option>';
    $('#filter-kecamatan').value = '';
    $('#filter-kecamatan').disabled = true;
    $('#filter-kecamatan').innerHTML = '<option value="">-- Pilih Kabupaten Dulu --</option>';
    $('#laz-search').value = '';

    // Reset tipe chips
    $$('#filter-tipe .filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.tipe === 'semua');
    });

    // Reset map view
    state.map.setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);

    applyFilters();
  }

  // ===== RENDER RESULTS =====
  function renderResults() {
    const container = $('#laz-results');
    const loading = $('#laz-loading');

    if (loading) loading.style.display = 'none';

    if (state.filteredList.length === 0) {
      container.innerHTML = `
        <div class="laz-empty">
          <span class="empty-icon">🔍</span>
          <h4>Tidak Ada Lembaga</h4>
          <p>Coba ubah filter pencarian Anda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.filteredList.map(laz => {
      const info = TIPE_LABELS[laz.tipe] || { label: laz.tipe, color: '#9aa8a2', icon: '📍' };
      const prov = state.provinsiList.find(p => p.id === laz.provinsi_id);

      return `
        <div class="laz-result-card" data-id="${laz.id}">
          <div class="laz-result-header">
            <span class="laz-result-badge" style="background:${info.color}20;color:${info.color}">
              ${info.icon} ${info.label}
            </span>
            ${laz.is_verified ? '<span class="verified-badge">✓ Resmi</span>' : ''}
          </div>
          <h4 class="laz-result-name">${laz.nama}</h4>
          <p class="laz-result-address">${laz.alamat || '-'}</p>
          ${prov ? `<span class="laz-result-prov">${prov.nama}</span>` : ''}
          <div class="laz-result-actions">
            ${laz.telepon ? `<a href="tel:${laz.telepon}" class="laz-action-btn phone">📞 ${laz.telepon}</a>` : ''}
            <button type="button" class="laz-action-btn detail" data-id="${laz.id}">Lihat Detail</button>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.laz-result-card').forEach(card => {
      card.addEventListener('click', function(e) {
        // Jangan trigger jika klik tombol/link di dalam card
        if (e.target.closest('a') || e.target.closest('.laz-action-btn.detail')) return;

        const laz = state.lazList.find(l => l.id === this.dataset.id);
        if (laz && laz.latitude && laz.longitude) {
          state.map.setView([laz.latitude, laz.longitude], 15);
          // Open popup
          state.markerGroup.eachLayer(marker => {
            if (marker.getLatLng().lat === laz.latitude && marker.getLatLng().lng === laz.longitude) {
              marker.openPopup();
            }
          });
        }
      });
    });

    // Detail button handlers
    container.querySelectorAll('.laz-action-btn.detail').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const laz = state.lazList.find(l => l.id === this.dataset.id);
        if (laz) openDetailModal(laz);
      });
    });
  }

  // ===== DETAIL MODAL =====
  function openDetailModal(laz) {
    const modal = $('#laz-detail-modal');
    const titleEl = $('#laz-detail-title');
    const bodyEl = $('#laz-detail-body');

    const info = TIPE_LABELS[laz.tipe] || { label: laz.tipe, color: '#9aa8a2', icon: '📍' };
    const prov = state.provinsiList.find(p => p.id === laz.provinsi_id);

    titleEl.textContent = laz.nama;

    bodyEl.innerHTML = `
      <div class="laz-detail">
        <div class="laz-detail-badges">
          <span class="laz-detail-badge" style="background:${info.color}20;color:${info.color}">
            ${info.icon} ${info.label}
          </span>
          ${laz.is_verified ? '<span class="verified-badge-lg">✓ Terverifikasi Resmi</span>' : ''}
        </div>

        ${laz.deskripsi ? `<p class="laz-detail-desc">${laz.deskripsi}</p>` : ''}

        <div class="laz-detail-info">
          <div class="detail-info-row">
            <span class="detail-info-icon">📍</span>
            <div>
              <span class="detail-info-label">Alamat</span>
              <span class="detail-info-value">${laz.alamat || '-'}</span>
              ${prov ? `<span class="detail-info-sub">${prov.nama}</span>` : ''}
            </div>
          </div>

          ${laz.telepon ? `
          <div class="detail-info-row">
            <span class="detail-info-icon">📞</span>
            <div>
              <span class="detail-info-label">Telepon</span>
              <a href="tel:${laz.telepon}" class="detail-info-value link">${laz.telepon}</a>
            </div>
          </div>` : ''}

          ${laz.email ? `
          <div class="detail-info-row">
            <span class="detail-info-icon">📧</span>
            <div>
              <span class="detail-info-label">Email</span>
              <a href="mailto:${laz.email}" class="detail-info-value link">${laz.email}</a>
            </div>
          </div>` : ''}

          ${laz.website ? `
          <div class="detail-info-row">
            <span class="detail-info-icon">🌐</span>
            <div>
              <span class="detail-info-label">Website</span>
              <a href="${laz.website}" target="_blank" rel="noopener noreferrer" class="detail-info-value link">
                ${laz.website.replace('https://', '').replace('http://', '')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          </div>` : ''}
        </div>

        ${(laz.latitude && laz.longitude) ? `
        <div class="laz-detail-map-wrap">
          <div id="detail-mini-map" class="detail-mini-map"></div>
        </div>` : ''}
      </div>
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Init mini map jika ada koordinat
    if (laz.latitude && laz.longitude) {
      setTimeout(() => {
        const miniMap = L.map('detail-mini-map', {
          center: [laz.latitude, laz.longitude],
          zoom: 15,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          attributionControl: false
        });
        L.tileLayer(CONFIG.MAP_TILE).addTo(miniMap);
        L.marker([laz.latitude, laz.longitude], { icon: createMarkerIcon(laz.tipe) }).addTo(miniMap);
      }, 100);
    }
  }

  function closeDetailModal() {
    const modal = $('#laz-detail-modal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ===== EVENT HANDLERS =====
  function initEventHandlers() {
    // Provinsi filter
    $('#filter-provinsi')?.addEventListener('change', async function() {
      state.filters.provinsi = this.value;
      state.filters.kabupaten = '';
      state.filters.kecamatan = '';

      const kabSelect = $('#filter-kabupaten');
      const kecSelect = $('#filter-kecamatan');

      if (this.value) {
        const kabList = await fetchKabupaten(this.value);
        kabSelect.innerHTML = '<option value="">-- Semua Kabupaten/Kota --</option>' +
          kabList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
        kabSelect.disabled = false;

        // Zoom map ke provinsi
        const prov = state.provinsiList.find(p => p.id === this.value);
        if (prov?.latitude && prov?.longitude) {
          state.map.setView([prov.latitude, prov.longitude], 8);
        }
      } else {
        kabSelect.innerHTML = '<option value="">-- Pilih Provinsi Dulu --</option>';
        kabSelect.disabled = true;
        state.map.setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
      }

      kecSelect.innerHTML = '<option value="">-- Pilih Kabupaten Dulu --</option>';
      kecSelect.disabled = true;

      applyFilters();
    });

    // Kabupaten filter
    $('#filter-kabupaten')?.addEventListener('change', async function() {
      state.filters.kabupaten = this.value;
      state.filters.kecamatan = '';

      const kecSelect = $('#filter-kecamatan');

      if (this.value) {
        const kecList = await fetchKecamatan(this.value);
        kecSelect.innerHTML = '<option value="">-- Semua Kecamatan --</option>' +
          kecList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
        kecSelect.disabled = false;

        const kab = state.kabupatenList.find(k => k.id === this.value);
        if (kab?.latitude && kab?.longitude) {
          state.map.setView([kab.latitude, kab.longitude], 11);
        }
      } else {
        kecSelect.innerHTML = '<option value="">-- Pilih Kabupaten Dulu --</option>';
        kecSelect.disabled = true;
      }

      applyFilters();
    });

    // Kecamatan filter
    $('#filter-kecamatan')?.addEventListener('change', function() {
      state.filters.kecamatan = this.value;

      if (this.value) {
        const kec = state.kecamatanList.find(k => k.id === this.value);
        if (kec?.latitude && kec?.longitude) {
          state.map.setView([kec.latitude, kec.longitude], 14);
        }
      }

      applyFilters();
    });

    // Tipe filter chips
    $$('#filter-tipe .filter-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        $$('#filter-tipe .filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        state.filters.tipe = this.dataset.tipe;
        applyFilters();
      });
    });

    // Search
    let searchTimeout;
    $('#laz-search')?.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = this.value.trim();
        applyFilters();
      }, 300);
    });

    // Reset filter
    $('#btn-reset-filter')?.addEventListener('click', resetFilters);

    // Close modal
    $('#close-laz-modal')?.addEventListener('click', closeDetailModal);
    $('#laz-detail-modal')?.addEventListener('click', function(e) {
      if (e.target === this) closeDetailModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && $('#laz-detail-modal')?.classList.contains('active')) {
        closeDetailModal();
      }
    });
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
  async function init() {
    console.log('🚀 LAZ/UPZ - Memulai...');

    initMobileNav();
    initMap();
    initEventHandlers();

    // Fetch data
    const [provinsiData, lazData] = await Promise.all([
      fetchProvinsi(),
      fetchLazData()
    ]);

    // Populate provinsi dropdown
    const provSelect = $('#filter-provinsi');
    if (provSelect && provinsiData.length > 0) {
      provSelect.innerHTML = '<option value="">-- Semua Provinsi --</option>' +
        provinsiData.map(p => `<option value="${p.id}">${p.nama}</option>`).join('');
    }

    // Initial render
    applyFilters();

    console.log('✅ LAZ/UPZ - Siap!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();