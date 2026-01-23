// ==========================================
// KALKULATOR ZAKAT MAAL - SCRIPT.JS COMPLETE
// Version 3.0 - All Fixes Integrated
// - Stock Price via Edge Function
// - Zakat Pertanian Fixed
// - Harga Beras Realtime/Scraping
// ==========================================

// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://ynsyiesajoggykqybqsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3lpZXNham9nZ3lrcXlicXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzUzMTIsImV4cCI6MjA4NDAxMTMxMn0.HhTn3wclE5DRdfEpynl2YFI2O8_qO7cUSZ4jrezXFbQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentZakat = null;
let hargaEmasTerbaru = 0;
let hargaPerakTerbaru = 0;
let hargaBerasTerbaru = 15000; // Default fallback
let cryptoPrices = {};
let currentSubtype = null;

// ==========================================
// KONFIGURASI API
// ==========================================

const GOLDAPI_KEY = 'goldapi-13qujjslsmkjctt1w-io';

const HARGA_FALLBACK = {
    emas: 1350000,
    perak: 13000,
    beras: 15000,
    lastUpdate: '2026-01-18'
};

// Indonesian Stock List for autocomplete
const indonesianStocks = [
    { code: 'BBCA', name: 'Bank BCA' },
    { code: 'BBRI', name: 'Bank BRI' },
    { code: 'BMRI', name: 'Bank Mandiri' },
    { code: 'TLKM', name: 'Telkom Indonesia' },
    { code: 'ASII', name: 'Astra International' },
    { code: 'UNVR', name: 'Unilever Indonesia' },
    { code: 'BBNI', name: 'Bank BNI' },
    { code: 'GGRM', name: 'Gudang Garam' },
    { code: 'ICBP', name: 'Indofood CBP' },
    { code: 'INDF', name: 'Indofood' }
];

// ==========================================
// REALTIME PRICE FETCHING - GOLD
// ==========================================

async function fetchRealtimeGoldPrice() {
    try {
        if (GOLDAPI_KEY === 'goldapi-demo-key' || GOLDAPI_KEY === 'YOUR_API_KEY') {
            console.log('⚠️ GoldAPI key belum diisi, menggunakan fallback');
            return await fallbackGoldPrice();
        }
        
        const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
            method: 'GET',
            headers: {
                'x-access-token': GOLDAPI_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ GoldAPI returned ${response.status}, using fallback`);
            return await fallbackGoldPrice();
        }
        
        const data = await response.json();
        
        if (!data || data.error || !data.price) {
            console.warn('⚠️ GoldAPI returned invalid response, using fallback');
            return await fallbackGoldPrice();
        }
        
        let priceUSDPerGram = data.price_gram_24k;
        
        if (!priceUSDPerGram || typeof priceUSDPerGram !== 'number' || isNaN(priceUSDPerGram)) {
            const pricePerOunce = data.price;
            if (!pricePerOunce || typeof pricePerOunce !== 'number' || isNaN(pricePerOunce)) {
                console.warn('⚠️ Invalid GoldAPI price data, using fallback');
                return await fallbackGoldPrice();
            }
            priceUSDPerGram = pricePerOunce / 31.1035;
        }
        
        const KURS_USD_TO_IDR = 16200;
        const priceIDRPerGram = Math.round(priceUSDPerGram * KURS_USD_TO_IDR);
        
        if (isNaN(priceIDRPerGram) || priceIDRPerGram <= 0) {
            console.warn('⚠️ Invalid calculated gold price, using fallback');
            return await fallbackGoldPrice();
        }
        
        console.log(`✅ Harga emas real-time dari GoldAPI: ${priceIDRPerGram}/gram`);
        
        await supabaseClient.from('harga_nisab').insert({
            harga_emas_per_gram: priceIDRPerGram,
            harga_perak_per_gram: Math.round(priceIDRPerGram / 85),
            harga_beras_per_kg: HARGA_FALLBACK.beras,
            sumber: 'GoldAPI.io (Real-time)',
            is_realtime: true
        });
        
        return priceIDRPerGram;
        
    } catch (error) {
        console.warn(`⚠️ GoldAPI fetch failed: ${error.message}, using fallback`);
        return await fallbackGoldPrice();
    }
}

async function fallbackGoldPrice() {
    try {
        const { data: dbPrice } = await supabaseClient
            .from('harga_nisab')
            .select('harga_emas_per_gram, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (dbPrice && dbPrice.harga_emas_per_gram) {
            const daysSinceUpdate = Math.round((Date.now() - new Date(dbPrice.created_at)) / (1000 * 60 * 60 * 24));
            console.log(`⚠️ Menggunakan harga dari database: ${dbPrice.harga_emas_per_gram} (${daysSinceUpdate} hari lalu)`);
            return dbPrice.harga_emas_per_gram;
        }
        
        console.log(`⚠️ Database kosong, menggunakan harga fallback: ${HARGA_FALLBACK.emas}`);
        
        await supabaseClient.from('harga_nisab').insert({
            harga_emas_per_gram: HARGA_FALLBACK.emas,
            harga_perak_per_gram: HARGA_FALLBACK.perak,
            harga_beras_per_kg: HARGA_FALLBACK.beras,
            sumber: 'Manual Fallback',
            is_realtime: false
        });
        
        return HARGA_FALLBACK.emas;
        
    } catch (error) {
        console.error('Error in fallback:', error);
        return HARGA_FALLBACK.emas;
    }
}

// ==========================================
// REALTIME PRICE FETCHING - CRYPTO
// ==========================================

async function fetchCryptoPrices() {
    try {
        const symbols = ['bitcoin', 'ethereum', 'tether', 'binancecoin', 'ripple', 'cardano', 'solana', 'dogecoin'];
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=idr`);
        
        if (!response.ok) {
            throw new Error('API request failed: ' + response.status);
        }
        
        const data = await response.json();
        
        const cryptoMap = {
            'bitcoin': { symbol: 'BTC', name: 'Bitcoin' },
            'ethereum': { symbol: 'ETH', name: 'Ethereum' },
            'tether': { symbol: 'USDT', name: 'Tether' },
            'binancecoin': { symbol: 'BNB', name: 'Binance Coin' },
            'ripple': { symbol: 'XRP', name: 'Ripple' },
            'cardano': { symbol: 'ADA', name: 'Cardano' },
            'solana': { symbol: 'SOL', name: 'Solana' },
            'dogecoin': { symbol: 'DOGE', name: 'Dogecoin' }
        };
        
        const prices = {};
        
        for (const [id, info] of Object.entries(cryptoMap)) {
            const price = data[id]?.idr || 0;
            if (price > 0) {
                prices[info.symbol] = price;
                
                const { data: existing } = await supabaseClient
                    .from('crypto_prices')
                    .select('id')
                    .eq('symbol', info.symbol)
                    .maybeSingle();
                
                if (existing) {
                    await supabaseClient
                        .from('crypto_prices')
                        .update({
                            name: info.name,
                            price_idr: price,
                            last_updated: new Date().toISOString(),
                            source: 'CoinGecko API'
                        })
                        .eq('symbol', info.symbol);
                } else {
                    await supabaseClient
                        .from('crypto_prices')
                        .insert({
                            symbol: info.symbol,
                            name: info.name,
                            price_idr: price,
                            last_updated: new Date().toISOString(),
                            source: 'CoinGecko API'
                        });
                }
            }
        }
        
        console.log('✅ Crypto prices updated:', prices);
        return prices;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        const { data } = await supabaseClient.from('crypto_prices').select('*');
        const prices = {};
        data?.forEach(c => prices[c.symbol] = c.price_idr);
        console.log('⚠️ Using fallback crypto prices from database');
        return prices;
    }
}

// ==========================================
// 📊 STOCK PRICE FETCHING - VIA EDGE FUNCTION
// ==========================================

async function fetchStockPrice(stockCode) {
    console.log(`📊 Fetching price for ${stockCode}...`);
    
    // TIER 1: Supabase Edge Function (PRIORITAS - bypass CORS)
    try {
        console.log(`🔄 Trying Supabase Edge Function for ${stockCode}...`);
        
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/stock-price`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ stock: stockCode })
            }
        );
        
        console.log(`📡 Edge Function response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`⚠️ Edge Function failed (${response.status}): ${errorText}`);
            throw new Error(`Edge Function error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Edge Function response:`, data);
        
        if (data && data.price && typeof data.price === 'number' && data.price > 0) {
            console.log(`✅ Edge Function SUCCESS: ${stockCode} = Rp ${data.price.toLocaleString('id-ID')}`);
            
            await updateStockPriceCache(stockCode, data.price, 'Supabase Edge Function (Yahoo)', true);
            
            return data.price;
        }
        
        if (data && data.error) {
            console.warn(`⚠️ Edge Function returned error: ${data.error}`);
        }
        
        throw new Error('Invalid Edge Function response - no valid price');
        
    } catch (error) {
        console.warn(`⚠️ Edge Function failed for ${stockCode}:`, error.message);
    }
    
    // TIER 2: Database Fallback
    try {
        console.log(`🔄 Trying database fallback for ${stockCode}...`);
        
        const { data, error } = await supabaseClient
            .from('stock_prices')
            .select('price_per_share, last_updated, source')
            .eq('stock_code', stockCode)
            .single();
        
        if (error) {
            console.warn(`⚠️ Database query error:`, error.message);
            throw error;
        }
        
        if (data && data.price_per_share) {
            const lastUpdated = new Date(data.last_updated);
            const daysSinceUpdate = Math.round(
                (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24)
            );
            
            console.log(`⚠️ Using database fallback: ${stockCode} = Rp ${data.price_per_share.toLocaleString('id-ID')} (${daysSinceUpdate} hari lalu)`);
            
            return data.price_per_share;
        }
        
        throw new Error('Stock not found in database');
        
    } catch (error) {
        console.error(`❌ All methods failed for ${stockCode}:`, error.message);
        return 0;
    }
}

async function updateStockPriceCache(stockCode, price, source, isRealtime) {
    try {
        const { data: existing } = await supabaseClient
            .from('stock_prices')
            .select('id')
            .eq('stock_code', stockCode)
            .maybeSingle();
        
        const stockInfo = indonesianStocks.find(s => s.code === stockCode);
        
        if (existing) {
            await supabaseClient
                .from('stock_prices')
                .update({
                    price_per_share: price,
                    last_updated: new Date().toISOString(),
                    source: source,
                    is_realtime: isRealtime
                })
                .eq('stock_code', stockCode);
        } else {
            await supabaseClient
                .from('stock_prices')
                .insert({
                    stock_code: stockCode,
                    stock_name: stockInfo?.name || stockCode,
                    price_per_share: price,
                    source: source,
                    is_realtime: isRealtime
                });
        }
        
        console.log(`💾 Stock price cached: ${stockCode} = Rp ${price.toLocaleString('id-ID')}`);
    } catch (error) {
        console.error('Error updating stock cache:', error);
    }
}

// ==========================================
// 🌾 BERAS PRICE FETCHING - VIA EDGE FUNCTION
// ==========================================

async function fetchBerasPrice() {
    console.log('🌾 Fetching harga beras...');
    
    // TIER 1: Supabase Edge Function (scraping)
    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/beras-price`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data?.price) {
                console.log(`✅ Harga beras dari ${result.data.source}: ${result.data.price_formatted}`);
                
                await updateBerasPriceCache(result.data.price, result.data.source);
                
                hargaBerasTerbaru = result.data.price;
                return result.data;
            }
        }
        
        throw new Error('Edge Function failed');
        
    } catch (error) {
        console.warn('⚠️ Edge Function beras-price failed:', error.message);
    }
    
    // TIER 2: Database fallback
    try {
        const { data, error } = await supabaseClient
            .from('harga_komoditas')
            .select('harga_per_kg, updated_at, sumber')
            .eq('nama', 'beras')
            .single();
        
        if (!error && data) {
            const daysSinceUpdate = Math.round(
                (Date.now() - new Date(data.updated_at)) / (1000 * 60 * 60 * 24)
            );
            
            console.log(`⚠️ Using database: Beras = Rp ${data.harga_per_kg} (${daysSinceUpdate} hari lalu)`);
            
            hargaBerasTerbaru = data.harga_per_kg;
            return {
                price: data.harga_per_kg,
                price_formatted: `Rp ${data.harga_per_kg.toLocaleString('id-ID')}`,
                source: data.sumber + ' (Cached)',
                timestamp: data.updated_at
            };
        }
    } catch (error) {
        console.warn('⚠️ Database fallback failed:', error.message);
    }
    
    // TIER 3: Hardcoded fallback
    console.log(`⚠️ Using hardcoded fallback: Rp ${hargaBerasTerbaru}`);
    return {
        price: hargaBerasTerbaru,
        price_formatted: `Rp ${hargaBerasTerbaru.toLocaleString('id-ID')}`,
        source: 'Default (Fallback)',
        timestamp: new Date().toISOString()
    };
}

async function updateBerasPriceCache(price, source) {
    try {
        const { data: existing } = await supabaseClient
            .from('harga_komoditas')
            .select('id')
            .eq('nama', 'beras')
            .maybeSingle();
        
        if (existing) {
            await supabaseClient
                .from('harga_komoditas')
                .update({
                    harga_per_kg: price,
                    sumber: source,
                    updated_at: new Date().toISOString()
                })
                .eq('nama', 'beras');
        } else {
            await supabaseClient
                .from('harga_komoditas')
                .insert({
                    nama: 'beras',
                    harga_per_kg: price,
                    sumber: source
                });
        }
        
        console.log(`💾 Harga beras cached: Rp ${price}`);
    } catch (error) {
        console.error('Error caching beras price:', error);
    }
}

// ==========================================
// FORMAT FUNCTIONS
// ==========================================

function formatRupiah(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    input.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatAngka(input) {
    input.value = input.value.replace(/[^0-9.]/g, '');
}

function parseRupiah(value) {
    return parseFloat(value.replace(/\./g, '')) || 0;
}

function parseAngka(value) {
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
}

function toRupiah(number) {
    return 'Rp ' + Math.round(number).toLocaleString('id-ID');
}

// ==========================================
// LOAD DATA
// ==========================================

async function loadData() {
    try {
        console.log('Fetching realtime prices...');
        hargaEmasTerbaru = await fetchRealtimeGoldPrice();
        cryptoPrices = await fetchCryptoPrices();
        
        // Fetch harga beras juga
        await fetchBerasPrice();
        
        const { data: nisabData } = await supabaseClient
            .from('harga_nisab')
            .select('harga_perak_per_gram, harga_beras_per_kg')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        hargaPerakTerbaru = nisabData?.harga_perak_per_gram || HARGA_FALLBACK.perak;
        
        document.getElementById('harga-emas').innerHTML = toRupiah(hargaEmasTerbaru) + 
            ' <span class="realtime-badge">LIVE</span>';
        document.getElementById('nisab-rupiah').textContent = toRupiah(85 * hargaEmasTerbaru);
        document.getElementById('tanggal-update').textContent = new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const { data: zakatData, error: zakatError } = await supabaseClient
            .from('jenis_zakat')
            .select('*')
            .order('kategori, nama');

        if (zakatError) throw zakatError;

        renderZakatCards(zakatData);

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 
            '❌ Gagal memuat data: ' + error.message;
    }
}

// ==========================================
// RENDER CARDS
// ==========================================

function renderZakatCards(data) {
    const container = document.getElementById('zakat-container');
    container.innerHTML = '';

    const iconMap = {
        'Maal': '💰',
        'Pertanian': '🌾',
        'Peternakan': '🐄'
    };

    const iconClassMap = {
        'Maal': 'icon-maal',
        'Pertanian': 'icon-pertanian',
        'Peternakan': 'icon-peternakan'
    };

    data.forEach(zakat => {
        const card = document.createElement('div');
        card.className = 'zakat-card';
        card.onclick = () => openModal(zakat);

        let realtimeBadge = '';
        if (zakat.has_subtypes || zakat.unit_input === 'crypto') {
            realtimeBadge = '<span class="realtime-badge" style="margin-left: 5px;">LIVE</span>';
        }

        card.innerHTML = `
            <div class="zakat-card-header">
                <div class="zakat-icon ${iconClassMap[zakat.kategori] || 'icon-maal'}">
                    ${iconMap[zakat.kategori] || '💰'}
                </div>
                <div>
                    <h3>${zakat.nama}${realtimeBadge}</h3>
                    <span class="zakat-badge">${zakat.kategori}</span>
                </div>
            </div>
            <p>${zakat.penjelasan}</p>
        `;

        container.appendChild(card);
    });

    document.getElementById('loading').style.display = 'none';
    container.style.display = 'grid';
}

// ==========================================
// MODAL & FORM RENDERING
// ==========================================

function openModal(zakat) {
    currentZakat = zakat;
    const modal = document.getElementById('modal');
    
    document.getElementById('modal-title').textContent = zakat.nama;
    
    const modalContent = document.getElementById('modal-content-container');
    modalContent.innerHTML = '';
    
    // URUTAN CHECKING YANG BENAR:
    if (zakat.support_periode) {
        renderFormPenghasilan();
    } else if (zakat.nama.includes('Saham')) {
        renderFormSaham();
    } else if (zakat.support_breakdown && zakat.unit_input === 'rupiah') {
        renderFormPerdagangan();
    } else if (zakat.kategori === 'Peternakan') {
        renderFormPeternakan(zakat);
    } else if (zakat.unit_input === 'gram' && zakat.has_subtypes) {
        renderFormEmasPerak();
    } else if (zakat.unit_input === 'crypto') {
        renderFormCrypto();
    } else if (zakat.kategori === 'Pertanian') {
        renderFormPertanian(zakat);
    }
    
    modal.classList.add('active');
}

function renderFormPenghasilan() {
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="periode-selector">
            <label class="radio-label">
                <input type="radio" name="periode" value="bulanan" checked onchange="updateNisabPenghasilan()">
                <span>Per Bulan</span>
            </label>
            <label class="radio-label">
                <input type="radio" name="periode" value="tahunan" onchange="updateNisabPenghasilan()">
                <span>Per Tahun</span>
            </label>
        </div>
        
        <div class="form-section">
            <h4>💵 Penghasilan</h4>
            <div class="form-group">
                <label>Penghasilan Utama (Gaji/Upah)</label>
                <input type="text" id="penghasilan-utama" placeholder="0" oninput="formatRupiah(this); autoCalculatePenghasilan()">
            </div>
            <div class="form-group">
                <label>Penghasilan Lain (Bonus, THR, dll)</label>
                <input type="text" id="penghasilan-lain" placeholder="0" oninput="formatRupiah(this); autoCalculatePenghasilan()">
            </div>
            <div class="total-display">
                Total Penghasilan: <strong id="total-penghasilan">Rp 0</strong>
            </div>
        </div>
        
        <div class="form-section">
            <h4>💸 Pengeluaran</h4>
            <div class="form-group">
                <label>Kebutuhan Pokok (Makanan, Tempat Tinggal, dll)</label>
                <input type="text" id="kebutuhan-pokok" placeholder="0" oninput="formatRupiah(this); autoCalculatePenghasilan()">
            </div>
            <div class="form-group">
                <label>Pajak & Asuransi</label>
                <input type="text" id="pajak" placeholder="0" oninput="formatRupiah(this); autoCalculatePenghasilan()">
            </div>
            <div class="form-group">
                <label>Pengeluaran Lain (Hutang, Cicilan, dll)</label>
                <input type="text" id="pengeluaran-lain" placeholder="0" oninput="formatRupiah(this); autoCalculatePenghasilan()">
            </div>
            <div class="total-display">
                Total Pengeluaran: <strong id="total-pengeluaran">Rp 0</strong>
            </div>
        </div>
        
        <div class="total-display total-display-primary">
            Penghasilan Bersih: <strong id="penghasilan-bersih">Rp 0</strong>
        </div>
        
        <div class="nisab-info">
            <p><strong>Nisab:</strong> <span id="nisab-penghasilan">${toRupiah(85 * hargaEmasTerbaru / 12)}</span> (bulanan)</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> Tidak perlu haul</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatPenghasilan()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function renderFormPerdagangan() {
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-section">
            <h4>💼 Harta Usaha</h4>
            <div class="form-group">
                <label>Modal Usaha</label>
                <input type="text" id="modal-usaha" placeholder="0" oninput="formatRupiah(this); autoCalculatePerdagangan()">
            </div>
            <div class="form-group">
                <label>Laba/Keuntungan</label>
                <input type="text" id="laba-usaha" placeholder="0" oninput="formatRupiah(this); autoCalculatePerdagangan()">
            </div>
            <div class="form-group">
                <label>Piutang (yang bisa ditagih)</label>
                <input type="text" id="piutang" placeholder="0" oninput="formatRupiah(this); autoCalculatePerdagangan()">
            </div>
            <div class="form-group">
                <label>Utang/Hutang</label>
                <input type="text" id="utang" placeholder="0" oninput="formatRupiah(this); autoCalculatePerdagangan()">
            </div>
        </div>
        
        <div class="total-display total-display-primary">
            Harta Bersih: <strong id="harta-bersih">Rp 0</strong>
            <small>(Modal + Laba + Piutang - Utang)</small>
        </div>
        
        <div class="nisab-info">
            <p><strong>Nisab:</strong> ${toRupiah(85 * hargaEmasTerbaru)}</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> 1 tahun (12 bulan)</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatPerdagangan()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function renderFormPeternakan(zakat) {
    let jenisTernak = '';
    let nisabInfo = '';
    
    if (zakat.nama.includes('Kambing')) {
        jenisTernak = 'kambing';
        nisabInfo = '40 ekor';
    } else if (zakat.nama.includes('Sapi')) {
        jenisTernak = 'sapi';
        nisabInfo = '30 ekor';
    } else if (zakat.nama.includes('Unta')) {
        jenisTernak = 'unta';
        nisabInfo = '5 ekor';
    }
    
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-group">
            <label>Jumlah Ternak (Ekor)</label>
            <input type="text" id="jumlah-ternak" placeholder="Contoh: 50" oninput="formatAngka(this)">
            <input type="hidden" id="jenis-ternak" value="${jenisTernak}">
        </div>
        
        <div class="checkbox-group">
            <p style="margin-bottom: 10px;"><strong>Syarat Zakat Peternakan:</strong></p>
            <label class="checkbox-label">
                <input type="checkbox" id="syarat-1">
                <span>Ternak digembalakan/tidak diperdagangkan</span>
            </label>
            <label class="checkbox-label">
                <input type="checkbox" id="syarat-2">
                <span>Sudah mencapai haul (1 tahun)</span>
            </label>
            <label class="checkbox-label">
                <input type="checkbox" id="syarat-3">
                <span>Mencapai nisab (minimal ${nisabInfo})</span>
            </label>
        </div>
        
        <div class="nisab-info">
            <p><strong>Nisab:</strong> ${nisabInfo}</p>
            <p><strong>Zakat:</strong> Sistem bertingkat</p>
            <p><strong>Haul:</strong> 1 tahun</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatPeternakan()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function renderFormSaham() {
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-group">
            <label>Pilih Saham Indonesia</label>
            <select id="kode-saham" onchange="loadStockData()">
                <option value="">-- Pilih Saham --</option>
                ${indonesianStocks.map(s => 
                    `<option value="${s.code}">${s.code} - ${s.name}</option>`
                ).join('')}
            </select>
        </div>
        
        <div class="periode-selector" style="margin-bottom: 20px;">
            <label class="radio-label">
                <input type="radio" name="mode-saham" value="lembar" checked onchange="switchModeSaham()">
                <span>Input Jumlah Lembar</span>
            </label>
            <label class="radio-label">
                <input type="radio" name="mode-saham" value="manual" onchange="switchModeSaham()">
                <span>Input Total Nilai</span>
            </label>
        </div>
        
        <!-- MODE LEMBAR -->
        <div id="mode-lembar-container">
            <div class="form-group">
                <label>Jumlah Lembar Saham</label>
                <input type="text" id="jumlah-lembar" placeholder="Contoh: 100" oninput="formatAngka(this); autoCalculateSahamLembar()">
            </div>
            
            <div class="form-group">
                <label>Harga per Lembar</label>
                <div style="position: relative;">
                    <input type="text" id="harga-per-lembar" placeholder="Pilih saham terlebih dahulu" readonly style="background: #f7fafc;">
                    <span id="stock-price-badge" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #48bb78;"></span>
                </div>
            </div>
            
            <div class="total-display">
                Total Nilai Saham: <strong id="total-nilai-lembar">Rp 0</strong>
            </div>
        </div>
        
        <!-- MODE MANUAL -->
        <div id="mode-manual-container" style="display: none;">
            <div class="form-group">
                <label>Total Nilai Pasar Saham</label>
                <input type="text" id="nilai-saham-manual" placeholder="0" oninput="formatRupiah(this); autoCalculateSahamManual()">
            </div>
        </div>
        
        <!-- DIVIDEN -->
        <div class="form-group">
            <label>Dividen yang Diterima <small style="color: #718096;">(opsional - per tahun)</small></label>
            <input type="text" id="dividen-saham" placeholder="0" oninput="formatRupiah(this); autoCalculateSahamCurrent()">
        </div>
        
        <div class="total-display total-display-primary">
            Total Nilai + Dividen: <strong id="grand-total-saham">Rp 0</strong>
        </div>
        
        <div class="nisab-info">
            <p><strong>Nisab:</strong> ${toRupiah(85 * hargaEmasTerbaru)}</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> 1 tahun</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatSaham()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function renderFormEmasPerak() {
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-group">
            <label>Pilih Jenis Logam Mulia</label>
            <select id="jenis-logam" onchange="updateInfoEmasPerak()">
                <option value="">-- Pilih --</option>
                <option value="emas">Emas (${toRupiah(hargaEmasTerbaru)}/gram)</option>
                <option value="perak">Perak (${toRupiah(hargaPerakTerbaru)}/gram)</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Berat (Gram)</label>
            <input type="text" id="berat-logam" placeholder="Contoh: 100" oninput="formatAngka(this); autoCalculateEmasPerak()">
        </div>
        
        <div class="total-display total-display-primary">
            Nilai dalam Rupiah: <strong id="nilai-logam">Rp 0</strong>
        </div>
        
        <div class="nisab-info" id="nisab-logam">
            <p>Silakan pilih jenis logam mulia terlebih dahulu</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatEmasPerak()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function renderFormCrypto() {
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-group">
            <label>Pilih Cryptocurrency</label>
            <select id="jenis-crypto" onchange="updateInfoCrypto()">
                <option value="">-- Pilih --</option>
                ${Object.keys(cryptoPrices).map(symbol => 
                    `<option value="${symbol}">${symbol} - ${toRupiah(cryptoPrices[symbol])}</option>`
                ).join('')}
            </select>
        </div>
        
        <div class="form-group">
            <label>Jumlah Cryptocurrency</label>
            <input type="text" id="jumlah-crypto" placeholder="Contoh: 0.5" oninput="formatAngka(this); autoCalculateCrypto()">
        </div>
        
        <div class="total-display total-display-primary">
            Nilai dalam Rupiah: <strong id="nilai-crypto">Rp 0</strong>
        </div>
        
        <div class="nisab-info" id="nisab-crypto">
            <p>Silakan pilih cryptocurrency terlebih dahulu</p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatCrypto()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

// ==========================================
// 🌾 RENDER FORM PERTANIAN - FIXED
// ==========================================

function renderFormPertanian(zakat) {
    const isTadahHujan = zakat.persentase_zakat === 10;
    
    const container = document.getElementById('modal-content-container');
    container.innerHTML = `
        <div class="info-box">
            ${currentZakat.penjelasan}
        </div>
        
        <div class="form-group">
            <label>Hasil Panen (Kilogram)</label>
            <input type="text" id="hasil-panen" placeholder="Contoh: 1000" oninput="formatAngka(this)">
        </div>
        
        <div class="info-highlight">
            <p><strong>Jenis Irigasi:</strong> ${isTadahHujan ? 'Tadah Hujan/Alami' : 'Irigasi Berbayar'}</p>
            <p><strong>Persentase Zakat:</strong> ${zakat.persentase_zakat}%</p>
        </div>
        
        <div class="nisab-info">
            <p><strong>Nisab:</strong> 653 kg gabah (5 wasaq)</p>
            <p><strong>Haul:</strong> Tidak perlu haul (saat panen)</p>
            <p><strong>Harga Beras:</strong> <span id="harga-beras-info">${toRupiah(hargaBerasTerbaru)}/kg</span></p>
        </div>
        
        <button type="button" class="btn-hitung" onclick="hitungZakatPertanian()">
            Hitung Zakat
        </button>
        
        <div id="result" style="display: none;"></div>
    `;
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentSubtype = null;
}

// ==========================================
// AUTO CALCULATE FUNCTIONS
// ==========================================

function updateNisabPenghasilan() {
    const periode = document.querySelector('input[name="periode"]:checked').value;
    const nisabTahunan = 85 * hargaEmasTerbaru;
    const nisabBulanan = nisabTahunan / 12;
    
    document.getElementById('nisab-penghasilan').textContent = 
        periode === 'bulanan' ? `${toRupiah(nisabBulanan)} (bulanan)` : `${toRupiah(nisabTahunan)} (tahunan)`;
    
    autoCalculatePenghasilan();
}

function autoCalculatePenghasilan() {
    const penghasilanUtama = parseRupiah(document.getElementById('penghasilan-utama').value);
    const penghasilanLain = parseRupiah(document.getElementById('penghasilan-lain').value);
    const kebutuhanPokok = parseRupiah(document.getElementById('kebutuhan-pokok').value);
    const pajak = parseRupiah(document.getElementById('pajak').value);
    const pengeluaranLain = parseRupiah(document.getElementById('pengeluaran-lain').value);
    
    const totalPenghasilan = penghasilanUtama + penghasilanLain;
    const totalPengeluaran = kebutuhanPokok + pajak + pengeluaranLain;
    const penghasilanBersih = totalPenghasilan - totalPengeluaran;
    
    document.getElementById('total-penghasilan').textContent = toRupiah(totalPenghasilan);
    document.getElementById('total-pengeluaran').textContent = toRupiah(totalPengeluaran);
    document.getElementById('penghasilan-bersih').textContent = toRupiah(penghasilanBersih);
}

function autoCalculatePerdagangan() {
    const modal = parseRupiah(document.getElementById('modal-usaha').value);
    const laba = parseRupiah(document.getElementById('laba-usaha').value);
    const piutang = parseRupiah(document.getElementById('piutang').value);
    const utang = parseRupiah(document.getElementById('utang').value);
    
    const hartaBersih = modal + laba + piutang - utang;
    document.getElementById('harta-bersih').textContent = toRupiah(hartaBersih);
}

// ==========================================
// 📊 AUTO CALCULATE SAHAM
// ==========================================

async function loadStockData() {
    const stockCode = document.getElementById('kode-saham').value;
    
    if (!stockCode) {
        document.getElementById('harga-per-lembar').value = '';
        document.getElementById('stock-price-badge').textContent = '';
        return;
    }
    
    const priceInput = document.getElementById('harga-per-lembar');
    const badge = document.getElementById('stock-price-badge');
    
    priceInput.value = 'Loading...';
    badge.innerHTML = '<span class="spinner"></span>';
    
    const price = await fetchStockPrice(stockCode);
    
    if (price > 0) {
        priceInput.value = price.toLocaleString('id-ID');
        badge.innerHTML = '<span class="realtime-badge" style="position: static; margin: 0;">LIVE</span>';
    } else {
        priceInput.value = 'Harga tidak tersedia';
        badge.innerHTML = '<span style="color: #e53e3e;">❌</span>';
    }
    
    autoCalculateSahamLembar();
}

function switchModeSaham() {
    const mode = document.querySelector('input[name="mode-saham"]:checked').value;
    const lembarContainer = document.getElementById('mode-lembar-container');
    const manualContainer = document.getElementById('mode-manual-container');
    
    if (mode === 'lembar') {
        lembarContainer.style.display = 'block';
        manualContainer.style.display = 'none';
    } else {
        lembarContainer.style.display = 'none';
        manualContainer.style.display = 'block';
    }
    
    autoCalculateSahamCurrent();
}

function autoCalculateSahamLembar() {
    const jumlahLembar = parseAngka(document.getElementById('jumlah-lembar')?.value || '0');
    const hargaPerLembar = parseAngka(document.getElementById('harga-per-lembar')?.value || '0');
    
    const totalNilai = jumlahLembar * hargaPerLembar;
    
    const totalDisplay = document.getElementById('total-nilai-lembar');
    if (totalDisplay) {
        totalDisplay.textContent = toRupiah(totalNilai);
    }
    
    autoCalculateSahamCurrent();
}

function autoCalculateSahamManual() {
    autoCalculateSahamCurrent();
}

function autoCalculateSahamCurrent() {
    const mode = document.querySelector('input[name="mode-saham"]:checked')?.value || 'lembar';
    
    let nilaiSaham = 0;
    
    if (mode === 'lembar') {
        const jumlahLembar = parseAngka(document.getElementById('jumlah-lembar')?.value || '0');
        const hargaPerLembar = parseAngka(document.getElementById('harga-per-lembar')?.value || '0');
        nilaiSaham = jumlahLembar * hargaPerLembar;
    } else {
        nilaiSaham = parseRupiah(document.getElementById('nilai-saham-manual')?.value || '0');
    }
    
    const dividen = parseRupiah(document.getElementById('dividen-saham')?.value || '0');
    const grandTotal = nilaiSaham + dividen;
    
    const grandTotalDisplay = document.getElementById('grand-total-saham');
    if (grandTotalDisplay) {
        grandTotalDisplay.textContent = toRupiah(grandTotal);
    }
}

function updateInfoEmasPerak() {
    const jenis = document.getElementById('jenis-logam').value;
    const nisabInfo = document.getElementById('nisab-logam');
    
    if (jenis === 'emas') {
        nisabInfo.innerHTML = `
            <p><strong>Nisab:</strong> 85 gram emas (${toRupiah(85 * hargaEmasTerbaru)})</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> 1 tahun</p>
        `;
    } else if (jenis === 'perak') {
        nisabInfo.innerHTML = `
            <p><strong>Nisab:</strong> 595 gram perak (${toRupiah(595 * hargaPerakTerbaru)})</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> 1 tahun</p>
        `;
    }
    
    autoCalculateEmasPerak();
}

function autoCalculateEmasPerak() {
    const jenis = document.getElementById('jenis-logam').value;
    const berat = parseAngka(document.getElementById('berat-logam').value);
    
    if (!jenis || !berat) return;
    
    const harga = jenis === 'emas' ? hargaEmasTerbaru : hargaPerakTerbaru;
    const nilai = berat * harga;
    
    document.getElementById('nilai-logam').textContent = toRupiah(nilai);
}

function updateInfoCrypto() {
    const symbol = document.getElementById('jenis-crypto').value;
    const nisabInfo = document.getElementById('nisab-crypto');
    
    if (symbol) {
        nisabInfo.innerHTML = `
            <p><strong>Kurs:</strong> 1 ${symbol} = ${toRupiah(cryptoPrices[symbol])}</p>
            <p><strong>Nisab:</strong> ${toRupiah(85 * hargaEmasTerbaru)}</p>
            <p><strong>Persentase Zakat:</strong> 2.5%</p>
            <p><strong>Haul:</strong> 1 tahun</p>
        `;
    }
    
    autoCalculateCrypto();
}

function autoCalculateCrypto() {
    const symbol = document.getElementById('jenis-crypto').value;
    const jumlah = parseAngka(document.getElementById('jumlah-crypto').value);
    
    if (!symbol || !jumlah) return;
    
    const nilai = jumlah * cryptoPrices[symbol];
    document.getElementById('nilai-crypto').textContent = toRupiah(nilai);
}

// ==========================================
// HITUNG ZAKAT FUNCTIONS
// ==========================================

async function hitungZakatPenghasilan() {
    const periode = document.querySelector('input[name="periode"]:checked').value;
    const penghasilanUtama = parseRupiah(document.getElementById('penghasilan-utama').value);
    const penghasilanLain = parseRupiah(document.getElementById('penghasilan-lain').value);
    const kebutuhanPokok = parseRupiah(document.getElementById('kebutuhan-pokok').value);
    const pajak = parseRupiah(document.getElementById('pajak').value);
    const pengeluaranLain = parseRupiah(document.getElementById('pengeluaran-lain').value);
    
    const breakdown = {
        penghasilan_utama: penghasilanUtama,
        penghasilan_lain: penghasilanLain,
        kebutuhan_pokok: kebutuhanPokok,
        pajak: pajak,
        pengeluaran_lain: pengeluaranLain
    };
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat', {
            p_jenis_zakat_id: currentZakat.id,
            p_input_nilai: 0,
            p_subtype: null,
            p_periode: periode,
            p_breakdown: breakdown
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        tampilkanHasilPenghasilan(hasil, periode, breakdown);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

async function hitungZakatPerdagangan() {
    const modal = parseRupiah(document.getElementById('modal-usaha').value);
    const laba = parseRupiah(document.getElementById('laba-usaha').value);
    const piutang = parseRupiah(document.getElementById('piutang').value);
    const utang = parseRupiah(document.getElementById('utang').value);
    
    const breakdown = {
        modal: modal,
        laba: laba,
        piutang: piutang,
        utang: utang
    };
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat', {
            p_jenis_zakat_id: currentZakat.id,
            p_input_nilai: 0,
            p_subtype: null,
            p_periode: null,
            p_breakdown: breakdown
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        tampilkanHasilPerdagangan(hasil, breakdown);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

async function hitungZakatPeternakan() {
    const jumlahTernak = parseAngka(document.getElementById('jumlah-ternak').value);
    const jenisTernak = document.getElementById('jenis-ternak').value;
    
    if (!jumlahTernak) {
        alert('Silakan masukkan jumlah ternak!');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat_peternakan', {
            p_jenis_ternak: jenisTernak,
            p_jumlah_ternak: jumlahTernak
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        tampilkanHasilPeternakan(hasil, jumlahTernak, jenisTernak);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

async function hitungZakatSaham() {
    const mode = document.querySelector('input[name="mode-saham"]:checked').value;
    const stockCode = document.getElementById('kode-saham').value;
    
    if (!stockCode) {
        alert('Silakan pilih saham terlebih dahulu!');
        return;
    }
    
    let nilaiSaham = 0;
    let jumlahLembar = 0;
    let hargaPerLembar = 0;
    
    if (mode === 'lembar') {
        jumlahLembar = parseAngka(document.getElementById('jumlah-lembar').value);
        hargaPerLembar = parseAngka(document.getElementById('harga-per-lembar').value);
        nilaiSaham = jumlahLembar * hargaPerLembar;
        
        if (!jumlahLembar || !hargaPerLembar) {
            alert('Silakan lengkapi jumlah lembar dan pastikan harga sudah dimuat!');
            return;
        }
    } else {
        nilaiSaham = parseRupiah(document.getElementById('nilai-saham-manual').value);
        
        if (!nilaiSaham) {
            alert('Silakan masukkan total nilai saham!');
            return;
        }
    }
    
    const dividen = parseRupiah(document.getElementById('dividen-saham').value);
    const totalNilai = nilaiSaham + dividen;
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat', {
            p_jenis_zakat_id: currentZakat.id,
            p_input_nilai: totalNilai,
            p_subtype: null,
            p_periode: null,
            p_breakdown: null
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        
        tampilkanHasilSaham(hasil, {
            stockCode,
            mode,
            jumlahLembar,
            hargaPerLembar,
            nilaiSaham,
            dividen
        });
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

async function hitungZakatEmasPerak() {
    const jenis = document.getElementById('jenis-logam').value;
    const berat = parseAngka(document.getElementById('berat-logam').value);
    
    if (!jenis || !berat) {
        alert('Silakan lengkapi semua field!');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat', {
            p_jenis_zakat_id: currentZakat.id,
            p_input_nilai: berat,
            p_subtype: jenis,
            p_periode: null,
            p_breakdown: null
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        tampilkanHasilEmasPerak(hasil, berat, jenis);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

async function hitungZakatCrypto() {
    const symbol = document.getElementById('jenis-crypto').value;
    const jumlah = parseAngka(document.getElementById('jumlah-crypto').value);
    
    if (!symbol || !jumlah) {
        alert('Silakan lengkapi semua field!');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.rpc('hitung_zakat', {
            p_jenis_zakat_id: currentZakat.id,
            p_input_nilai: jumlah,
            p_subtype: symbol,
            p_periode: null,
            p_breakdown: null
        });
        
        if (error) throw error;
        
        const hasil = data[0];
        tampilkanHasilCrypto(hasil, jumlah, symbol);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

// ==========================================
// 🌾 HITUNG ZAKAT PERTANIAN - FIXED (CLIENT-SIDE)
// ==========================================

async function hitungZakatPertanian() {
    const hasilPanen = parseAngka(document.getElementById('hasil-panen').value);
    
    if (!hasilPanen) {
        alert('Silakan masukkan hasil panen!');
        return;
    }
    
    const NISAB_KG = 653;
    const persentase = currentZakat.persentase_zakat || 5;
    
    // Pastikan harga beras sudah di-load
    if (hargaBerasTerbaru <= 0) {
        await fetchBerasPrice();
    }
    
    // Hitung langsung di client-side (logika sederhana)
    const hasil = {
        wajib_zakat: hasilPanen >= NISAB_KG,
        nisab_kg: NISAB_KG,
        hasil_panen: hasilPanen,
        persentase: persentase,
        jumlah_zakat_kg: hasilPanen >= NISAB_KG ? (hasilPanen * persentase / 100) : 0,
        jumlah_zakat_rupiah: hasilPanen >= NISAB_KG ? (hasilPanen * persentase / 100 * hargaBerasTerbaru) : 0,
        harga_beras_per_kg: hargaBerasTerbaru,
        kekurangan_kg: hasilPanen < NISAB_KG ? (NISAB_KG - hasilPanen) : 0
    };
    
    tampilkanHasilPertanian(hasil, hasilPanen);
}

// ==========================================
// DISPLAY RESULT FUNCTIONS
// ==========================================

function tampilkanHasilPenghasilan(hasil, periode, breakdown) {
    const resultDiv = document.getElementById('result');
    const totalPenghasilan = breakdown.penghasilan_utama + breakdown.penghasilan_lain;
    const totalPengeluaran = breakdown.kebutuhan_pokok + breakdown.pajak + breakdown.pengeluaran_lain;
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Periode: <strong>${periode === 'bulanan' ? 'Per Bulan' : 'Per Tahun'}</strong></p>
                <p>Total Penghasilan: <strong>${toRupiah(totalPenghasilan)}</strong></p>
                <p>Total Pengeluaran: <strong>${toRupiah(totalPengeluaran)}</strong></p>
                <p>Penghasilan Bersih: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
            </div>
            <div class="result-amount">
                ${toRupiah(hasil.jumlah_zakat)}
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan ${periode === 'bulanan' ? 'per bulan' : 'per tahun'}</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Penghasilan Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Penghasilan Bersih: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
                <p>Kekurangan: <strong>${toRupiah(hasil.kekurangan)}</strong></p>
            </div>
            <p style="margin-top: 15px;">Anda belum wajib mengeluarkan zakat, namun tetap bisa bersedekah 😊</p>
        `;
    }
    
    resultDiv.style.display = 'block';
}

function tampilkanHasilPerdagangan(hasil, breakdown) {
    const resultDiv = document.getElementById('result');
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Modal: <strong>${toRupiah(breakdown.modal)}</strong></p>
                <p>Laba: <strong>${toRupiah(breakdown.laba)}</strong></p>
                <p>Piutang: <strong>${toRupiah(breakdown.piutang)}</strong></p>
                <p>Utang: <strong>${toRupiah(breakdown.utang)}</strong></p>
                <p>Harta Bersih: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
            </div>
            <div class="result-amount">
                ${toRupiah(hasil.jumlah_zakat)}
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Harta Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Harta Bersih: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
                <p>Kekurangan: <strong>${toRupiah(hasil.kekurangan)}</strong></p>
            </div>
        `;
    }
    
    resultDiv.style.display = 'block';
}

function tampilkanHasilPeternakan(hasil, jumlahEkor, jenisTernak) {
    const resultDiv = document.getElementById('result');
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Jumlah Ternak: <strong>${jumlahEkor} ekor ${jenisTernak}</strong></p>
                <p>Nisab: <strong>${hasil.nisab_ekor} ekor</strong></p>
            </div>
            <div class="result-amount" style="font-size: 1.5em;">
                ${hasil.zakat_wajib}
            </div>
            <p>Adalah zakat yang harus Anda keluarkan</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Ternak Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Jumlah Ternak: <strong>${jumlahEkor} ekor ${jenisTernak}</strong></p>
                <p>Nisab: <strong>${hasil.nisab_ekor} ekor</strong></p>
                <p>Kekurangan: <strong>${hasil.kekurangan} ekor</strong></p>
            </div>
        `;
    }
    
    resultDiv.style.display = 'block';
}

function tampilkanHasilSaham(hasil, inputData) {
    const resultDiv = document.getElementById('result');
    const stockInfo = indonesianStocks.find(s => s.code === inputData.stockCode);
    
    let detailHTML = '';
    
    if (inputData.mode === 'lembar') {
        detailHTML = `
            <p>Saham: <strong>${inputData.stockCode} - ${stockInfo?.name || inputData.stockCode}</strong></p>
            <p>Jumlah Lembar: <strong>${inputData.jumlahLembar.toLocaleString('id-ID')} lembar</strong></p>
            <p>Harga per Lembar: <strong>${toRupiah(inputData.hargaPerLembar)}</strong></p>
            <p>Nilai Saham: <strong>${toRupiah(inputData.nilaiSaham)}</strong></p>
        `;
    } else {
        detailHTML = `
            <p>Saham: <strong>${inputData.stockCode} - ${stockInfo?.name || inputData.stockCode}</strong></p>
            <p>Nilai Saham: <strong>${toRupiah(inputData.nilaiSaham)}</strong></p>
        `;
    }
    
    if (inputData.dividen > 0) {
        detailHTML += `<p>Dividen: <strong>${toRupiah(inputData.dividen)}</strong></p>`;
    }
    
    detailHTML += `
        <p>Total Nilai: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
        <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
    `;
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                ${detailHTML}
            </div>
            <div class="result-amount">
                ${toRupiah(hasil.jumlah_zakat)}
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Nilai Belum Mencapai Nisab</h3>
            <div class="result-detail">
                ${detailHTML}
                <p>Kekurangan: <strong>${toRupiah(hasil.kekurangan)}</strong></p>
            </div>
            <p style="margin-top: 15px;">Anda belum wajib mengeluarkan zakat, namun tetap bisa bersedekah 😊</p>
        `;
    }
    
    resultDiv.style.display = 'block';
}

function tampilkanHasilEmasPerak(hasil, berat, jenis) {
    const resultDiv = document.getElementById('result');
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Jenis: <strong>${jenis === 'emas' ? 'Emas' : 'Perak'}</strong></p>
                <p>Berat: <strong>${berat} gram</strong></p>
                <p>Nilai: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
            </div>
            <div class="result-amount">
                ${toRupiah(hasil.jumlah_zakat)}
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Berat: <strong>${berat} gram ${jenis}</strong></p>
                <p>Nilai: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
                <p>Kekurangan: <strong>${toRupiah(hasil.kekurangan)}</strong></p>
            </div>
        `;
    }
    
    resultDiv.style.display = 'block';
}

function tampilkanHasilCrypto(hasil, jumlah, symbol) {
    const resultDiv = document.getElementById('result');
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Cryptocurrency: <strong>${symbol}</strong></p>
                <p>Jumlah: <strong>${jumlah} ${symbol}</strong></p>
                <p>Nilai: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
            </div>
            <div class="result-amount">
                ${toRupiah(hasil.jumlah_zakat)}
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan</p>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Jumlah: <strong>${jumlah} ${symbol}</strong></p>
                <p>Nilai: <strong>${toRupiah(hasil.nilai_rupiah)}</strong></p>
                <p>Nisab: <strong>${toRupiah(hasil.nisab_dalam_rupiah)}</strong></p>
                <p>Kekurangan: <strong>${toRupiah(hasil.kekurangan)}</strong></p>
            </div>
        `;
    }
    
    resultDiv.style.display = 'block';
}

// ==========================================
// 🌾 TAMPILKAN HASIL PERTANIAN - FIXED
// ==========================================

function tampilkanHasilPertanian(hasil, hasilPanen) {
    const resultDiv = document.getElementById('result');
    
    // Format kg: tampilkan desimal hanya jika perlu
    const formatKg = (num) => {
        return num % 1 === 0 ? Math.round(num) : num.toFixed(2);
    };
    
    if (hasil.wajib_zakat) {
        resultDiv.className = 'result-box result-wajib';
        resultDiv.innerHTML = `
            <h3>✅ Alhamdulillah, Anda Wajib Zakat!</h3>
            <div class="result-detail">
                <p>Hasil Panen: <strong>${hasilPanen.toLocaleString('id-ID')} kg</strong></p>
                <p>Nisab: <strong>${hasil.nisab_kg} kg</strong></p>
                <p>Persentase: <strong>${hasil.persentase}%</strong></p>
            </div>
            <div class="result-amount" style="font-size: 1.8em;">
                ${formatKg(hasil.jumlah_zakat_kg)} kg
            </div>
            <p>Adalah jumlah zakat yang harus Anda keluarkan</p>
            <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                <p style="font-size: 1em; margin-bottom: 5px;">
                    💰 Setara: <strong style="font-size: 1.2em;">${toRupiah(hasil.jumlah_zakat_rupiah)}</strong>
                </p>
                <p style="font-size: 0.8em; opacity: 0.9;">
                    Berdasarkan harga beras ${toRupiah(hasil.harga_beras_per_kg)}/kg
                </p>
            </div>
        `;
    } else {
        resultDiv.className = 'result-box result-belum';
        resultDiv.innerHTML = `
            <h3>ℹ️ Hasil Panen Belum Mencapai Nisab</h3>
            <div class="result-detail">
                <p>Hasil Panen: <strong>${hasilPanen.toLocaleString('id-ID')} kg</strong></p>
                <p>Nisab: <strong>${hasil.nisab_kg} kg</strong></p>
                <p>Kekurangan: <strong>${formatKg(hasil.kekurangan_kg)} kg</strong></p>
            </div>
            <p style="margin-top: 15px;">Anda belum wajib mengeluarkan zakat pertanian, namun tetap bisa bersedekah 😊</p>
        `;
    }
    
    resultDiv.style.display = 'block';
}

// ==========================================
// EVENT LISTENERS
// ==========================================

document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Auto-refresh prices setiap jam
setInterval(() => {
    console.log('Auto-refreshing prices...');
    loadData();
}, 60 * 60 * 1000);

// Load data saat halaman dimuat
window.onload = loadData;