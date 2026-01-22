// supabase/functions/stock-price/index.ts
// Deploy dengan: supabase functions deploy stock-price

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { stock } = await req.json();
    
    if (!stock) {
      return new Response(
        JSON.stringify({ error: "STOCK_CODE_REQUIRED" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📊 Fetching price for ${stock}...`);

    // Format symbol untuk Yahoo Finance (Indonesian stocks use .JK suffix)
    const symbol = `${stock}.JK`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

    const yahooRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    if (!yahooRes.ok) {
      console.error(`Yahoo Finance returned ${yahooRes.status}`);
      return new Response(
        JSON.stringify({ 
          error: "YAHOO_FETCH_FAILED", 
          status: yahooRes.status,
          stock: stock
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const json = await yahooRes.json();
    
    // Extract price from Yahoo Finance response
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    
    // Try multiple price fields
    let price = meta?.regularMarketPrice;
    
    if (!price || isNaN(price)) {
      // Fallback to previous close
      price = meta?.previousClose;
    }
    
    if (!price || isNaN(price)) {
      // Fallback to chart data
      const closes = result?.indicators?.quote?.[0]?.close;
      if (closes && closes.length > 0) {
        price = closes[closes.length - 1];
      }
    }

    if (!price || isNaN(price)) {
      console.error(`No valid price found for ${stock}`);
      return new Response(
        JSON.stringify({ 
          error: "PRICE_NOT_FOUND",
          stock: stock,
          debug: {
            hasResult: !!result,
            hasMeta: !!meta,
            metaKeys: meta ? Object.keys(meta) : []
          }
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ ${stock} price: ${price}`);

    return new Response(
      JSON.stringify({
        stock: stock,
        price: Math.round(price),
        currency: meta?.currency || 'IDR',
        exchange: meta?.exchangeName || 'JKT',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (e) {
    console.error('Edge Function error:', e);
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        detail: e.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});