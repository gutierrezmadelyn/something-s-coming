import { useState, useEffect, useRef } from "react";
import { KeyRound, AlertTriangle } from "lucide-react";
import type { Profile } from "@/lib/database.types";
import { geocodeLocation } from "@/components/networking/utils";

const S = {
  bg: "#FAFBFC",
  card: "#FFFFFF",
  cardLight: "#F3F4F6",
  border: "#E5E7EB",
  text: "#111827",
  textSec: "#6B7280",
  textTer: "#9CA3AF",
  blue: "#2851A3",
  blueBg: "#EEF2FF",
  green: "#059669",
  greenBg: "#ECFDF5",
  red: "#E11D48",
  redBg: "#FFF1F2",
  yellow: "#FFC800",
  yellowBg: "#FFF4CC",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
};

const EXPERTISE_OPTIONS = [
  "Estrategia empresarial",
  "Gestion financiera",
  "Marketing y ventas",
  "Inteligencia de negocios",
  "Recursos Humanos",
  "Tecnologia de la informacion",
  "Mejora de procesos",
  "Gestion del cambio",
  "Gestion de riesgos y cumplimiento normativo",
  "Internacionalizacion y expansion",
  "Impacto ambiental o social",
  "Asistencia tecnica especializada",
];

// Country codes mapping
const COUNTRY_CODES: Record<string, string> = {
  "El Salvador": "+503",
  "Guatemala": "+502",
  "Honduras": "+504",
  "Costa Rica": "+506",
  "Nicaragua": "+505",
  "Peru": "+51",
  "Mexico": "+52",
  "Venezuela": "+58",
  "Colombia": "+57",
  "Republica Dominicana": "+1",
};

const OFFERS_OPTIONS = [
  "Metodologias probadas",
  "Experiencia sectorial especifica",
  "Mentoria y acompanamiento",
  "Alianza para proyectos conjuntos",
  "Contactos y red de clientes",
  "Experiencia en convocatorias/cooperacion",
  "Medicion de impacto",
  "Casos de exito replicables",
];

const SEEKS_OPTIONS = [
  "Aliados complementarios",
  "Nuevas metodologias o enfoques",
  "Experiencia en tematica que no domino",
  "Ampliar mi red en un sector",
  "Oportunidades de proyectos conjuntos",
  "Informacion sobre convocatorias",
  "Mentoria de alguien con mas experiencia",
  "Clientes o referidos",
];

const SECTOR_OPTIONS = [
  "Agroindustria y alimentos",
  "Comercio y retail",
  "E-commerce y marketplace",
  "Construccion e inmobiliario",
  "Economia creativa y cultura",
  "Educacion",
  "Energia y sostenibilidad",
  "Finanzas y banca",
  "Logistica y transporte",
  "Manufactura",
  "Salud y bienestar",
  "Sociedad civil / ONGs",
  "Cooperacion internacional",
  "Sector publico / gobierno",
  "PyMEs en general",
  "Tecnologia e innovacion",
  "Turismo y hospitalidad",
];

const ORGANIZATION_TYPE_OPTIONS = [
  "Academia",
  "Asociacion_empresas",
  "Colectivo",
  "Empresa_privada",
  "Empresa_publica",
  "Empresa_social",
  "Gobierno",
  "ONG",
];

const WORK_TYPE_OPTIONS = [
  { value: "Empleado", label: "Empleado" },
  { value: "Independiente", label: "Independiente" },
  { value: "Ambos", label: "Ambos" },
];

const COUNTRY_OPTIONS = [
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Costa Rica",
  "Nicaragua",
  "Peru",
  "Mexico",
  "Venezuela",
  "Colombia",
  "Republica Dominicana",
];

// Cities by country - principales ciudades de cada país
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "El Salvador": [
    "San Salvador",
    "Santa Ana",
    "San Miguel",
    "Soyapango",
    "Santa Tecla",
    "Apopa",
    "Mejicanos",
    "Delgado",
    "Usulután",
    "Ahuachapán",
  ],
  "Guatemala": [
    "Ciudad de Guatemala",
    "Mixco",
    "Villa Nueva",
    "Quetzaltenango",
    "San Juan Sacatepéquez",
    "Petapa",
    "Escuintla",
    "Chinautla",
    "Huehuetenango",
    "Cobán",
  ],
  "Honduras": [
    "Tegucigalpa",
    "San Pedro Sula",
    "Choloma",
    "La Ceiba",
    "El Progreso",
    "Comayagua",
    "Choluteca",
    "Danlí",
    "Siguatepeque",
    "Juticalpa",
  ],
  "Peru": [
    "Lima",
    "Arequipa",
    "Trujillo",
    "Chiclayo",
    "Piura",
    "Cusco",
    "Iquitos",
    "Huancayo",
    "Tacna",
    "Pucallpa",
  ],
  "Mexico": [
    "Ciudad de México",
    "Guadalajara",
    "Monterrey",
    "Puebla",
    "Tijuana",
    "León",
    "Juárez",
    "Zapopan",
    "Mérida",
    "Querétaro",
  ],
  "México": [
    "Ciudad de México",
    "Guadalajara",
    "Monterrey",
    "Puebla",
    "Tijuana",
    "León",
    "Juárez",
    "Zapopan",
    "Mérida",
    "Querétaro",
  ],
  "Venezuela": [
    "Caracas",
    "Maracaibo",
    "Valencia",
    "Barquisimeto",
    "Maracay",
    "Ciudad Guayana",
    "Barcelona",
    "Maturín",
    "San Cristóbal",
    "Barinas",
  ],
  "Colombia": [
    "Bogotá",
    "Medellín",
    "Cali",
    "Barranquilla",
    "Cartagena",
    "Cúcuta",
    "Bucaramanga",
    "Pereira",
    "Santa Marta",
    "Ibagué",
  ],
  "Republica Dominicana": [
    "Santo Domingo",
    "Santiago de los Caballeros",
    "Santo Domingo Este",
    "Santo Domingo Norte",
    "San Pedro de Macorís",
    "La Romana",
    "San Cristóbal",
    "Puerto Plata",
    "San Francisco de Macorís",
    "Higüey",
  ],
};

const AVATAR_COLORS = [
  "#58CC02", "#1CB0F6", "#CE82FF", "#FF4B4B", "#FFC800", "#AFAFAF", "#2851A3"
];

// Input component - defined outside to prevent re-creation on each render
const Input = ({ label, value, onChange, placeholder, type = "text", multiline = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: S.textSec,
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }}>
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1.5px solid ${S.border}`,
          fontSize: "14px",
          color: S.text,
          outline: "none",
          resize: "vertical",
          fontFamily: "'DM Sans', sans-serif",
          boxSizing: "border-box"
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1.5px solid ${S.border}`,
          fontSize: "14px",
          color: S.text,
          outline: "none",
          boxSizing: "border-box"
        }}
      />
    )}
  </div>
);

// Select component - defined outside to prevent re-creation on each render
const Select = ({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[] | string[];
}) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: S.textSec,
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: "12px",
        border: `1.5px solid ${S.border}`,
        fontSize: "14px",
        color: S.text,
        outline: "none",
        background: S.card,
        cursor: "pointer",
        boxSizing: "border-box"
      }}
    >
      <option value="">Seleccionar...</option>
      {options.map(opt => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lab = typeof opt === "string" ? opt : opt.label;
        return <option key={val} value={val}>{lab}</option>;
      })}
    </select>
  </div>
);

// MultiSelect component - defined outside to prevent re-creation on each render
const MultiSelect = ({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
}) => (
  <div style={{ marginBottom: "20px" }}>
    <label style={{
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: S.textSec,
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }}>
      {label}
    </label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: `1.5px solid ${selected.includes(option) ? S.blue : S.border}`,
            background: selected.includes(option) ? S.blueBg : S.card,
            color: selected.includes(option) ? S.blue : S.textSec,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

interface ProfileFormProps {
  profile: Profile | null;
  onSave: (updates: Partial<Profile>) => Promise<void>;
  onCancel?: () => void;
  isOnboarding?: boolean;
  onDeleteAccount?: () => Promise<{ error: Error | null }>;
  onChangePassword?: (newPassword: string) => Promise<{ error: Error | null }>;
}

export default function ProfileForm({ profile, onSave, onCancel, isOnboarding = false, onDeleteAccount, onChangePassword }: ProfileFormProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    city: "",
    role: "",
    work_type: "Independiente",
    organization: "",
    organization_description: "",
    pitch: "",
    expertise: [] as string[],
    wants_to_learn: [] as string[],
    sectors: [] as string[],
    offers: [] as string[],
    seeks: [] as string[],
    whatsapp: "",
    linkedin: "",
    avatar_color: AVATAR_COLORS[0],
    show_location: true,
    show_phone: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize form data once when profile is first loaded
    if (profile && !initializedRef.current) {
      initializedRef.current = true;
      setFormData({
        name: profile.name || "",
        country: profile.country || "",
        city: profile.city || "",
        role: profile.role || "",
        work_type: profile.work_type || "Independiente",
        organization: profile.organization || "",
        organization_description: profile.organization_description || "",
        pitch: profile.pitch || "",
        expertise: (profile.expertise || []).filter(v => EXPERTISE_OPTIONS.includes(v)),
        wants_to_learn: (Array.isArray(profile.wants_to_learn) ? profile.wants_to_learn : (profile.wants_to_learn ? [profile.wants_to_learn] : [])).filter(v => EXPERTISE_OPTIONS.includes(v)),
        sectors: (profile.sectors || []).filter(v => SECTOR_OPTIONS.includes(v)),
        offers: (profile.offers || []).filter(v => OFFERS_OPTIONS.includes(v)),
        seeks: (profile.seeks || []).filter(v => SEEKS_OPTIONS.includes(v)),
        whatsapp: profile.whatsapp || "",
        linkedin: profile.linkedin || "",
        avatar_color: profile.avatar_color || AVATAR_COLORS[0],
        show_location: profile.show_location ?? true,
        show_phone: profile.show_phone ?? true,
      });
    }
  }, [profile]);

  const MAX_SELECTIONS: Record<string, number> = {
    expertise: 3,
    wants_to_learn: 3,
    offers: 4,
    seeks: 3,
    sectors: 5,
  };

  const handleToggleArray = (field: "expertise" | "offers" | "seeks" | "wants_to_learn" | "sectors", value: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else if (current.length < (MAX_SELECTIONS[field] || Infinity)) {
        return { ...prev, [field]: [...current, value] };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields (all except linkedin, whatsapp, city)
    if (!formData.name.trim()) {
      setError("Por favor ingresa tu nombre");
      return;
    }

    if (!formData.country) {
      setError("Por favor selecciona tu pais");
      return;
    }

    if (!formData.role) {
      setError("Por favor selecciona el tipo de organizacion");
      return;
    }

    if (!formData.work_type) {
      setError("Por favor selecciona el tipo de trabajo");
      return;
    }

    if (!formData.pitch.trim()) {
      setError("Por favor ingresa tu pitch");
      return;
    }

    if (formData.expertise.length === 0) {
      setError("Selecciona al menos una expertise");
      return;
    }

    if (formData.offers.length === 0) {
      setError("Selecciona al menos una opcion en 'Lo que ofrezco'");
      return;
    }

    if (formData.seeks.length === 0) {
      setError("Selecciona al menos una opcion en 'Lo que busco'");
      return;
    }

    setSaving(true);
    try {
      // Generate avatar initials from name
      const nameParts = formData.name.trim().split(" ");
      const initials = nameParts.length >= 2
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
        : nameParts[0].substring(0, 2);

      // Geocode location from country + city
      const coords = await geocodeLocation(formData.country, formData.city);

      await onSave({
        ...formData,
        lat: coords.lat,
        lng: coords.lng,
        avatar_initials: initials.toUpperCase(),
        has_logged_in: true,
      });
    } catch (err) {
      setError("Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: isOnboarding ? "0" : "16px 0" }}>
      {!isOnboarding && (
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "20px",
          fontWeight: 700,
          color: S.text,
          marginBottom: "20px"
        }}>
          Editar Perfil
        </h3>
      )}

      {error && (
        <div style={{
          background: S.redBg,
          border: `1px solid ${S.red}30`,
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "16px"
        }}>
          <p style={{ margin: 0, color: S.red, fontSize: "13px", fontWeight: 500 }}>
            {error}
          </p>
        </div>
      )}

      {/* Avatar Color */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: S.textSec,
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Color de avatar
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          {AVATAR_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, avatar_color: color }))}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: color,
                border: formData.avatar_color === color ? `3px solid ${S.text}` : `3px solid transparent`,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            />
          ))}
        </div>
      </div>

      <Input
        label="Nombre completo"
        value={formData.name}
        onChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
        placeholder="Tu nombre completo"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Select
          label="Pais"
          value={formData.country}
          onChange={(v) => setFormData(prev => ({
            ...prev,
            country: v,
            city: prev.city // Mantener ciudad al cambiar país
          }))}
          options={COUNTRY_OPTIONS}
        />
        <Input
          label="Ciudad"
          value={formData.city}
          onChange={(v) => setFormData(prev => ({ ...prev, city: v }))}
          placeholder="Escribe tu ciudad"
        />
      </div>

      <Select
        label="Tipo de organizacion"
        value={formData.role}
        onChange={(v) => setFormData(prev => ({ ...prev, role: v }))}
        options={ORGANIZATION_TYPE_OPTIONS}
      />

      <div style={{ marginBottom: "16px" }}>
        <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: S.textSec,
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Descripcion de la organizacion
        </label>
        <textarea
          value={formData.organization_description}
          onChange={(e) => {
            if (e.target.value.length <= 200) {
              setFormData(prev => ({ ...prev, organization_description: e.target.value }));
            }
          }}
          placeholder="Breve descripcion de lo que hace tu organizacion"
          rows={3}
          maxLength={200}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: `1.5px solid ${S.border}`,
            fontSize: "14px",
            color: S.text,
            outline: "none",
            resize: "vertical",
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: "border-box"
          }}
        />
        <p style={{
          margin: "4px 0 0",
          fontSize: "11px",
          color: formData.organization_description.length >= 190 ? S.red : S.textTer,
          textAlign: "right"
        }}>
          {formData.organization_description.length}/200
        </p>
      </div>

      <Select
        label="Tipo de trabajo"
        value={formData.work_type}
        onChange={(v) => setFormData(prev => ({ ...prev, work_type: v }))}
        options={WORK_TYPE_OPTIONS}
      />

      <Input
        label="Organizacion"
        value={formData.organization}
        onChange={(v) => setFormData(prev => ({ ...prev, organization: v }))}
        placeholder="Nombre de tu organizacion"
      />

      <Input
        label="Tu pitch (describe lo que haces)"
        value={formData.pitch}
        onChange={(v) => setFormData(prev => ({ ...prev, pitch: v }))}
        placeholder="En una frase, que te hace unico/a como catalizador/a?"
        multiline
      />

      <MultiSelect
        label="Tu expertise (max 3)"
        options={EXPERTISE_OPTIONS}
        selected={formData.expertise}
        onChange={(v) => handleToggleArray("expertise", v)}
      />

      <MultiSelect
        label="Quiero aprender sobre (max 3)"
        options={EXPERTISE_OPTIONS}
        selected={formData.wants_to_learn}
        onChange={(v) => handleToggleArray("wants_to_learn", v)}
      />

      <MultiSelect
        label="Lo que ofrezco (max 4)"
        options={OFFERS_OPTIONS}
        selected={formData.offers}
        onChange={(v) => handleToggleArray("offers", v)}
      />

      <MultiSelect
        label="Lo que busco (max 3)"
        options={SEEKS_OPTIONS}
        selected={formData.seeks}
        onChange={(v) => handleToggleArray("seeks", v)}
      />

      <MultiSelect
        label="Sectores en los que trabajas (max 5)"
        options={SECTOR_OPTIONS}
        selected={formData.sectors}
        onChange={(v) => handleToggleArray("sectors", v)}
      />

      <div style={{ marginBottom: "16px" }}>
        <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: S.textSec,
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          WhatsApp
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{
            padding: "12px 16px",
            borderRadius: "12px",
            border: `1.5px solid ${S.border}`,
            background: S.cardLight,
            fontSize: "14px",
            color: S.text,
            fontWeight: 600,
            minWidth: "60px",
            textAlign: "center"
          }}>
            {formData.country ? COUNTRY_CODES[formData.country] || "+00" : "+00"}
          </div>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="1234 5678"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "12px",
              border: `1.5px solid ${S.border}`,
              fontSize: "14px",
              color: S.text,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: S.textSec,
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          LinkedIn (enlace)
        </label>
        <input
          type="url"
          value={formData.linkedin}
          onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
          placeholder="https://www.linkedin.com/in/tu-perfil"
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: `1.5px solid ${formData.linkedin && !formData.linkedin.startsWith('http') ? S.red : S.border}`,
            fontSize: "14px",
            color: S.text,
            outline: "none",
            boxSizing: "border-box"
          }}
        />
        {formData.linkedin && !formData.linkedin.startsWith('http') && (
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: S.red }}>
            Ingresa el enlace completo (ej: https://www.linkedin.com/in/tu-perfil)
          </p>
        )}
      </div>

      {/* Privacy toggles */}
      <div style={{
        background: S.cardLight,
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <p style={{
          fontSize: "12px",
          fontWeight: 600,
          color: S.textSec,
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Privacidad
        </p>
        {[
          { key: "show_location", label: "Mostrar mi ubicacion en el mapa" },
          { key: "show_phone", label: "Mostrar mi telefono a otros usuarios" },
        ].map(item => (
          <div key={item.key} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0"
          }}>
            <span style={{ fontSize: "13px", color: S.text }}>{item.label}</span>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: formData[item.key as keyof typeof formData] ? S.green : S.border,
                position: "relative",
                transition: "background 0.2s"
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 3,
                left: formData[item.key as keyof typeof formData] ? 23 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: `1.5px solid ${S.border}`,
              background: S.card,
              color: S.textSec,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: saving ? S.textTer : S.blue,
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>

      {/* Change Password Section */}
      {!isOnboarding && onChangePassword && (
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: S.cardLight,
          borderRadius: "16px",
          border: `1px solid ${S.border}`
        }}>
          <button
            type="button"
            onClick={() => {
              setShowChangePassword(!showChangePassword);
              setPasswordError(null);
              setPasswordSuccess(false);
              setNewPassword("");
              setConfirmPassword("");
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: S.blue,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <KeyRound size={14}/> {showChangePassword ? "Ocultar" : "Cambiar contrasena"}
          </button>

          {showChangePassword && (
            <div style={{ marginTop: "16px" }}>
              {passwordSuccess && (
                <div style={{
                  background: S.greenBg,
                  border: `1px solid ${S.green}30`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "16px"
                }}>
                  <p style={{ margin: 0, color: S.green, fontSize: "13px", fontWeight: 500 }}>
                    Contrasena actualizada correctamente
                  </p>
                </div>
              )}

              {passwordError && (
                <div style={{
                  background: S.redBg,
                  border: `1px solid ${S.red}30`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "16px"
                }}>
                  <p style={{ margin: 0, color: S.red, fontSize: "13px", fontWeight: 500 }}>
                    {passwordError}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: S.textSec,
                  marginBottom: "6px"
                }}>
                  Nueva contrasena
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: `1.5px solid ${S.border}`,
                    fontSize: "14px",
                    color: S.text,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: S.textSec,
                  marginBottom: "6px"
                }}>
                  Confirmar contrasena
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contrasena"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: `1.5px solid ${S.border}`,
                    fontSize: "14px",
                    color: S.text,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="button"
                disabled={changingPassword}
                onClick={async () => {
                  setPasswordError(null);
                  setPasswordSuccess(false);

                  if (newPassword.length < 8) {
                    setPasswordError("La contrasena debe tener al menos 8 caracteres");
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordError("Las contrasenas no coinciden");
                    return;
                  }

                  setChangingPassword(true);
                  const { error } = await onChangePassword(newPassword);
                  setChangingPassword(false);

                  if (error) {
                    setPasswordError(error.message || "Error al cambiar la contrasena");
                  } else {
                    setPasswordSuccess(true);
                    setNewPassword("");
                    setConfirmPassword("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: changingPassword ? S.textTer : S.blue,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: changingPassword ? "not-allowed" : "pointer"
                }}
              >
                {changingPassword ? "Actualizando..." : "Actualizar contrasena"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Account Section */}
      {!isOnboarding && onDeleteAccount && (
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: S.redBg,
          borderRadius: "16px",
          border: `1px solid ${S.red}30`
        }}>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "transparent",
                color: S.red,
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <AlertTriangle size={14}/> Eliminar mi cuenta
            </button>
          ) : (
            <div>
              <p style={{
                margin: "0 0 12px",
                color: S.red,
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center"
              }}>
                ¿Estas seguro de que quieres eliminar tu cuenta?
              </p>
              <p style={{
                margin: "0 0 16px",
                color: S.text,
                fontSize: "12px",
                textAlign: "center"
              }}>
                Esta accion no se puede deshacer. Todos tus datos, matches y conversaciones seran eliminados permanentemente.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: `1.5px solid ${S.border}`,
                    background: S.card,
                    color: S.textSec,
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    await onDeleteAccount();
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    background: deleting ? S.textTer : S.red,
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer"
                  }}
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
