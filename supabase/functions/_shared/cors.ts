// Shared CORS headers for Supabase Edge Functions with production origin security

// Functions use this static header; configure one canonical production origin.
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.split(",")[0].trim() || "*";

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const configuredOrigin = Deno.env.get("ALLOWED_ORIGIN");
  
  if (!configuredOrigin || configuredOrigin === "*") {
    return {
      'Access-Control-Allow-Origin': requestOrigin || '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
  }

  // Allow comma-separated multiple origins or exact match
  const allowedList = configuredOrigin.split(',').map(o => o.trim());
  const isAllowed = requestOrigin && allowedList.includes(requestOrigin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : allowedList[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}
