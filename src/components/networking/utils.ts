// @ts-nocheck
import type { Profile } from "@/lib/database.types";

export const getLevel = (xp) => {
  if (xp >= 300) return 5;
  if (xp >= 200) return 4;
  if (xp >= 120) return 3;
  if (xp >= 50) return 2;
  return 1;
};

export const getLevelThresholds = (level) => {
  const thresholds = {
    1: { min: 0, max: 49 },
    2: { min: 50, max: 119 },
    3: { min: 120, max: 199 },
    4: { min: 200, max: 299 },
    5: { min: 300, max: 999 },
  };
  return thresholds[level];
};

export const convertProfileToLegacy = (dbProfile: Profile) => {
  if (!dbProfile) return null;
  return {
    id: dbProfile.id,
    name: dbProfile.name || "",
    country: dbProfile.country || "",
    city: dbProfile.city || "",
    lat: dbProfile.lat || 14.5,
    lng: dbProfile.lng || -87.5,
    role: dbProfile.role || "",
    workType: dbProfile.work_type || "Independiente",
    org: dbProfile.organization || null,
    orgDescription: dbProfile.organization_description || null,
    pitch: dbProfile.pitch || "",
    expertise: dbProfile.expertise || [],
    wantsToLearn: dbProfile.wants_to_learn || "",
    sectors: dbProfile.sectors || [],
    offers: dbProfile.offers || [],
    seeks: dbProfile.seeks || [],
    whatsapp: dbProfile.whatsapp || "",
    linkedin: dbProfile.linkedin || "",
    avatar: dbProfile.avatar_initials || dbProfile.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "??",
    color: dbProfile.avatar_color || "#1CB0F6",
    photo: dbProfile.photo_url || null,
    lastActive: dbProfile.last_active || null,
    hasLoggedIn: dbProfile.has_logged_in || false,
    swipeCount: dbProfile.swipe_count || 0,
    showLocation: dbProfile.show_location ?? true,
    showPhone: dbProfile.show_phone ?? true,
    streak: dbProfile.streak || 0,
    league: dbProfile.league || "none",
    conversationsStarted: dbProfile.conversations_started || 0,
    matchCount: dbProfile.match_count || 0,
    xp: dbProfile.xp || 0,
    isAdmin: dbProfile.is_admin || false,
    email: dbProfile.email || "",
  };
};

// Country capital coordinates as fallback
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  "El Salvador": { lat: 13.6929, lng: -89.2182 },
  "Guatemala": { lat: 14.6349, lng: -90.5069 },
  "Honduras": { lat: 14.0723, lng: -87.1921 },
  "Peru": { lat: -12.0464, lng: -77.0428 },
  "Mexico": { lat: 19.4326, lng: -99.1332 },
  "Venezuela": { lat: 10.4806, lng: -66.9036 },
  "Colombia": { lat: 4.7110, lng: -74.0721 },
  "Republica Dominicana": { lat: 18.4861, lng: -69.9312 },
};

export const geocodeLocation = async (country: string, city: string): Promise<{ lat: number; lng: number }> => {
  const fallback = COUNTRY_COORDS[country] || { lat: 14.5, lng: -87.5 };

  const query = city ? `${city}, ${country}` : country;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Silently fall back to country coordinates
  }

  return fallback;
};

export const calcCompat = (a, b) => {
  let s = 0;
  s += a.offers.filter(o => b.seeks.includes(o)).length * 10;
  s += a.seeks.filter(x => b.offers.includes(x)).length * 10;
  s += a.expertise.filter(e => !b.expertise.includes(e)).length * 10;
  s += a.sectors.filter(x => b.sectors.includes(x)).length * 7;
  if (b.expertise.includes(a.wantsToLearn)) s += 15;
  if (a.expertise.includes(b.wantsToLearn)) s += 10;
  return Math.min(Math.round(s), 100);
};
