/* ========================================
   ZakatCalc — Kalkulator Page Script
   Updated: Zakat Pertanian & Peternakan
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
    PERSENTASE_ZAKAT: 2.5,
    FALLBACK: {
      emas: 1350000,
      perak: 13500
    }
  };

  // Data Crypto
  const CRYPTO_LIST = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'tether', symbol: 'USDT', name: 'Tether' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' }
  ];

  // Data Saham
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

  // Data Komoditas Pertanian (Fallback)
  const KOMODITAS_DEFAULT = [
    { id: 'padi', nama: 'Padi/Gabah', harga_per_kg: 6500, nisab_kg: 653, icon: '🌾' },
    { id: 'beras', nama: 'Beras', harga_per_kg: 14000, nisab_kg: 520, icon: '🍚' },
    { id: 'jagung', nama: 'Jagung', harga_per_kg: 5500, nisab_kg: 653, icon: '🌽' },
    { id: 'gandum', nama: 'Gandum', harga_per_kg: 8000, nisab_kg: 653, icon: '🌿'},
    { id: 'kedelai', nama: 'Kedelai', harga_per_kg: 12000, nisab_kg: 653, icon: '🫘' },
    { id: 'kacang_tanah', nama: 'Kacang Tanah', harga_per_kg: 28000, nisab_kg: 653, icon: '🥜' },
    { id: 'sagu', nama: 'Sagu', harga_per_kg: 15000, nisab_kg: 520, icon: '🥣 '} , 
    { id: 'ubi', nama: 'Ubi/Singkong', harga_per_kg: 4000, nisab_kg: 653, icon: '🍠'}
  ];

  // Nisab Peternakan
  const NISAB_TERNAK = {
    kambing: { nisab: 40, label: '40 ekor', nama: 'Kambing/Domba' },
    sapi: { nisab: 30, label: '30 ekor', nama: 'Sapi/Kerbau' },
    unta: { nisab: 5, label: '5 ekor', nama: 'Unta' }
  };

  // Tabel Zakat Kambing/Domba (Lengkap)
  const ZAKAT_KAMBING = [
    { min: 40, max: 120, jumlah: 1, desc: '1 ekor kambing betina umur 1 tahun (atau domba betina umur 2 tahun)' },
    { min: 121, max: 200, jumlah: 2, desc: '2 ekor kambing betina umur 1 tahun' },
    { min: 201, max: 300, jumlah: 3, desc: '3 ekor kambing betina umur 1 tahun' },
    { min: 301, max: 400, jumlah: 4, desc: '4 ekor kambing betina umur 1 tahun' },
    { min: 401, max: 500, jumlah: 5, desc: '5 ekor kambing betina umur 1 tahun' }
    // Setiap bertambah 100 ekor, zakat bertambah 1 ekor kambing
  ];

  // Tabel Zakat Sapi/Kerbau (Lengkap hingga 120+)
  const ZAKAT_SAPI = [
    { min: 30, max: 39, tabi: 1, musinnah: 0, desc: "1 ekor tabi' (sapi jantan/betina umur 1 tahun)" },
    { min: 40, max: 59, tabi: 0, musinnah: 1, desc: "1 ekor musinnah (sapi betina umur 2 tahun)" },
    { min: 60, max: 69, tabi: 2, musinnah: 0, desc: "2 ekor tabi' (sapi umur 1 tahun)" },
    { min: 70, max: 79, tabi: 1, musinnah: 1, desc: "1 ekor tabi' + 1 ekor musinnah" },
    { min: 80, max: 89, tabi: 0, musinnah: 2, desc: "2 ekor musinnah (sapi betina umur 2 tahun)" },
    { min: 90, max: 99, tabi: 3, musinnah: 0, desc: "3 ekor tabi'" },
    { min: 100, max: 109, tabi: 1, musinnah: 2, desc: "1 ekor tabi' + 2 ekor musinnah" },
    { min: 110, max: 119, tabi: 2, musinnah: 1, desc: "2 ekor tabi' + 1 ekor musinnah" }
    // 120+ dihitung dengan rumus: setiap 30 ekor = 1 tabi', setiap 40 ekor = 1 musinnah
  ];

  // Tabel Zakat Unta (Lengkap)
  const ZAKAT_UNTA = [
    { min: 5, max: 9, desc: '1 ekor kambing/domba' },
    { min: 10, max: 14, desc: '2 ekor kambing/domba' },
    { min: 15, max: 19, desc: '3 ekor kambing/domba' },
    { min: 20, max: 24, desc: '4 ekor kambing/domba' },
    { min: 25, max: 35, desc: '1 ekor bintu makhad (unta betina umur 1 tahun)' },
    { min: 36, max: 45, desc: '1 ekor bintu labun (unta betina umur 2 tahun)' },
    { min: 46, max: 60, desc: '1 ekor hiqqah (unta betina umur 3 tahun)' },
    { min: 61, max: 75, desc: "1 ekor jadz'ah (unta betina umur 4 tahun)" },
    { min: 76, max: 90, desc: '2 ekor bintu labun (unta betina umur 2 tahun)' },
    { min: 91, max: 120, desc: '2 ekor hiqqah (unta betina umur 3 tahun)' }
    // 121+ dihitung dengan rumus kombinasi
  ];

  // ===== STATE =====
  const state = {
    hargaEmas: 0,
    hargaPerak: 0,
    nisab: 0,
    cryptoPrices: {},
    currentStockPrice: 0,
    currentType: null,
    isLive: false,
    komoditasList: [],
    selectedKomoditas: null
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

  function formatAngka(angka) {
    if (!angka || isNaN(angka)) return '0';
    if (Number.isInteger(angka)) {
      return angka.toLocaleString('id-ID');
    }
    const rounded = Math.round(angka * 100) / 100;
    if (Number.isInteger(rounded)) {
      return rounded.toLocaleString('id-ID');
    }
    return rounded.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
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

  async function fetchKomoditasPrices() {
    try {
      const response = await fetch(
        `${CONFIG.SUPABASE_URL}/rest/v1/harga_komoditas?order=id.asc`,
        {
          headers: {
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.ok) throw new Error('Supabase Error');

      const data = await response.json();
      if (data && data.length > 0) {
        state.komoditasList = data;
        console.log(`✅ Loaded ${data.length} komoditas from database`);
        return data;
      }
      throw new Error('No data');
    } catch (error) {
      console.warn('⚠️ Komoditas fetch error:', error.message, '- using fallback');
      state.komoditasList = KOMODITAS_DEFAULT;
      return KOMODITAS_DEFAULT;
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
    
    setTimeout(() => initForm(type), 10);
  }

  function closeCalculator() {
    if (!modalEl) return;
    
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.currentType = null;
    state.currentStockPrice = 0;
    state.selectedKomoditas = null;
  }

  // ===== SHOW HASIL =====
  function showHasil(wajib, data) {
    const container = $('#hasil-zakat');
    if (!container) return;

    let itemsHTML = data.items.map(item => 
      `<div class="result-row"><span>${item.label}</span><span>${item.value}</span></div>`
    ).join('');

    let extraInfoHTML = '';
    if (data.extraInfo) {
      extraInfoHTML = `<div class="result-extra-info">${data.extraInfo}</div>`;
    }

    if (wajib) {
      container.innerHTML = `
        <div class="result-card success">
          <div class="result-header">
            <span class="result-icon">✓</span>
            <h4>Wajib Zakat</h4>
          </div>
          <div class="result-amount">${data.zakat}</div>
          ${data.zakatAlt ? `<p class="result-alt">${data.zakatAlt}</p>` : ''}
          ${extraInfoHTML}
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

    // ===== FORM PERTANIAN (FIXED) =====
  function formPertanian() {
    // Pastikan komoditas ada, jika belum pakai fallback
    if (state.komoditasList.length === 0) {
      state.komoditasList = KOMODITAS_DEFAULT;
    }

    const komoditasOptions = state.komoditasList.map(k => 
      `<option value="${k.id}">${k.icon || '🌾'} ${k.nama}</option>`
    ).join('');

    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan Zakat Pertanian:</strong>
          <ul>
            <li>Nisab: 5 wasaq ≈ <strong>653 kg gabah</strong> atau <strong>520 kg beras</strong></li>
            <li>Tadah hujan/sungai/mata air: <strong>10%</strong></li>
            <li>Irigasi berbayar (pompa/diesel): <strong>5%</strong></li>
            <li>Dikeluarkan <strong>saat panen</strong> (tanpa menunggu haul)</li>
          </ul>
        </div>
        <div class="form-group">
          <label class="form-label" for="pilih-komoditas">Jenis Hasil Pertanian</label>
          <select id="pilih-komoditas" class="form-select">
            <option value="">-- Pilih Jenis Hasil Panen --</option>
            ${komoditasOptions}
          </select>
        </div>
        <div class="form-group" id="komoditas-info-group" style="display: none;">
          <div class="komoditas-info-card">
            <div class="komoditas-info-header">
              <span class="komoditas-icon" id="komoditas-icon">🌾</span>
              <div class="komoditas-info-text">
                <span class="komoditas-nama" id="komoditas-nama">-</span>
              </div>
            </div>
            <div class="komoditas-info-details">
              <div class="komoditas-detail-item">
                <span class="detail-label">Harga/kg</span>
                <span class="detail-value" id="komoditas-harga">Rp 0</span>
              </div>
              <div class="komoditas-detail-item">
                <span class="detail-label">Nisab</span>
                <span class="detail-value" id="komoditas-nisab">0 kg</span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <span class="form-label">Jenis Pengairan</span>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="pengairan" value="hujan" checked>
              <span>🌧️ Tadah Hujan (10%)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="pengairan" value="irigasi">
              <span>💧 Irigasi Berbayar (5%)</span>
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
            <span id="nilai-nisab-pertanian">653 kg</span>
          </div>
          <div class="summary-row">
            <span>Kadar Zakat</span>
            <span id="kadar-zakat">10%</span>
          </div>
          <div class="summary-row highlight">
            <span>Estimasi Nilai Panen</span>
            <span id="estimasi-nilai">Rp 0</span>
          </div>
        </div>
        <button type="button" class="btn-calculate" id="btn-hitung">Hitung Zakat</button>
        <div id="hasil-zakat"></div>
      </div>
    `;
  }

    // ===== FORM PETERNAKAN (FIXED) =====
  function formPeternakan() {
    return `
      <div class="calc-form">
        <div class="info-box">
          <strong>Ketentuan Zakat Peternakan:</strong>
          <ul>
            <li><strong>Kambing/Domba:</strong> Nisab 40 ekor</li>
            <li><strong>Sapi/Kerbau:</strong> Nisab 30 ekor</li>
            <li><strong>Unta:</strong> Nisab 5 ekor</li>
            <li>Haul: 1 tahun</li>
            <li>Syarat: digembalakan (saimah), bukan untuk diperdagangkan</li>
          </ul>
        </div>
        <div class="form-group">
          <label class="form-label" for="jenis-ternak">Jenis Ternak</label>
          <select id="jenis-ternak" class="form-select">
            <option value="">-- Pilih Jenis Ternak --</option>
            <option value="kambing">🐐 Kambing / Domba</option>
            <option value="sapi">🐄 Sapi / Kerbau</option>
            <option value="unta">🐪 Unta</option>
          </select>
        </div>
        <div class="form-group" id="ternak-info-group" style="display: none;">
          <div class="ternak-info-card">
            <div class="ternak-info-title" id="ternak-info-title">📋 Tabel Zakat</div>
            <div class="ternak-info-content" id="ternak-info-content"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="jumlah-ternak">Jumlah Ternak (ekor)</label>
          <input type="text" id="jumlah-ternak" class="form-input" placeholder="Contoh: 50" inputmode="numeric">
        </div>
        <div class="calc-summary">
          <div class="summary-row">
            <span>Jumlah Ternak</span>
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

  // ===== EMAS FUNCTIONS =====
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
        { label: `Berat ${jenis}`, value: `${formatAngka(berat)} gram` },
        { label: 'Harga/gram', value: formatRupiah(harga) },
        { label: 'Total nilai', value: formatRupiah(totalNilai) },
        { label: 'Nisab', value: `${nisabGram}g (${formatRupiah(nisabRupiah)})` }
      ],
      zakat: formatRupiah(zakat),
      zakatAlt: `atau ${formatAngka(zakatGram)} gram ${jenis}`,
      kekurangan: wajib ? null : formatRupiah(nisabRupiah - totalNilai)
    });
  }

  // ===== PENGHASILAN FUNCTIONS =====
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

  // ===== TABUNGAN FUNCTIONS =====
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

  // ===== PERDAGANGAN FUNCTIONS =====
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

  // ===== SAHAM FUNCTIONS =====
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
        { label: 'Jumlah', value: `${formatAngka(lot)} lot (${formatAngka(lembar)} lembar)` },
        { label: 'Harga', value: formatRupiah(state.currentStockPrice) },
        { label: 'Nilai saham', value: formatRupiah(nilaiSaham) },
        { label: 'Dividen', value: formatRupiah(dividen) },
        { label: 'Total', value: formatRupiah(total) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - total)
    });
  }

  // ===== CRYPTO FUNCTIONS =====
  function initFormCrypto() {
    const selectCrypto = $('#pilih-crypto');
    const jumlahInput = $('#jumlah-crypto');
    const btnHitung = $('#btn-hitung');

    fetchCryptoPrices().then(prices => {
      state.cryptoPrices = prices;
      console.log('✅ Crypto prices loaded:', Object.keys(prices).length);
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

    const total = jumlah
        total = jumlah * harga;
    const wajib = total >= state.nisab;
    const zakat = wajib ? total * 0.025 : 0;

    showHasil(wajib, {
      items: [
        { label: 'Crypto', value: symbol },
        { label: 'Jumlah', value: `${formatAngka(jumlah)} ${symbol}` },
        { label: 'Harga', value: formatRupiah(harga) },
        { label: 'Total nilai', value: formatRupiah(total) },
        { label: 'Nisab', value: formatRupiah(state.nisab) }
      ],
      zakat: formatRupiah(zakat),
      kekurangan: wajib ? null : formatRupiah(state.nisab - total)
    });
  }

  // ===== PERTANIAN FUNCTIONS (UPDATED) =====
  function initFormPertanian() {
    const selectKomoditas = $('#pilih-komoditas');
    const radioInputs = $$('input[name="pengairan"]');
    const panenInput = $('#hasil-panen');
    const btnHitung = $('#btn-hitung');

    if (selectKomoditas) {
      selectKomoditas.addEventListener('change', updateKomoditasInfo);
    }

    radioInputs.forEach(input => {
      input.addEventListener('change', function() {
        const pengairan = document.querySelector('input[name="pengairan"]:checked')?.value;
        const kadarDisplay = $('#kadar-zakat');
        if (kadarDisplay) kadarDisplay.textContent = pengairan === 'hujan' ? '10%' : '5%';
        calcPertanian();
      });
    });

    if (panenInput) {
      panenInput.addEventListener('input', function() {
        formatInputNumber(this);
        calcPertanian();
      });
    }

    if (btnHitung) btnHitung.addEventListener('click', hitungPertanian);
  }

  function updateKomoditasInfo() {
    const komoditasId = $('#pilih-komoditas')?.value;
    const infoGroup = $('#komoditas-info-group');

    if (!komoditasId) {
      if (infoGroup) infoGroup.style.display = 'none';
      state.selectedKomoditas = null;
      return;
    }

    const komoditas = state.komoditasList.find(k => k.id === komoditasId);
    if (!komoditas) return;

    state.selectedKomoditas = komoditas;

    // Update UI
    const iconEl = $('#komoditas-icon');
    const namaEl = $('#komoditas-nama');
    const ketEl = $('#komoditas-ket');
    const hargaEl = $('#komoditas-harga');
    const nisabEl = $('#komoditas-nisab');
    const nisabPertanianEl = $('#nilai-nisab-pertanian');

    if (iconEl) iconEl.textContent = komoditas.icon || '🌾';
    if (namaEl) namaEl.textContent = komoditas.nama;
    if (ketEl) ketEl.textContent = komoditas.keterangan || '';
    if (hargaEl) hargaEl.textContent = formatRupiah(komoditas.harga_per_kg);
    if (nisabEl) nisabEl.textContent = `${formatAngka(komoditas.nisab_kg)} kg`;
    if (nisabPertanianEl) nisabPertanianEl.textContent = `${formatAngka(komoditas.nisab_kg)} kg`;

    if (infoGroup) infoGroup.style.display = 'block';

    calcPertanian();
  }

  function calcPertanian() {
    const panen = parseNumber($('#hasil-panen')?.value);
    const panenDisplay = $('#total-panen');
    const estimasiDisplay = $('#estimasi-nilai');

    if (panenDisplay) panenDisplay.textContent = `${formatAngka(panen)} kg`;

    if (state.selectedKomoditas && panen > 0) {
      const estimasi = panen * state.selectedKomoditas.harga_per_kg;
      if (estimasiDisplay) estimasiDisplay.textContent = formatRupiah(estimasi);
    } else {
      if (estimasiDisplay) estimasiDisplay.textContent = 'Rp 0';
    }
  }

  function hitungPertanian() {
    const komoditasId = $('#pilih-komoditas')?.value;
    const pengairan = document.querySelector('input[name="pengairan"]:checked')?.value;
    const panen = parseNumber($('#hasil-panen')?.value);

    if (!komoditasId) return alert('Pilih jenis hasil pertanian terlebih dahulu');
    if (panen <= 0) return alert('Masukkan hasil panen yang valid');

    const komoditas = state.komoditasList.find(k => k.id === komoditasId);
    if (!komoditas) return alert('Data komoditas tidak ditemukan');

    const kadar = pengairan === 'hujan' ? 0.10 : 0.05;
    const nisab = komoditas.nisab_kg;
    const wajib = panen >= nisab;
    const zakatKg = wajib ? panen * kadar : 0;
    const nilaiPanen = panen * komoditas.harga_per_kg;
    const zakatRupiah = wajib ? zakatKg * komoditas.harga_per_kg : 0;

    showHasil(wajib, {
      items: [
        { label: 'Jenis', value: `${komoditas.icon} ${komoditas.nama}` },
        { label: 'Hasil panen', value: `${formatAngka(panen)} kg` },
        { label: 'Harga/kg', value: formatRupiah(komoditas.harga_per_kg) },
        { label: 'Nilai panen', value: formatRupiah(nilaiPanen) },
        { label: 'Nisab', value: `${formatAngka(nisab)} kg` },
        { label: 'Jenis pengairan', value: pengairan === 'hujan' ? 'Tadah hujan (10%)' : 'Irigasi berbayar (5%)' }
      ],
      zakat: `${formatAngka(zakatKg)} kg`,
      zakatAlt: `atau ${formatRupiah(zakatRupiah)}`,
      kekurangan: wajib ? null : `${formatAngka(nisab - panen)} kg lagi`
    });
  }

  // ===== PETERNAKAN FUNCTIONS (UPDATED) =====
  function initFormPeternakan() {
    const selectTernak = $('#jenis-ternak');
    const jumlahInput = $('#jumlah-ternak');
    const btnHitung = $('#btn-hitung');

    if (selectTernak) {
      selectTernak.addEventListener('change', updateTernakInfo);
    }

    if (jumlahInput) {
      jumlahInput.addEventListener('input', function() {
        formatInputNumber(this);
        const ternakDisplay = $('#total-ternak');
        if (ternakDisplay) ternakDisplay.textContent = `${formatAngka(parseNumber(this.value))} ekor`;
      });
    }

    if (btnHitung) btnHitung.addEventListener('click', hitungPeternakan);
  }

  function updateTernakInfo() {
    const jenis = $('#jenis-ternak')?.value;
    const infoGroup = $('#ternak-info-group');
    const nisabDisplay = $('#nisab-ternak');
    const infoContent = $('#ternak-info-content');

    if (!jenis) {
      if (infoGroup) infoGroup.style.display = 'none';
      if (nisabDisplay) nisabDisplay.textContent = '-';
      return;
    }

    const nisabInfo = NISAB_TERNAK[jenis];
    if (nisabDisplay) nisabDisplay.textContent = nisabInfo.label;

    // Render tabel zakat
    let tabelHTML = '';
    if (jenis === 'kambing') {
      tabelHTML = `
        <div class="ternak-table">
          <div class="ternak-table-row">
            <span class="ternak-range">40-120 ekor</span>
            <span class="ternak-zakat">1 ekor kambing betina (umur 1 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">121-200 ekor</span>
            <span class="ternak-zakat">2 ekor kambing betina</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">201-300 ekor</span>
            <span class="ternak-zakat">3 ekor kambing betina</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">301-400 ekor</span>
            <span class="ternak-zakat">4 ekor kambing betina</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">401-500 ekor</span>
            <span class="ternak-zakat">5 ekor kambing betina</span>
          </div>
          <div class="ternak-table-note">
            <strong>Catatan:</strong> Setiap bertambah 100 ekor, zakat bertambah 1 ekor kambing betina umur 1 tahun.
          </div>
        </div>
      `;
    } else if (jenis === 'sapi') {
      tabelHTML = `
        <div class="ternak-table">
          <div class="ternak-table-row">
            <span class="ternak-range">30-39 ekor</span>
            <span class="ternak-zakat">1 ekor tabi' (sapi umur 1 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">40-59 ekor</span>
            <span class="ternak-zakat">1 ekor musinnah (sapi betina umur 2 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">60-69 ekor</span>
            <span class="ternak-zakat">2 ekor tabi'</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">70-79 ekor</span>
            <span class="ternak-zakat">1 tabi' + 1 musinnah</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">80-89 ekor</span>
            <span class="ternak-zakat">2 ekor musinnah</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">90-99 ekor</span>
            <span class="ternak-zakat">3 ekor tabi'</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">100-109 ekor</span>
            <span class="ternak-zakat">1 tabi' + 2 musinnah</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">110-119 ekor</span>
            <span class="ternak-zakat">2 tabi' + 1 musinnah</span>
          </div>
          <div class="ternak-table-note">
            <strong>Catatan untuk 120+ ekor:</strong> Setiap 30 ekor = 1 tabi', setiap 40 ekor = 1 musinnah. Kombinasi yang paling optimal dipilih.
          </div>
        </div>
      `;
    } else if (jenis === 'unta') {
      tabelHTML = `
        <div class="ternak-table">
          <div class="ternak-table-row">
            <span class="ternak-range">5-9 ekor</span>
            <span class="ternak-zakat">1 ekor kambing/domba</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">10-14 ekor</span>
            <span class="ternak-zakat">2 ekor kambing/domba</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">15-19 ekor</span>
            <span class="ternak-zakat">3 ekor kambing/domba</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">20-24 ekor</span>
            <span class="ternak-zakat">4 ekor kambing/domba</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">25-35 ekor</span>
            <span class="ternak-zakat">1 bintu makhad (unta betina 1 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">36-45 ekor</span>
            <span class="ternak-zakat">1 bintu labun (unta betina 2 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">46-60 ekor</span>
            <span class="ternak-zakat">1 hiqqah (unta betina 3 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">61-75 ekor</span>
            <span class="ternak-zakat">1 jadz'ah (unta betina 4 thn)</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">76-90 ekor</span>
            <span class="ternak-zakat">2 bintu labun</span>
          </div>
          <div class="ternak-table-row">
            <span class="ternak-range">91-120 ekor</span>
            <span class="ternak-zakat">2 hiqqah</span>
          </div>
        </div>
      `;
    }

    if (infoContent) infoContent.innerHTML = tabelHTML;
    if (infoGroup) infoGroup.style.display = 'block';
  }

  function hitungPeternakan() {
    const jenis = $('#jenis-ternak')?.value;
    const jumlah = Math.floor(parseNumber($('#jumlah-ternak')?.value));

    if (!jenis) return alert('Pilih jenis ternak terlebih dahulu');
    if (jumlah <= 0) return alert('Masukkan jumlah ternak yang valid');

    const nisabInfo = NISAB_TERNAK[jenis];
    const wajib = jumlah >= nisabInfo.nisab;

    let zakatText = '-';
    let penjelasan = '';

    if (wajib) {
      if (jenis === 'kambing') {
        const result = hitungZakatKambing(jumlah);
        zakatText = result.text;
        penjelasan = result.detail;
      } else if (jenis === 'sapi') {
        const result = hitungZakatSapi(jumlah);
        zakatText = result.text;
        penjelasan = result.detail;
      } else if (jenis === 'unta') {
        const result = hitungZakatUnta(jumlah);
        zakatText = result.text;
        penjelasan = result.detail;
      }
    }

    const extraInfo = penjelasan ? `<div class="result-explanation">${penjelasan}</div>` : '';

    showHasil(wajib, {
      items: [
        { label: 'Jenis ternak', value: nisabInfo.nama },
        { label: 'Jumlah', value: `${formatAngka(jumlah)} ekor` },
        { label: 'Nisab', value: nisabInfo.label }
      ],
      zakat: zakatText,
      extraInfo: extraInfo,
      kekurangan: wajib ? null : `${nisabInfo.nisab - jumlah} ekor lagi`
    });
  }

  // Fungsi hitung zakat kambing (untuk 500+ ekor)
  function hitungZakatKambing(jumlah) {
    // Cari di tabel dulu
    const row = ZAKAT_KAMBING.find(r => jumlah >= r.min && jumlah <= r.max);
    if (row) {
      return {
        text: `${row.jumlah} ekor kambing`,
        detail: row.desc
      };
    }

    // Untuk > 500 ekor: setiap 100 ekor = 1 kambing
    const zakatCount = Math.floor(jumlah / 100);
    return {
      text: `${zakatCount} ekor kambing`,
      detail: `${zakatCount} ekor kambing betina umur 1 tahun (atau domba betina umur 2 tahun). Dihitung dari ${formatAngka(jumlah)} ÷ 100 = ${zakatCount} ekor.`
    };
  }

  // Fungsi hitung zakat sapi (untuk 120+ ekor)
  function hitungZakatSapi(jumlah) {
    // Cari di tabel dulu
    const row = ZAKAT_SAPI.find(r => jumlah >= r.min && jumlah <= r.max);
    if (row) {
      return {
        text: row.desc,
        detail: `Berdasarkan tabel zakat sapi untuk ${formatAngka(jumlah)} ekor.`
      };
    }

    // Untuk >= 120 ekor: kombinasi optimal dari kelipatan 30 (tabi') dan 40 (musinnah)
    let bestTabi = 0;
    let bestMusinnah = 0;
    let minRemainder = jumlah;

    // Coba berbagai kombinasi
    for (let musinnah = 0; musinnah <= Math.floor(jumlah / 40); musinnah++) {
      const sisaSetelahMusinnah = jumlah - (musinnah * 40);
      if (sisaSetelahMusinnah >= 0 && sisaSetelahMusinnah % 30 === 0) {
        const tabi = sisaSetelahMusinnah / 30;
        const remainder = 0;
        if (remainder < minRemainder) {
          minRemainder = remainder;
          bestTabi = tabi;
          bestMusinnah = musinnah;
        }
      }
    }

    // Jika tidak ada kombinasi sempurna, hitung dengan sisa
    if (minRemainder > 0) {
      bestMusinnah = Math.floor(jumlah / 40);
      const sisa = jumlah - (bestMusinnah * 40);
      bestTabi = Math.floor(sisa / 30);
    }

    let text = '';
    if (bestTabi > 0 && bestMusinnah > 0) {
      text = `${bestTabi} ekor tabi' + ${bestMusinnah} ekor musinnah`;
    } else if (bestTabi > 0) {
      text = `${bestTabi} ekor tabi'`;
    } else if (bestMusinnah > 0) {
      text = `${bestMusinnah} ekor musinnah`;
    }

    const detail = `Untuk ${formatAngka(jumlah)} ekor sapi: ${text}. <br><small>Tabi' = sapi umur 1 tahun. Musinnah = sapi betina umur 2 tahun.</small>`;

    return { text, detail };
  }

  // Fungsi hitung zakat unta
  function hitungZakatUnta(jumlah) {
    const row = ZAKAT_UNTA.find(r => jumlah >= r.min && jumlah <= r.max);
    if (row) {
      return {
        text: row.desc,
        detail: `Berdasarkan tabel zakat unta untuk ${formatAngka(jumlah)} ekor.`
      };
    }

    // Untuk > 120 ekor
    return {
      text: `Perhitungan khusus diperlukan`,
      detail: `Untuk ${formatAngka(jumlah)} ekor unta (>120), diperlukan perhitungan dengan kombinasi hiqqah dan jadz'ah. Silakan konsultasi dengan ulama setempat.`
    };
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
    state.hargaPerak = Math.round(result.price / 80); // Fix rasio 1:80
    state.nisab = state.hargaEmas * CONFIG.NISAB_EMAS_GRAM;
    state.isLive = result.isLive;

    // Fetch komoditas pertanian
    await fetchKomoditasPrices();

    renderNisabBar();

    console.log('✅ Kalkulator Zakat - Siap!');
    console.log('📊 State:', {
      hargaEmas: formatRupiah(state.hargaEmas),
      hargaPerak: formatRupiah(state.hargaPerak),
      nisab: formatRupiah(state.nisab),
      komoditasCount: state.komoditasList.length,
      isLive: state.isLive
    });
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();