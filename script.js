/* ========================================
   ZakatCalc — Landing Page Script
   ======================================== */

// ===== KONFIGURASI =====
const CONFIG = {
  SUPABASE_URL: 'https://ynsyiesajoggykqybqsn.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ',
  GOLDAPI_KEY: 'goldapi-13qujjslsmkjctt1w-io',
  KURS_USD_IDR: 16200,
  NISAB_GRAM: 85,
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
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' }
];

// Data Saham Indonesia
const STOCK_LIST = [
  { code: 'BBCA', name: 'Bank BCA' },
  { code: 'BBRI', name: 'Bank BRI' },
  { code: 'BMRI', name: 'Bank Mandiri' },
  { code: 'TLKM', name: 'Telkom' },
  { code: 'ASII', name: 'Astra' }
];

// ===== STATE =====
let state = {
  hargaEmas: 0,
  hargaPerak: 0,
  cryptoPrices: {},
  stockPrices: {},
  isLoaded: false
};

// ===== UTILITY FUNCTIONS =====
function formatRupiah(angka) {
  if (!angka || isNaN(angka)) return 'Rp 0';
  return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ===== DOM HELPERS =====
function $(selector) {
  return document.querySelector(selector);
}

// ===== FETCH HARGA EMAS =====
async function fetchHargaEmas() {
  console.log('📊 Mengambil harga emas...');
  
  try {
    const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
      method: 'GET',
      headers: {
        'x-access-token': CONFIG.GOLDAPI_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    let pricePerGram = data.price_gram_24k;
    if (!pricePerGram && data.price) {
      pricePerGram = data.price / 31.1035;
    }
    
    if (pricePerGram && !isNaN(pricePerGram)) {
      const hargaIDR = Math.round(pricePerGram * CONFIG.KURS_USD_IDR);
      console.log(`✅ Harga emas dari API: ${formatRupiah(hargaIDR)}/gram`);
      return { price: hargaIDR, isLive: true };
    }
    
    throw new Error('Data tidak valid');
    
  } catch (error) {
    console.warn('⚠️ GoldAPI gagal:', error.message);
    console.log(`📌 Menggunakan harga fallback: ${formatRupiah(CONFIG.FALLBACK.emas)}`);
    return { price: CONFIG.FALLBACK.emas, isLive: false };
  }
}

// ===== FETCH HARGA CRYPTO =====
async function fetchHargaCrypto() {
  console.log('🪙 Mengambil harga cryptocurrency...');
  
  try {
    const ids = CRYPTO_LIST.map(c => c.id).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const prices = {};

    CRYPTO_LIST.forEach(crypto => {
      if (data[crypto.id]?.idr) {
        prices[crypto.symbol] = {
          price: data[crypto.id].idr,
          name: crypto.name
        };
      }
    });

    console.log('✅ Harga crypto berhasil diambil:', Object.keys(prices).length, 'koin');
    return prices;

  } catch (error) {
    console.warn('⚠️ CoinGecko API gagal:', error.message);
    return {};
  }
}

// ===== FETCH HARGA SAHAM (EDGE FUNCTION) =====
async function fetchHargaSaham(stockCode) {
  console.log(`📈 Mengambil harga saham ${stockCode}...`);
  
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (data && data.price && typeof data.price === 'number' && data.price > 0) {
      console.log(`✅ Harga ${stockCode}: ${formatRupiah(data.price)}`);
      return { price: data.price, isLive: true };
    }
    
    throw new Error('Data harga tidak valid');

  } catch (error) {
    console.warn(`⚠️ Gagal mengambil harga ${stockCode}:`, error.message);
    return { price: null, isLive: false, error: error.message };
  }
}

async function fetchAllStockPrices() {
  console.log('📈 Mengambil semua harga saham IDX...');
  
  const prices = {};
  
  // Fetch semua saham secara paralel
  const results = await Promise.all(
    STOCK_LIST.map(async (stock) => {
      const result = await fetchHargaSaham(stock.code);
      return { code: stock.code, ...result };
    })
  );
  
  results.forEach(result => {
    if (result.price) {
      prices[result.code] = {
        price: result.price,
        isLive: result.isLive
      };
    }
  });
  
  const successCount = Object.keys(prices).length;
  console.log(`✅ Berhasil mengambil ${successCount}/${STOCK_LIST.length} harga saham`);
  
  return prices;
}

// ===== RENDER FUNCTIONS =====
function renderNisabCard(hargaEmas, isLive = true) {
  const nisab = hargaEmas * CONFIG.NISAB_GRAM;
  
  const nisabEl = $('#nisab-rupiah');
  if (nisabEl) {
    nisabEl.textContent = formatRupiah(nisab);
    nisabEl.classList.add('loaded');
  }
  
  const emasEl = $('#harga-emas');
  if (emasEl) {
    emasEl.textContent = formatRupiah(hargaEmas);
  }
  
  const updateEl = $('#tanggal-update');
  if (updateEl) {
    const now = new Date();
    updateEl.textContent = `${formatDate(now)}, ${formatTime(now)}`;
  }
  
  const liveEl = $('#live-status');
  if (liveEl) {
    if (!isLive) {
      liveEl.classList.add('offline');
      const liveText = liveEl.querySelector('.live-text');
      if (liveText) liveText.textContent = 'CACHE';
    } else {
      liveEl.classList.remove('offline');
      const liveText = liveEl.querySelector('.live-text');
      if (liveText) liveText.textContent = 'LIVE';
    }
  }
}

function renderMetalCards(hargaEmas, hargaPerak) {
  const emasDisplay = $('#display-emas');
  const perakDisplay = $('#display-perak');
  
  if (emasDisplay) {
    emasDisplay.textContent = formatRupiah(hargaEmas);
    emasDisplay.classList.remove('loading');
  }
  
  if (perakDisplay) {
    perakDisplay.textContent = formatRupiah(hargaPerak);
    perakDisplay.classList.remove('loading');
  }
}

function renderCryptoGrid(prices) {
  const grid = $('#crypto-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (Object.keys(prices).length === 0) {
    grid.innerHTML = `
      <div class="price-card error-card">
        <p>Gagal memuat harga crypto</p>
        <button onclick="init()" class="retry-btn">Coba Lagi</button>
      </div>
    `;
    return;
  }
  
  CRYPTO_LIST.forEach(crypto => {
    const data = prices[crypto.symbol];
    if (!data) return;
    
    const card = document.createElement('div');
    card.className = 'price-card';
    card.innerHTML = `
      <div class="price-card-header">
        <div class="price-icon crypto">${crypto.symbol.charAt(0)}</div>
        <div class="price-info">
          <span class="price-name">${crypto.name}</span>
          <span class="price-unit">${crypto.symbol}</span>
        </div>
      </div>
      <div class="price-value">${formatRupiah(data.price)}</div>
    `;
    grid.appendChild(card);
  });
}

function renderStockGrid(prices) {
  const grid = $('#stock-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  STOCK_LIST.forEach(stock => {
    const data = prices[stock.code];
    const card = document.createElement('div');
    card.className = 'price-card';
    
    if (data && data.price) {
      card.innerHTML = `
        <div class="price-card-header">
          <div class="price-icon stock">${stock.code.substring(0, 2)}</div>
          <div class="price-info">
            <span class="price-name">${stock.name}</span>
            <span class="price-unit">${stock.code}.JK</span>
          </div>
        </div>
        <div class="price-value">${formatRupiah(data.price)}</div>
      `;
    } else {
      card.classList.add('error');
      card.innerHTML = `
        <div class="price-card-header">
          <div class="price-icon stock">${stock.code.substring(0, 2)}</div>
          <div class="price-info">
            <span class="price-name">${stock.name}</span>
            <span class="price-unit">${stock.code}.JK</span>
          </div>
        </div>
        <div class="price-value error">Gagal memuat</div>
      `;
    }
    
    grid.appendChild(card);
  });
}

function renderStockGridLoading() {
  const grid = $('#stock-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  STOCK_LIST.forEach(stock => {
    const card = document.createElement('div');
    card.className = 'price-card';
    card.innerHTML = `
      <div class="price-card-header">
        <div class="price-icon stock">${stock.code.substring(0, 2)}</div>
        <div class="price-info">
          <span class="price-name">${stock.name}</span>
          <span class="price-unit">${stock.code}.JK</span>
        </div>
      </div>
      <div class="price-value loading">Memuat...</div>
    `;
    grid.appendChild(card);
  });
}

function renderCryptoGridLoading() {
  const grid = $('#crypto-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  CRYPTO_LIST.forEach(crypto => {
    const card = document.createElement('div');
    card.className = 'price-card';
    card.innerHTML = `
      <div class="price-card-header">
        <div class="price-icon crypto">${crypto.symbol.charAt(0)}</div>
        <div class="price-info">
          <span class="price-name">${crypto.name}</span>
          <span class="price-unit">${crypto.symbol}</span>
        </div>
      </div>
      <div class="price-value loading">Memuat...</div>
    `;
    grid.appendChild(card);
  });
}

function updateMarketStatus(status) {
  const badge = $('#market-status');
  if (!badge) return;
  
  badge.classList.remove('success', 'warning', 'error');
  
  switch (status) {
    case 'loading':
      badge.textContent = 'Memuat data...';
      break;
    case 'success':
      badge.textContent = 'Data Real-time';
      badge.classList.add('success');
      break;
    case 'partial':
      badge.textContent = 'Sebagian Data Berhasil';
      badge.classList.add('warning');
      break;
    case 'error':
      badge.textContent = 'Gagal Memuat Data';
      badge.classList.add('error');
      break;
  }
}

// ===== MOBILE NAVIGATION =====
function initMobileNav() {
  const toggle = $('#nav-toggle');
  const nav = $('#main-nav');
  
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }
}

// ===== MAIN INITIALIZATION =====
async function init() {
  console.log('🚀 ZakatCalc - Memulai...');
  
  // Init mobile nav
  initMobileNav();
  
  // Tampilkan loading state
  updateMarketStatus('loading');
  renderCryptoGridLoading();
  renderStockGridLoading();
  
  try {
    // Fetch emas & crypto dulu (lebih cepat)
    const [emasResult, cryptoPrices] = await Promise.all([
      fetchHargaEmas(),
      fetchHargaCrypto()
    ]);
    
    // Update state
    state.hargaEmas = emasResult.price;
    state.hargaPerak = Math.round(emasResult.price / 100);
    state.cryptoPrices = cryptoPrices;
    
    // Render emas & crypto
    renderNisabCard(emasResult.price, emasResult.isLive);
    renderMetalCards(emasResult.price, state.hargaPerak);
    renderCryptoGrid(cryptoPrices);
    
    // Fetch saham (mungkin lebih lama)
    const stockPrices = await fetchAllStockPrices();
    state.stockPrices = stockPrices;
    
    // Render saham
    renderStockGrid(stockPrices);
    
    // Update status
    const cryptoSuccess = Object.keys(cryptoPrices).length > 0;
    const stockSuccess = Object.keys(stockPrices).length > 0;
    
    if (emasResult.isLive && cryptoSuccess && stockSuccess) {
      updateMarketStatus('success');
    } else if (emasResult.isLive || cryptoSuccess || stockSuccess) {
      updateMarketStatus('partial');
    } else {
      updateMarketStatus('error');
    }
    
    state.isLoaded = true;
    console.log('✅ ZakatCalc - Selesai dimuat!');
    
  } catch (error) {
    console.error('❌ Error saat memuat data:', error);
    updateMarketStatus('error');
  }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);

// Auto refresh setiap 5 menit
setInterval(() => {
  console.log('🔄 Auto refresh data...');
  init();
}, 5 * 60 * 1000);

// Export untuk debugging
window.ZakatCalc = {
  state,
  init,
  fetchHargaEmas,
  fetchHargaCrypto,
  fetchHargaSaham,
  fetchAllStockPrices
};