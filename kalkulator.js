/* ========================================
   ZakatCalc — Kalkulator Page Script
   ======================================== */

(function() {
  'use strict';

  // ===== KONFIGURASI =====
  const CONFIG = {
    SUPABASE_URL: 'https://ynsyiesajoggykqybqsn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ',
    GOLDAPI_KEY: 'goldapi-13qujjslsmkjctt1w-io',
    KURS_USD_IDR: 16200,
    NISAB_EMAS_GRAM: 85,
    NISAB_PERAK_GRAM: 595,
    NISAB_PERTANIAN_KG: 653,
    PERSENTASE_ZAKAT: 2.5,
    FALLBACK: {
      emas: 1350000,
      perak: 13500
    }
  };

  // Data Lists
  const CRYPTO_LIST = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'tether', symbol: 'USDT', name: 'Tether' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' }
  ];

  const STOCK_LIST = [
    { code: 'BBCA', name: 'Bank BCA' },
    { code: 'BBRI', name: 'Bank BRI' },
    { code: 'BMRI', name: 'Bank Mandiri' },
    { code: 'TLKM', name: 'Telkom Indonesia' },
    { code: 'ASII', name: 'Astra International' },
    { code: 'UNVR', name: 'Unilever Indonesia' },
    { code: 'BBNI', name: 'Bank BNI' },
    { code: 'ICBP', name: 'Indofood CBP' }
  ];

  // Nisab Peternakan
  const NISAB_TERNAK = {
    kambing: { nisab: 40, label: '40 ekor' },
    sapi: { nisab: 30, label: '30 ekor' },
    unta: { nisab: 5, label: '5 ekor' }
  };

  // Zakat Peternakan Tables
  const ZAKAT_KAMBING = [
    { min: 40, max: 120, zakat: '1 ekor kambing (umur 1 tahun)' },
    { min: 121, max: 200, zakat: '2 ekor kambing' },
    { min: 201, max: 399, zakat: '3 ekor kambing' },
    { min: 400, max: 499, zakat: '4 ekor kambing' },
    { min: 500, max: 599, zakat: '5 ekor kambing' }
  ];

  const ZAKAT_SAPI = [
    { min: 30, max: 39, zakat: '1 ekor anak sapi (umur 1 tahun)' },
    { min: 40, max: 59, zakat: '1 ekor anak sapi (umur 2 tahun)' },
    { min: 60, max: 69, zakat: '2 ekor anak sapi (umur 1 tahun)' },
    { min: 70, max: 79, zakat: '1 ekor anak sapi (1 thn) + 1 ekor (2 thn)' },
    { min: 80, max: 89, zakat: '2 ekor anak sapi (umur 2 tahun)' }
  ];

  const ZAKAT_UNTA = [
    { min: 5, max: 9, zakat: '1 ekor kambing' },
    { min: 10, max: 14, zakat: '2 ekor kambing' },
    { min: 15, max: 19, zakat: '3 ekor kambing' },
    { min: 20, max: 24, zakat: '4 ekor kambing' },
    { min: 25, max: 35, zakat: '1 ekor unta bintu makhad (umur 1 tahun)' }
  ];

  // ===== STATE =====
  const state = {
    hargaEmas: 0,
    hargaPerak: 0,
    nisab: 0,
    cryptoPrices: {},
    currentStockPrice: 0,
    currentType: null,
    isLive: false
  };

  // ===== DOM ELEMENTS =====
  let modalEl = null;
  let modalTitleEl = null;
  let modalBodyEl = null;

  // ===== UTILITY FUNCTIONS =====
  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return document.querySelectorAll(selector);
  }

  function formatRupiah(angka) {
    if (!angka || isNaN(angka)) return 'Rp 0';
    return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
  }

  function parseRupiah(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d]/g, '')) || 0;
  }

  function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  }

  function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatInputRupiah(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value) {
      input.value = parseInt(value).toLocaleString('id-ID');
    } else {
      input.value = '';
    }
  }

  function formatInputNumber(input) {
    input.value = input.value.replace(/[^\d.,]/g, '');
  }

  // ===== FETCH FUNCTIONS =====
  async function fetchHargaEmas() {
    try {
      const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: {
          'x-access-token': CONFIG.GOLDAPI_KEY,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      let pricePerGram = data.price_gram_24k || (data.price / 31.1035);
      
      if (pricePerGram && !isNaN(pricePerGram)) {
        return { price: Math.round(pricePerGram * CONFIG.KURS_USD_IDR), isLive: true };
      }
      throw new Error('Invalid data');
    } catch (error) {
      console.warn('⚠️ GoldAPI error:', error.message);
      return { price: CONFIG.FALLBACK.emas, isLive: false };
    }
  }

  async function fetchCryptoPrices() {
    try {
      const ids = CRYPTO_LIST.map(c => c.id).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`
      );
      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const prices = {};
      CRYPTO_LIST.forEach(crypto => {
        if (data[crypto.id]?.idr) {
          prices[crypto.symbol] = data[crypto.id].idr;
        }
      });
      return prices;
    } catch (error) {
      console.warn('⚠️ CoinGecko error:', error.message);
      return {};
    }
  }

  async function fetchStockPrice(stockCode) {
    try {
      const response = await fetch(
        `${CONFIG.SUPABASE_URL}/functions/v1/stock-price`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ stock: stockCode })
        }
      );
      if (!response.ok) throw new Error('Edge Function error');

      const data = await response.json();
      if (data?.price && typeof data.price === 'number') {
        return data.price;
      }
      throw new Error('Invalid data');
    } catch (error) {
      console.warn(`⚠️ Stock ${stockCode} error:`, error.message);
      return null;
    }
  }

  // ===== NISAB BAR =====
  function renderNisabBar() {
    const nisabEl = $('#nisab-rupiah');
    const emasEl = $('#harga-emas');
    const updateEl = $('#tanggal-update');
    const liveEl = $('#live-status');

    if (nisabEl) nisabEl.textContent = formatRupiah(state.nisab);
    if (emasEl) emasEl.textContent = formatRupiah(state.hargaEmas) + '/g';
    if (updateEl) updateEl.textContent = formatDate(new Date());
    
    if (liveEl && !state.isLive) {
      liveEl.classList.add('offline');
      const liveText = liveEl.querySelector('.live-text');
      if (liveText) liveText.textContent = 'CACHE';
    }
  }

  // ===== MODAL FUNCTIONS =====
  function openCalculator(type) {
    console.log('Opening calculator:', type);
    
    if (!modalEl || !modalTitleEl || !modalBodyEl) {
      console.error('Modal elements not found');
      return;
    }

    state.currentType = type;

    const titles = {
      emas: 'Zakat Emas & Perak',
      penghasilan: 'Zakat Penghasilan',
      tabungan: 'Zakat Tabungan & Deposito',
      perdagangan: 'Zakat Perdagangan',
      saham: 'Zakat Saham',
      crypto: 'Zakat Cryptocurrency',
      pertanian: 'Zakat Pertanian',
      peternakan: 'Zakat Peternakan'
    };

    modalTitleEl.textContent = titles[type] || 'Kalkulator Zakat';
    modalBodyEl.innerHTML = getFormHTML(type);
    
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Init form after rendering
    setTimeout(() => initForm(type), 10);
  }

  function closeCalculator() {
    console.log('Closing calculator');
    
    if (!modalEl) return;
    
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.currentType = null;
    state.currentStockPrice = 0;
  }

  // ===== SHOW HASIL =====
  function showHasil(wajib, data) {
    const container = $('#hasil-zakat');
    if (!container) return;

    let itemsHTML = data.items.map(item => 
      `<div class="result-row"><span>${item.label}</span><span>${item.value}</span></div>`
    ).join('');

    if (wajib) {
      container.innerHTML = `
        <div class="result-card success">
          <div class="result-header">
            <span class="result-icon">✓</span>
            <h4>Wajib Zakat</h4>
          </div>
          <div class="result-amount">${data.zakat}</div>
          ${data.zakatAlt ? `<p class="result-alt">${data.zakatAlt}</p>` : ''}
          <div class="result-details">${itemsHTML}</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="result-card warning">
          <div class="result-header">
            <span class="result-icon">!</span>
            <h4>Belum Wajib Zakat</h4>
          </div>
          <p class="result-message">Belum mencapai nisab</p>
          ${data.kekurangan ? `<p class="result-kekurangan">Kekurangan: <strong>${data.kekurangan}</strong></p>` : ''}
          <div class="result-details">${itemsHTML}</div>
        </div>
      `;
    }

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ===== FORM HTML GENERATORS =====
  function getFormHTML(type) {
    const forms = {
      emas: formEmas,
      penghasilan: formPenghasilan,
      tabungan: formTabungan,
      perdagangan: formPerdagangan,
      saham: formSaham,
      crypto: formCrypto,
      pertanian: formPertanian,
      peternakan: formPeternakan
    };
    return forms[type] ? forms[type]() : '<p>Form tidak tersedia</p>';
  }

  function formEmas() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab Emas: 85 gram (${formatRupiah(state.nisab)})</li>
            <li>Nisab Perak: 595 gram</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Haul: 1 tahun</li>
          </ul>
        </div>

        <div class="form-group">
          <span class="form-label">Jenis Logam</span>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="jenis-logam" value="emas" checked>
              <span>Emas</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="jenis-logam" value="perak">
              <span>Perak</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="berat-logam">Berat (gram)</label>
          <input type="text" id="berat-logam" class="form-input" placeholder="Contoh: 100" inputmode="decimal">
        </div>

        <div class="form-group">
          <span class="form-label">Harga per Gram</span>
          <div class="form-static" id="harga-logam-display">${formatRupiah(state.hargaEmas)}</div>
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Total Nilai</span>
            <span id="total-nilai">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Nisab</span>
            <span id="nilai-nisab">${formatRupiah(state.nisab)}</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formPenghasilan() {
    const nisabBulanan = state.nisab / 12;
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: Setara 85 gram emas/tahun</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Tidak perlu haul</li>
          </ul>
        </div>

        <div class="form-group">
          <span class="form-label">Periode</span>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="periode" value="bulanan" checked>
              <span>Bulanan</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="periode" value="tahunan">
              <span>Tahunan</span>
            </label>
          </div>
        </div>

        <div class="form-section-title">Pendapatan</div>
        <div class="form-group">
          <label class="form-label" for="gaji">Gaji / Pendapatan Utama</label>
          <input type="text" id="gaji" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label" for="pendapatan-lain">Pendapatan Lain</label>
          <input type="text" id="pendapatan-lain" class="form-input" placeholder="0" inputmode="numeric">
        </div>

        <div class="form-section-title">Pengeluaran (Opsional)</div>
        <div class="form-group">
          <label class="form-label" for="kebutuhan-pokok">Kebutuhan Pokok</label>
          <input type="text" id="kebutuhan-pokok" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label" for="cicilan">Cicilan / Hutang</label>
          <input type="text" id="cicilan" class="form-input" placeholder="0" inputmode="numeric">
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Pendapatan Bersih</span>
            <span id="pendapatan-bersih">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Nisab <span id="label-periode">(bulanan)</span></span>
            <span id="nilai-nisab">${formatRupiah(nisabBulanan)}</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formTabungan() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: Setara 85 gram emas (${formatRupiah(state.nisab)})</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Haul: 1 tahun penuh</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="saldo">Saldo Tabungan / Deposito</label>
          <input type="text" id="saldo" class="form-input" placeholder="0" inputmode="numeric">
          <small class="form-hint">Gunakan saldo terendah selama 1 tahun</small>
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Saldo</span>
            <span id="total-saldo">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Nisab</span>
            <span>${formatRupiah(state.nisab)}</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formPerdagangan() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: Setara 85 gram emas (${formatRupiah(state.nisab)})</li>
            <li>Rumus: (Modal + Laba + Piutang) - Hutang</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Haul: 1 tahun</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="modal">Modal Usaha</label>
          <input type="text" id="modal" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label" for="laba">Keuntungan / Laba</label>
          <input type="text" id="laba" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label" for="piutang">Piutang (bisa ditagih)</label>
          <input type="text" id="piutang" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label" for="hutang">Hutang Usaha</label>
          <input type="text" id="hutang" class="form-input" placeholder="0" inputmode="numeric">
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Total Aset</span>
            <span id="total-aset">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Hutang</span>
            <span id="total-hutang">Rp 0</span>
          </div>
          <div class="summary-row highlight">
            <span>Harta Bersih</span>
            <span id="harta-bersih">Rp 0</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formSaham() {
    const options = STOCK_LIST.map(s => `<option value="${s.code}">${s.code} - ${s.name}</option>`).join('');
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: Setara 85 gram emas (${formatRupiah(state.nisab)})</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Haul: 1 tahun</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="pilih-saham">Pilih Saham</label>
          <select id="pilih-saham" class="form-select">
            <option value="">-- Pilih Saham --</option>
            ${options}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="jumlah-lot">Jumlah Lot</label>
          <input type="text" id="jumlah-lot" class="form-input" placeholder="Contoh: 10" inputmode="numeric">
          <small class="form-hint">1 lot = 100 lembar</small>
        </div>

        <div class="form-group">
          <span class="form-label">Harga per Lembar</span>
          <div class="form-static-with-badge">
            <span id="harga-saham-display">Pilih saham dulu</span>
            <span class="badge-live" id="badge-saham" style="display:none;">LIVE</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="dividen">Dividen Diterima (per tahun)</label>
          <input type="text" id="dividen" class="form-input" placeholder="0" inputmode="numeric">
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Nilai Saham</span>
            <span id="nilai-saham">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Dividen</span>
            <span id="nilai-dividen">Rp 0</span>
          </div>
          <div class="summary-row highlight">
            <span>Total</span>
            <span id="total-saham">Rp 0</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formCrypto() {
    const options = CRYPTO_LIST.map(c => `<option value="${c.symbol}">${c.symbol} - ${c.name}</option>`).join('');
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: Setara 85 gram emas (${formatRupiah(state.nisab)})</li>
            <li>Kadar zakat: 2.5%</li>
            <li>Haul: 1 tahun</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="pilih-crypto">Pilih Cryptocurrency</label>
          <select id="pilih-crypto" class="form-select">
            <option value="">-- Pilih Crypto --</option>
            ${options}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="jumlah-crypto">Jumlah Koin</label>
          <input type="text" id="jumlah-crypto" class="form-input" placeholder="Contoh: 0.5" inputmode="decimal">
        </div>

        <div class="form-group">
          <span class="form-label">Harga per Koin</span>
          <div class="form-static-with-badge">
            <span id="harga-crypto-display">Pilih crypto dulu</span>
            <span class="badge-live" id="badge-crypto" style="display:none;">LIVE</span>
          </div>
        </div>

        <div class="calc-summary">
          <div class="summary-row highlight">
            <span>Total Nilai</span>
            <span id="total-crypto">Rp 0</span>
          </div>
          <div class="summary-row">
            <span>Nisab</span>
            <span>${formatRupiah(state.nisab)}</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formPertanian() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Nisab: 653 kg gabah / 520 kg beras</li>
            <li>Tadah hujan: 10%</li>
            <li>Irigasi berbayar: 5%</li>
            <li>Dikeluarkan saat panen (tanpa haul)</li>
          </ul>
        </div>

        <div class="form-group">
          <span class="form-label">Jenis Pengairan</span>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="pengairan" value="hujan" checked>
              <span>Tadah Hujan (10%)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="pengairan" value="irigasi">
              <span>Irigasi Berbayar (5%)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="hasil-panen">Hasil Panen (kg)</label>
          <input type="text" id="hasil-panen" class="form-input" placeholder="Contoh: 1000" inputmode="numeric">
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Hasil Panen</span>
            <span id="total-panen">0 kg</span>
          </div>
          <div class="summary-row">
            <span>Nisab</span>
            <span>653 kg</span>
          </div>
          <div class="summary-row">
            <span>Kadar Zakat</span>
            <span id="kadar-zakat">10%</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  function formPeternakan() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan:</strong>
          <ul>
            <li>Kambing/Domba: Nisab 40 ekor</li>
            <li>Sapi/Kerbau: Nisab 30 ekor</li>
            <li>Unta: Nisab 5 ekor</li>
            <li>Haul: 1 tahun</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="jenis-ternak">Jenis Ternak</label>
          <select id="jenis-ternak" class="form-select">
            <option value="">-- Pilih Jenis --</option>
            <option value="kambing">Kambing / Domba</option>
            <option value="sapi">Sapi / Kerbau</option>
            <option value="unta">Unta</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="jumlah-ternak">Jumlah Ternak (ekor)</label>
          <input type="text" id="jumlah-ternak" class="form-input" placeholder="Contoh: 50" inputmode="numeric">
        </div>

        <div class="calc-summary">
          <div class="summary-row">
            <span>Jumlah</span>
            <span id="total-ternak">0 ekor</span>
          </div>
          <div class="summary-row">
            <span>Nisab</span>
            <span id="nisab-ternak">-</span>
          </div>
        </div>

        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

  // ===== FORM INITIALIZATION =====
  function initForm(type) {
    console.log('Initializing form:', type);
    
    switch (type) {
      case 'emas': initFormEmas(); break;
      case 'penghasilan': initFormPenghasilan(); break;
      case 'tabungan': initFormTabungan(); break;
      case 'perdagangan': initFormPerdagangan(); break;
      case 'saham': initFormSaham(); break;
      case 'crypto': initFormCrypto(); break;
      case 'pertanian': initFormPertanian(); break;
      case 'peternakan': initFormPeternakan(); break;
    }
  }

  // ===== EMAS =====
  function initFormEmas() {
    const radioInputs = $$('input[name="jenis-logam"]');
    const beratInput = $('#berat-logam');
    const btnHitung = $('#btn-hitung');

    radioInputs.forEach(input => input.addEventListener('change', updateEmasDisplay));
    if (beratInput) {
      beratInput.addEventListener('input', function() {
        formatInputNumber(this);
        calcEmas();
      });
    }
    if (btnHitung) btnHitung.addEventListener('click', hitungEmas);
  }

  function updateEmasDisplay() {
    const jenis = document.querySelector('input[name="jenis-logam"]:checked')?.value;
    const harga = jenis === 'emas' ? state.hargaEmas : state.hargaPerak;
    const nisabGram = jenis === 'emas' ? CONFIG.NISAB_EMAS_GRAM : CONFIG.NISAB_PERAK_GRAM;
    
    const hargaDisplay = $('#harga-logam-display');
    const nisabDisplay = $('#nilai-nisab');
    
    if (hargaDisplay) hargaDisplay.textContent = formatRupiah(harga);
    if (nisabDisplay) nisabDisplay.textContent = `${nisabGram}g (${formatRupiah(nisabGram * harga)})`;
    calcEmas();
  }

  function calcEmas() {
    const jenis = document.querySelector('input[name="jenis-logam"]:checked')?.value;
    const berat = parseNumber($('#berat-logam')?.value);
    const harga = jenis === 'emas' ? state.hargaEmas : state.hargaPerak;
    const totalDisplay = $('#total-nilai');
    if (totalDisplay) totalDisplay.textContent = formatRupiah(berat * harga);
  }

  function hitungEmas() {
    const jenis = document.querySelector('input[name="jenis-logam"]:checked')?.value;
    const berat = parseNumber($('#berat-logam')?.value);
    
    if (berat <= 0) return alert('Masukkan berat logam yang valid');

    const harga = jenis === 'emas' ? state.hargaEmas : state.hargaPerak;
    const nisabGram = jenis === 'emas' ? CONFIG.NISAB_EMAS_GRAM : CONFIG.NISAB_PERAK_GRAM;
    const totalNilai = berat * harga;
    const nisabRupiah = nisabGram * harga;
    const wajib = totalNilai >= nisabRupiah;
    const zakat = wajib ? totalNilai * 0.025 : 0;
    const zakatGram = wajib ? berat * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: `Berat ${jenis}`, value: `${berat} gram` },
        { label: 'Harga/gram', value: formatRupiah(harga) },
        { label: 'Total nilai', value: formatRupiah(totalNilai) },
        { label: 'Nisab', value: `${nisabGram}g (${formatRupiah(nisabRupiah)})` }
      ],
      zakat: formatRupiah(zakat),
      zakatAlt: `atau ${zakatGram.toFixed(2)} gram ${jenis}`,
      kekurangan: wajib ? null : formatRupiah(nisabRupiah - totalNilai)
    });
  }

  // ===== PENGHASILAN =====
  function initFormPenghasilan() {
    const radioInputs = $$('input[name="periode"]');
    const inputs = ['#gaji', '#pendapatan-lain', '#kebutuhan-pokok', '#cicilan'];
    const btnHitung = $('#btn-hitung');

    radioInputs.forEach(input => input.addEventListener('change', updatePenghasilanNisab));
    inputs.forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('input', function() {
        formatInputRupiah(this);
        calcPenghasilan();
      });
    });
    if (btnHitung) btnHitung.addEventListener('click', hitungPenghasilan);
  }

  function updatePenghasilanNisab() {
    const periode = document.querySelector('input[name="periode"]:checked')?.value;
    const nisab = periode === 'bulanan' ? state.nisab / 12 : state.nisab;
    const nisabDisplay = $('#nilai-nisab');
    const labelPeriode = $('#label-periode');
    if (nisabDisplay) nisabDisplay.textContent = formatRupiah(nisab);
    if (labelPeriode) labelPeriode.textContent = periode === 'bulanan' ? '(bulanan)' : '(tahunan)';
  }

  function calcPenghasilan() {
    const gaji = parseRupiah($('#gaji')?.value);
    const lain = parseRupiah($('#pendapatan-lain')?.value);
    const pokok = parseRupiah($('#kebutuhan-pokok')?.value);
    const cicilan = parseRupiah($('#cicilan')?.value);
    const bersihDisplay = $('#pendapatan-bersih');
    if (bersihDisplay) bersihDisplay.textContent = formatRupiah((gaji + lain) - (pokok + cicilan));
  }

  function hitungPenghasilan() {
    const periode = document.querySelector('input[name="periode"]:checked')?.value;
    const gaji = parseRupiah($('#gaji')?.value);
    const lain = parseRupiah($('#pendapatan-lain')?.value);
    const pokok = parseRupiah($('#kebutuhan-pokok')?.value);
    const cicilan = parseRupiah($('#cicilan')?.value);
    const bersih = (gaji + lain) - (pokok + cicilan);

    if (bersih <= 0) return alert('Pendapatan bersih harus lebih dari 0');

    const nisab = periode === 'bulanan' ? state.nisab / 12 : state.nisab;
    const wajib = bersih >= nisab;
    const zakat = wajib ? bersih * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Pendapatan', value: formatRupiah(gaji + lain) },
        { label: 'Pengeluaran', value: formatRupiah(pokok + cicilan) },
        { label: 'Bersih', value: formatRupiah(bersih) },
        { label: 'Nisab', value: formatRupiah(nisab) }
      ],
      zakat: formatRupiah(zakat),
      zakatAlt: `per ${periode === 'bulanan' ? 'bulan' : 'tahun'}`,
      kekurangan: wajib ? null : formatRupiah(nisab - bersih)
    });
  }

  // ===== TABUNGAN =====
  function initFormTabungan() {
    const saldoInput = $('#saldo');
    const btnHitung = $('#btn-hitung');

    if (saldoInput) {
      saldoInput.addEventListener('input', function() {
        formatInputRupiah(this);
        const saldoDisplay = $('#total-saldo');
        if (saldoDisplay) saldoDisplay.textContent = formatRupiah(parseRupiah(this.value));
      });
    }
    if (btnHitung) btnHitung.addEventListener('click', hitungTabungan);
  }

  function hitungTabungan() {
    const saldo = parseRupiah($('#saldo')?.value);
    if (saldo <= 0) return alert('Masukkan saldo yang valid');

    const wajib = saldo >= state.nisab;
    const zakat = wajib ? saldo * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Saldo', value: formatRupiah(saldo) },
        { label: 'Nisab', value: formatRupiah(state.nisab) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - saldo)
    });
  }

  // ===== PERDAGANGAN =====
  function initFormPerdagangan() {
    const inputs = ['#modal', '#laba', '#piutang', '#hutang'];
    const btnHitung = $('#btn-hitung');

    inputs.forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('input', function() {
        formatInputRupiah(this);
        calcPerdagangan();
      });
    });
    if (btnHitung) btnHitung.addEventListener('click', hitungPerdagangan);
  }

  function calcPerdagangan() {
    const modal = parseRupiah($('#modal')?.value);
    const laba = parseRupiah($('#laba')?.value);
    const piutang = parseRupiah($('#piutang')?.value);
    const hutang = parseRupiah($('#hutang')?.value);
    
    const asetDisplay = $('#total-aset');
    const hutangDisplay = $('#total-hutang');
    const bersihDisplay = $('#harta-bersih');
    
    if (asetDisplay) asetDisplay.textContent = formatRupiah(modal + laba + piutang);
    if (hutangDisplay) hutangDisplay.textContent = formatRupiah(hutang);
    if (bersihDisplay) bersihDisplay.textContent = formatRupiah((modal + laba + piutang) - hutang);
  }

  function hitungPerdagangan() {
    const modal = parseRupiah($('#modal')?.value);
    const laba = parseRupiah($('#laba')?.value);
    const piutang = parseRupiah($('#piutang')?.value);
    const hutang = parseRupiah($('#hutang')?.value);
    const bersih = (modal + laba + piutang) - hutang;

    if (bersih <= 0) return alert('Harta bersih harus lebih dari 0');

    const wajib = bersih >= state.nisab;
    const zakat = wajib ? bersih * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Modal', value: formatRupiah(modal) },
        { label: 'Laba', value: formatRupiah(laba) },
        { label: 'Piutang', value: formatRupiah(piutang) },
        { label: 'Hutang', value: formatRupiah(hutang) },
        { label: 'Harta bersih', value: formatRupiah(bersih) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - bersih)
    });
  }

  // ===== SAHAM =====
  function initFormSaham() {
    const selectSaham = $('#pilih-saham');
    const lotInput = $('#jumlah-lot');
    const dividenInput = $('#dividen');
    const btnHitung = $('#btn-hitung');

    if (selectSaham) selectSaham.addEventListener('change', loadHargaSaham);
    if (lotInput) {
      lotInput.addEventListener('input', function() {
        formatInputNumber(this);
        calcSaham();
      });
    }
    if (dividenInput) {
      dividenInput.addEventListener('input', function() {
        formatInputRupiah(this);
        calcSaham();
      });
    }
    if (btnHitung) btnHitung.addEventListener('click', hitungSaham);
  }

  async function loadHargaSaham() {
    const code = $('#pilih-saham')?.value;
    const display = $('#harga-saham-display');
    const badge = $('#badge-saham');

    if (!code) {
      if (display) display.textContent = 'Pilih saham dulu';
      if (badge) badge.style.display = 'none';
      state.currentStockPrice = 0;
      return;
    }

    if (display) display.textContent = 'Memuat...';
    if (badge) badge.style.display = 'none';

    const price = await fetchStockPrice(code);
    
    if (price) {
      state.currentStockPrice = price;
      if (display) display.textContent = formatRupiah(price);
      if (badge) badge.style.display = 'inline';
    } else {
      if (display) display.textContent = 'Gagal memuat harga';
      state.currentStockPrice = 0;
    }
    
    calcSaham();
  }

  function calcSaham() {
    const lot = parseNumber($('#jumlah-lot')?.value);
    const dividen = parseRupiah($('#dividen')?.value);
    const nilaiSaham = lot * 100 * state.currentStockPrice;

    const sahamDisplay = $('#nilai-saham');
    const dividenDisplay = $('#nilai-dividen');
    const totalDisplay = $('#total-saham');

    if (sahamDisplay) sahamDisplay.textContent = formatRupiah(nilaiSaham);
    if (dividenDisplay) dividenDisplay.textContent = formatRupiah(dividen);
    if (totalDisplay) totalDisplay.textContent = formatRupiah(nilaiSaham + dividen);
  }

  function hitungSaham() {
    const code = $('#pilih-saham')?.value;
    const lot = parseNumber($('#jumlah-lot')?.value);
    const dividen = parseRupiah($('#dividen')?.value);

    if (!code) return alert('Pilih saham terlebih dahulu');
    if (lot <= 0) return alert('Masukkan jumlah lot yang valid');
    if (state.currentStockPrice <= 0) return alert('Harga saham belum tersedia');

    const lembar = lot * 100;
    const nilaiSaham = lembar * state.currentStockPrice;
    const total = nilaiSaham + dividen;
    const wajib = total >= state.nisab;
    const zakat = wajib ? total * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Saham', value: code },
        { label: 'Jumlah', value: `${lot} lot (${lembar} lembar)` },
        { label: 'Harga', value: formatRupiah(state.currentStockPrice) },
        { label: 'Nilai saham', value: formatRupiah(nilaiSaham) },
        { label: 'Dividen', value: formatRupiah(dividen) },
        { label: 'Total', value: formatRupiah(total) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - total)
    });
  }

  // ===== CRYPTO =====
  function initFormCrypto() {
    const selectCrypto = $('#pilih-crypto');
    const jumlahInput = $('#jumlah-crypto');
    const btnHitung = $('#btn-hitung');

    // Load crypto prices
    fetchCryptoPrices().then(prices => {
      state.cryptoPrices = prices;
      console.log('Crypto prices loaded:', Object.keys(prices).length);
    });

    if (selectCrypto) selectCrypto.addEventListener('change', updateHargaCrypto);
    if (jumlahInput) jumlahInput.addEventListener('input', calcCrypto);
    if (btnHitung) btnHitung.addEventListener('click', hitungCrypto);
  }

  function updateHargaCrypto() {
    const symbol = $('#pilih-crypto')?.value;
    const display = $('#harga-crypto-display');
    const badge = $('#badge-crypto');

    if (!symbol || !state.cryptoPrices[symbol]) {
      if (display) display.textContent = 'Pilih crypto dulu';
      if (badge) badge.style.display = 'none';
      return;
    }

    if (display) display.textContent = formatRupiah(state.cryptoPrices[symbol]);
    if (badge) badge.style.display = 'inline';
    calcCrypto();
  }

  function calcCrypto() {
    const symbol = $('#pilih-crypto')?.value;
    const jumlah = parseNumber($('#jumlah-crypto')?.value);
    const harga = state.cryptoPrices[symbol] || 0;
    const totalDisplay = $('#total-crypto');
    if (totalDisplay) totalDisplay.textContent = formatRupiah(jumlah * harga);
  }

  function hitungCrypto() {
    const symbol = $('#pilih-crypto')?.value;
    const jumlah = parseNumber($('#jumlah-crypto')?.value);

    if (!symbol) return alert('Pilih cryptocurrency terlebih dahulu');
    if (jumlah <= 0) return alert('Masukkan jumlah koin yang valid');

    const harga = state.cryptoPrices[symbol] || 0;
    if (harga <= 0) return alert('Harga crypto belum tersedia');

    const total = jumlah * harga;
    const wajib = total >= state.nisab;
    const zakat = wajib ? total * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Crypto', value: symbol },
        { label: 'Jumlah', value: `${jumlah} ${symbol}` },
        { label: 'Harga', value: formatRupiah(harga) },
        { label: 'Total nilai', value: formatRupiah(total) },
        { label: 'Nisab', value: formatRupiah(state.nisab) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - total)
    });
  }

  // ===== PERTANIAN =====
  function initFormPertanian() {
    const radioInputs = $$('input[name="pengairan"]');
    const panenInput = $('#hasil-panen');
    const btnHitung = $('#btn-hitung');

    radioInputs.forEach(input => {
      input.addEventListener('change', function() {
        const pengairan = document.querySelector('input[name="pengairan"]:checked')?.value;
        const kadarDisplay = $('#kadar-zakat');
        if (kadarDisplay) kadarDisplay.textContent = pengairan === 'hujan' ? '10%' : '5%';
      });
    });

    if (panenInput) {
      panenInput.addEventListener('input', function() {
        formatInputNumber(this);
        const panenDisplay = $('#total-panen');
        if (panenDisplay) panenDisplay.textContent = `${parseNumber(this.value)} kg`;
      });
    }

    if (btnHitung) btnHitung.addEventListener('click', hitungPertanian);
  }

  function hitungPertanian() {
    const pengairan = document.querySelector('input[name="pengairan"]:checked')?.value;
    const panen = parseNumber($('#hasil-panen')?.value);

    if (panen <= 0) return alert('Masukkan hasil panen yang valid');

    const kadar = pengairan === 'hujan' ? 0.10 : 0.05;
    const wajib = panen >= CONFIG.NISAB_PERTANIAN_KG;
    const zakat = wajib ? panen * kadar : 0;

    showHasil(wajib, {
      items: [
        { label: 'Hasil panen', value: `${panen} kg` },
        { label: 'Nisab', value: `${CONFIG.NISAB_PERTANIAN_KG} kg` },
        { label: 'Jenis pengairan', value: pengairan === 'hujan' ? 'Tadah hujan' : 'Irigasi berbayar' },
        { label: 'Kadar zakat', value: `${kadar * 100}%` }
      ],
      zakat: `${zakat.toFixed(1)} kg`,
      kekurangan: wajib ? null : `${CONFIG.NISAB_PERTANIAN_KG - panen} kg`
    });
  }

  // ===== PETERNAKAN =====
  function initFormPeternakan() {
    const selectTernak = $('#jenis-ternak');
    const jumlahInput = $('#jumlah-ternak');
    const btnHitung = $('#btn-hitung');

    if (selectTernak) {
      selectTernak.addEventListener('change', function() {
        const jenis = this.value;
        const nisabInfo = NISAB_TERNAK[jenis];
        const nisabDisplay = $('#nisab-ternak');
        if (nisabDisplay) nisabDisplay.textContent = nisabInfo ? nisabInfo.label : '-';
      });
    }

    if (jumlahInput) {
      jumlahInput.addEventListener('input', function() {
        formatInputNumber(this);
        const ternakDisplay = $('#total-ternak');
        if (ternakDisplay) ternakDisplay.textContent = `${parseNumber(this.value)} ekor`;
      });
    }

    if (btnHitung) btnHitung.addEventListener('click', hitungPeternakan);
  }

  function hitungPeternakan() {
    const jenis = $('#jenis-ternak')?.value;
    const jumlah = parseNumber($('#jumlah-ternak')?.value);

    if (!jenis) return alert('Pilih jenis ternak terlebih dahulu');
    if (jumlah <= 0) return alert('Masukkan jumlah ternak yang valid');

    const nisabInfo = NISAB_TERNAK[jenis];
    const wajib = jumlah >= nisabInfo.nisab;
    
    let zakatText = '-';
    if (wajib) {
      let table;
      if (jenis === 'kambing') table = ZAKAT_KAMBING;
      else if (jenis === 'sapi') table = ZAKAT_SAPI;
      else table = ZAKAT_UNTA;

      const row = table.find(r => jumlah >= r.min && jumlah <= r.max);
      if (row) {
        zakatText = row.zakat;
      } else {
        zakatText = `Lihat tabel zakat ${jenis} untuk jumlah > ${table[table.length - 1].max}`;
      }
    }

    showHasil(wajib, {
      items: [
        { label: 'Jenis ternak', value: jenis.charAt(0).toUpperCase() + jenis.slice(1) },
        { label: 'Jumlah', value: `${jumlah} ekor` },
        { label: 'Nisab', value: nisabInfo.label }
      ],
      zakat: zakatText,
      kekurangan: wajib ? null : `${nisabInfo.nisab - jumlah} ekor lagi`
    });
  }

  // ===== MOBILE NAV =====
  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const nav = $('#main-nav');
    
    if (toggle && nav) {
      toggle.addEventListener('click', function() {
        nav.classList.toggle('active');
      });
    }
  }

  // ===== INIT =====
  async function init() {
    console.log('🚀 Kalkulator Zakat - Memulai...');
    
    // Cache DOM elements
    modalEl = $('#calculator-modal');
    modalTitleEl = $('#modal-title');
    modalBodyEl = $('#modal-body');
    
    // Init mobile nav
    initMobileNav();
    
    // Setup modal close handlers
    const closeBtn = $('#close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCalculator);
    }

    // Close on backdrop click
    if (modalEl) {
      modalEl.addEventListener('click', function(e) {
        if (e.target === modalEl) {
          closeCalculator();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modalEl?.classList.contains('active')) {
        closeCalculator();
      }
    });

    // Setup zakat card click handlers
    const zakatCards = $$('.zakat-card');
    zakatCards.forEach(card => {
      card.addEventListener('click', function() {
        const type = this.dataset.type;
        if (type) {
          openCalculator(type);
        }
      });
    });
    
    // Fetch harga emas
    const result = await fetchHargaEmas();
    state.hargaEmas = result.price;
    state.hargaPerak = Math.round(result.price / 100);
    state.nisab = state.hargaEmas * CONFIG.NISAB_EMAS_GRAM;
    state.isLive = result.isLive;
    
    renderNisabBar();
    
    console.log('✅ Kalkulator Zakat - Siap!');
    console.log('State:', state);
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();