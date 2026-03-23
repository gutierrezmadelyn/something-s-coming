// @ts-nocheck
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { S } from "./styles";
import { MAP_CENTER, MAP_ZOOM } from "./constants";
import { Avatar } from "./ui";

const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

export default function MapView({ profiles, privacySettings, currentUserId }) {
  const visibleProfiles = profiles.filter(p => {
    if (p.id === currentUserId) return privacySettings.showLocation;
    return p.showLocation !== false;
  });

  const countries = {};
  profiles.forEach(p => {
    if (!countries[p.country]) countries[p.country] = [];
    countries[p.country].push(p);
  });

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
      <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "16px", fontFamily: "'DM Sans', sans-serif" }}>{visibleProfiles.length} de {profiles.length} participantes visibles · {Object.keys(countries).length} países</p>

      <div style={{ background: S.card, borderRadius: "20px", overflow: "hidden", border: `1px solid ${S.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ width: "100%", height: "350px" }} scrollWheelZoom={true}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {visibleProfiles.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createCustomIcon(p.color)}>
              <Popup>
                <div style={{ padding: "4px", minWidth: "160px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Avatar profile={p} size={32}/>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: "#111", fontFamily: "'DM Sans', sans-serif" }}>{p.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#666", fontFamily: "'DM Sans', sans-serif" }}>{p.role}</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>📍 {p.city}, {p.country}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {Object.entries(countries).sort((a, b) => b[1].length - a[1].length).map(([country, members]) => (
          <div key={country} style={{ background: S.card, borderRadius: "10px", padding: "6px 12px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: S.text, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{country}</span>
            <span style={{ fontSize: "10px", color: S.textSec, background: S.cardLight, padding: "1px 7px", borderRadius: "6px", fontWeight: 700 }}>{members.length}</span>
          </div>
        ))}
      </div>

      {!privacySettings.showLocation && (
        <div style={{ marginTop: "12px", background: S.orangeBg, borderRadius: "10px", padding: "10px 14px", border: `1px solid ${S.orange}30` }}>
          <p style={{ margin: 0, fontSize: "12px", color: S.orange, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            🔒 Tu ubicación está oculta. Otros participantes no pueden verte en el mapa.
          </p>
        </div>
      )}
    </div>
  );
}
