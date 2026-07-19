import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Country capital coordinates as fallback
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  "El Salvador": { lat: 13.6929, lng: -89.2182 },
  "Guatemala": { lat: 14.6349, lng: -90.5069 },
  "Honduras": { lat: 14.0723, lng: -87.1921 },
  "Peru": { lat: -12.0464, lng: -77.0428 },
  "Mexico": { lat: 19.4326, lng: -99.1332 },
  "México": { lat: 19.4326, lng: -99.1332 },
  "Venezuela": { lat: 10.4806, lng: -66.9036 },
  "Colombia": { lat: 4.711, lng: -74.0721 },
  "Republica Dominicana": { lat: 18.4861, lng: -69.9312 },
  "Costa Rica": { lat: 9.9281, lng: -84.0907 },
  "Panama": { lat: 8.9824, lng: -79.5199 },
  "Nicaragua": { lat: 12.1364, lng: -86.2514 },
  "Ecuador": { lat: -0.1807, lng: -78.4678 },
  "Bolivia": { lat: -16.4897, lng: -68.1193 },
  "Chile": { lat: -33.4489, lng: -70.6693 },
  "Argentina": { lat: -34.6037, lng: -58.3816 },
  "Uruguay": { lat: -34.9011, lng: -56.1645 },
  "Paraguay": { lat: -25.2637, lng: -57.5759 },
  "Brasil": { lat: -15.7975, lng: -47.8919 },
  "Brazil": { lat: -15.7975, lng: -47.8919 },
  "Cuba": { lat: 23.1136, lng: -82.3666 },
  "Puerto Rico": { lat: 18.4655, lng: -66.1057 },
  "España": { lat: 40.4168, lng: -3.7038 },
  "Spain": { lat: 40.4168, lng: -3.7038 },
  "United States": { lat: 38.9072, lng: -77.0369 },
  "USA": { lat: 38.9072, lng: -77.0369 },
  "Estados Unidos": { lat: 38.9072, lng: -77.0369 },
};

// Geocode using Nominatim API
async function geocodeLocation(
  country: string,
  city: string | null
): Promise<{ lat: number; lng: number }> {
  const fallback = COUNTRY_COORDS[country] || { lat: 14.5, lng: -87.5 };

  const query = city ? `${city}, ${country}` : country;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "Negoworking-App/1.0",
        },
      }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error(`Geocoding error for ${query}:`, error);
  }

  return fallback;
}

// Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional limit
    let limit = 50; // Default batch size
    let dryRun = false;

    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 100);
      if (body.dryRun) dryRun = body.dryRun;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get profiles without coordinates but with country
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, name, country, city, lat, lng")
      .is("lat", null)
      .not("country", "is", null)
      .limit(limit);

    if (fetchError) {
      throw new Error(`Error fetching profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No profiles need geocoding",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: Array<{
      id: string;
      name: string;
      country: string;
      city: string | null;
      lat: number;
      lng: number;
      status: string;
    }> = [];

    // Process each profile with rate limiting (1 req/second for Nominatim)
    for (const profile of profiles) {
      const coords = await geocodeLocation(profile.country, profile.city);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            lat: coords.lat,
            lng: coords.lng,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (updateError) {
          console.error(
            `Error updating profile ${profile.id}:`,
            updateError.message
          );
          results.push({
            id: profile.id,
            name: profile.name,
            country: profile.country,
            city: profile.city,
            lat: coords.lat,
            lng: coords.lng,
            status: `error: ${updateError.message}`,
          });
        } else {
          results.push({
            id: profile.id,
            name: profile.name,
            country: profile.country,
            city: profile.city,
            lat: coords.lat,
            lng: coords.lng,
            status: "updated",
          });
        }
      } else {
        results.push({
          id: profile.id,
          name: profile.name,
          country: profile.country,
          city: profile.city,
          lat: coords.lat,
          lng: coords.lng,
          status: "dry-run",
        });
      }

      // Rate limiting: wait 1.1 seconds between requests to respect Nominatim limits
      if (profiles.indexOf(profile) < profiles.length - 1) {
        await sleep(1100);
      }
    }

    const successCount = results.filter(
      (r) => r.status === "updated" || r.status === "dry-run"
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: dryRun
          ? `Dry run completed for ${successCount} profiles`
          : `Geocoded ${successCount} profiles`,
        processed: results.length,
        dryRun,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
