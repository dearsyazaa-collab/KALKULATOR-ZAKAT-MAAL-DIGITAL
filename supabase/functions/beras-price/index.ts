import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Harga beras fallback (update manual dari BPS/Kemendag)
    // Sumber: https://pihps.kemendag.go.id/
    const HARGA_BERAS = 15500; // Rp per kg - Januari 2026

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          price: HARGA_BERAS,
          price_formatted: `Rp ${HARGA_BERAS.toLocaleString('id-ID')}`,
          source: 'Manual Update (Kemendag)',
          quality: 'Medium',
          location: 'Nasional',
          timestamp: new Date().toISOString(),
          unit: 'per kg'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});