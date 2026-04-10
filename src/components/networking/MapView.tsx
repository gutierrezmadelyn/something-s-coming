// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Lock, Target, MessageCircle, Check } from "lucide-react";
import { S } from "./styles";
import { Avatar } from "./ui";
import { calcCompat } from "./utils";

// Component to auto-fit map bounds to show all markers
function FitBounds({ profiles, currentUserId, currentUserLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!profiles || profiles.length === 0) return;

    // Get all valid coordinates
    const validProfiles = profiles.filter(p =>
      p.lat && p.lng &&
      !isNaN(p.lat) && !isNaN(p.lng) &&
      p.lat >= -90 && p.lat <= 90 &&
      p.lng >= -180 && p.lng <= 180
    );

    if (validProfiles.length === 0) return;

    if (validProfiles.length === 1) {
      // Single profile - center on it with reasonable zoom
      map.setView([validProfiles[0].lat, validProfiles[0].lng], 10);
    } else {
      // Multiple profiles - fit bounds to show all
      const bounds = L.latLngBounds(
        validProfiles.map(p => [p.lat, p.lng])
      );

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12,
        animate: true
      });
    }
  }, [profiles, map]);

  return null;
}

const createCustomIcon = (color, isConnected = false, isCurrentUser = false) => {
  const size = isCurrentUser ? 28 : 24;
  const borderColor = isCurrentUser ? S.blue : (isConnected ? S.green : "white");
  const borderWidth = isCurrentUser ? 4 : 3;

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: ${borderWidth}px solid ${borderColor};
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ${isCurrentUser ? 'animation: pulse 2s infinite;' : ''}
    "></div>
    ${isCurrentUser ? `<style>
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 ${S.blue}40; }
        50% { box-shadow: 0 0 0 8px ${S.blue}00; }
      }
    </style>` : ''}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

export default function MapView({
  profiles,
  privacySettings,
  currentUserId,
  currentUser,
  matches = [],
  onConnect,
  onOpenChat,
  getCompatibility
}) {
  const [filters, setFilters] = useState({ sectors: [], expertise: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [compatScores, setCompatScores] = useState({});
  const [loadingCompat, setLoadingCompat] = useState({});

  // Get all unique sectors and expertise from profiles
  const filterOptions = useMemo(() => {
    const allSectors = new Set();
    const allExpertise = new Set();

    profiles.forEach(p => {
      (p.sectors || []).forEach(s => allSectors.add(s));
      (p.expertise || []).forEach(e => allExpertise.add(e));
    });

    return {
      sectors: Array.from(allSectors).sort(),
      expertise: Array.from(allExpertise).sort(),
    };
  }, [profiles]);

  // Check if a profile is connected
  const isConnected = (profileId) => {
    return matches.some(m => m.id === profileId);
  };

  // Get match data for a profile
  const getMatchData = (profileId) => {
    return matches.find(m => m.id === profileId);
  };

  // Filter visible profiles
  const visibleProfiles = useMemo(() => {
    let filtered = profiles.filter(p => {
      if (p.id === currentUserId) return privacySettings.showLocation;
      return p.showLocation !== false;
    });

    // Apply sector filter
    if (filters.sectors.length > 0) {
      filtered = filtered.filter(p =>
        (p.sectors || []).some(s => filters.sectors.includes(s))
      );
    }

    // Apply expertise filter
    if (filters.expertise.length > 0) {
      filtered = filtered.filter(p =>
        (p.expertise || []).some(e => filters.expertise.includes(e))
      );
    }

    return filtered;
  }, [profiles, currentUserId, privacySettings.showLocation, filters]);

  // Calculate compatibility when popup opens
  const loadCompatibility = async (profileId) => {
    if (compatScores[profileId] !== undefined || loadingCompat[profileId]) return;
    if (!currentUserId || profileId === currentUserId) return;

    setLoadingCompat(prev => ({ ...prev, [profileId]: true }));

    try {
      if (getCompatibility) {
        const score = await getCompatibility(currentUserId, profileId);
        setCompatScores(prev => ({ ...prev, [profileId]: score }));
      } else if (currentUser) {
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
          const score = calcCompat(currentUser, profile);
          setCompatScores(prev => ({ ...prev, [profileId]: score }));
        }
      }
    } catch (err) {
      console.error('Error loading compatibility:', err);
    } finally {
      setLoadingCompat(prev => ({ ...prev, [profileId]: false }));
    }
  };

  // Count by country
  const countries = useMemo(() => {
    const result = {};
    visibleProfiles.forEach(p => {
      if (!result[p.country]) result[p.country] = [];
      result[p.country].push(p);
    });
    return result;
  }, [visibleProfiles]);

  const hasActiveFilters = filters.sectors.length > 0 || filters.expertise.length > 0;

  const handleConnect = async (profile) => {
    if (onConnect) {
      await onConnect(profile);
    }
  };

  const handleOpenChat = (profile) => {
    const matchData = getMatchData(profile.id);
    if (onOpenChat && matchData) {
      onOpenChat(matchData);
    }
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>
        Comunidad Catalizadores
      </h3>
      <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "12px", fontFamily: "'DM Sans', sans-serif" }}>
        {visibleProfiles.length} de {profiles.length} participantes visibles · {Object.keys(countries).length} países
      </p>

      {/* Filter Bar */}
      <div style={{ marginBottom: "12px" }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: `1px solid ${hasActiveFilters ? S.blue : S.border}`,
            background: hasActiveFilters ? S.blueBg : S.card,
            color: hasActiveFilters ? S.blue : S.textSec,
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
          }}
        >
          <Target size={14}/>
          Filtrar por experticia
          {hasActiveFilters && (
            <span style={{
              background: S.blue,
              color: "#fff",
              padding: "2px 8px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 700,
            }}>
              {filters.sectors.length + filters.expertise.length}
            </span>
          )}
        </button>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{
            marginTop: "8px",
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: "12px",
            padding: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>
                Filtros de Mapa
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters({ sectors: [], expertise: [] })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: S.redBg,
                    color: S.red,
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Expertise Filter */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", color: S.textSec, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: "6px" }}>
                Experticia
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {filterOptions.expertise.slice(0, 10).map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setFilters(f => ({
                        ...f,
                        expertise: f.expertise.includes(e)
                          ? f.expertise.filter(x => x !== e)
                          : [...f.expertise, e]
                      }));
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: `1px solid ${filters.expertise.includes(e) ? S.green : S.border}`,
                      background: filters.expertise.includes(e) ? S.greenBg : S.card,
                      color: filters.expertise.includes(e) ? S.green : S.textSec,
                      fontSize: "11px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector Filter */}
            <div>
              <label style={{ fontSize: "11px", color: S.textSec, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: "6px" }}>
                Sectores
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {filterOptions.sectors.slice(0, 10).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setFilters(f => ({
                        ...f,
                        sectors: f.sectors.includes(s)
                          ? f.sectors.filter(x => x !== s)
                          : [...f.sectors, s]
                      }));
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: `1px solid ${filters.sectors.includes(s) ? S.blue : S.border}`,
                      background: filters.sectors.includes(s) ? S.blueBg : S.card,
                      color: filters.sectors.includes(s) ? S.blue : S.textSec,
                      fontSize: "11px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ background: S.card, borderRadius: "20px", overflow: "hidden", border: `1px solid ${S.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ width: "100%", height: "380px" }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds
            profiles={visibleProfiles}
            currentUserId={currentUserId}
            currentUserLocation={currentUser ? { lat: currentUser.lat, lng: currentUser.lng } : null}
          />
          {visibleProfiles.map(p => {
            const isMe = p.id === currentUserId;
            const connected = isConnected(p.id);
            const compat = compatScores[p.id];
            const isLoading = loadingCompat[p.id];

            return (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={createCustomIcon(p.color, connected, isMe)}
                eventHandlers={{
                  click: () => {
                    if (!isMe) loadCompatibility(p.id);
                  }
                }}
              >
                <Popup>
                  <div style={{ padding: "6px", minWidth: "200px", maxWidth: "240px" }}>
                    {/* Header with compatibility */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                      <Avatar profile={p} size={40}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#111", fontFamily: "'DM Sans', sans-serif" }}>
                            {p.name}
                          </p>
                          {!isMe && compat !== undefined && (
                            <span style={{
                              background: compat >= 70 ? S.greenBg : compat >= 40 ? S.yellowBg : S.cardLight,
                              color: compat >= 70 ? S.green : compat >= 40 ? S.yellowText : S.textSec,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              fontSize: "10px",
                              fontWeight: 700,
                              fontFamily: "'DM Sans', sans-serif",
                            }}>
                              {compat}%
                            </span>
                          )}
                          {!isMe && isLoading && (
                            <span style={{ fontSize: "10px", color: S.textTer }}>...</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontFamily: "'DM Sans', sans-serif" }}>
                          {p.role}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#888", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "3px" }}>
                      <MapPin size={12}/> {p.city ? `${p.city}, ${p.country}` : p.country}
                    </p>

                    {/* Expertise tags */}
                    {p.expertise && p.expertise.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                        {p.expertise.slice(0, 3).map(e => (
                          <span key={e} style={{
                            background: S.blueBg,
                            color: S.blue,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            {e}
                          </span>
                        ))}
                        {p.expertise.length > 3 && (
                          <span style={{ fontSize: "9px", color: S.textTer }}>
                            +{p.expertise.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Seeks */}
                    {p.seeks && p.seeks.length > 0 && (
                      <p style={{ margin: "0 0 10px", fontSize: "10px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>
                        <strong>Busca:</strong> {p.seeks.slice(0, 2).join(", ")}
                      </p>
                    )}

                    {/* Action Buttons */}
                    {!isMe && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        {connected ? (
                          <button
                            onClick={() => handleOpenChat(p)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "none",
                              background: S.green,
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                            }}
                          >
                            <MessageCircle size={14}/> Mensaje
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(p)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "none",
                              background: S.blue,
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                            }}
                          >
                            <Check size={14}/> Conectar
                          </button>
                        )}
                      </div>
                    )}

                    {isMe && (
                      <div style={{
                        background: S.blueBg,
                        color: S.blue,
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Tu ubicación
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: S.green, border: "2px solid " + S.green }}></span>
          Conectados
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ccc", border: "2px solid white" }}></span>
          Sin conectar
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: S.blue, border: "2px solid " + S.blue }}></span>
          Tú
        </span>
      </div>

      {/* Country badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {Object.entries(countries).sort((a, b) => b[1].length - a[1].length).map(([country, members]) => (
          <div key={country} style={{ background: S.card, borderRadius: "10px", padding: "6px 12px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: S.text, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{country}</span>
            <span style={{ fontSize: "10px", color: S.textSec, background: S.cardLight, padding: "1px 7px", borderRadius: "6px", fontWeight: 700 }}>{members.length}</span>
          </div>
        ))}
      </div>

      {/* Privacy warning */}
      {!privacySettings.showLocation && (
        <div style={{ marginTop: "12px", background: S.orangeBg, borderRadius: "10px", padding: "10px 14px", border: `1px solid ${S.orange}30` }}>
          <p style={{ margin: 0, fontSize: "12px", color: S.orange, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Lock size={12}/> Tu ubicacion esta oculta. Otros participantes no pueden verte en el mapa.</span>
          </p>
        </div>
      )}
    </div>
  );
}
