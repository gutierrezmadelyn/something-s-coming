import { useState } from "react";
import ProfileForm from "./ProfileForm";
import type { Profile } from "@/lib/database.types";

const S = {
  bg: "#FAFBFC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSec: "#6B7280",
  textTer: "#9CA3AF",
  blue: "#2851A3",
  blueBg: "#EEF2FF",
  green: "#059669",
  greenBg: "#ECFDF5",
};

interface OnboardingProps {
  profile: Profile | null;
  onComplete: (updates: Partial<Profile>) => Promise<void>;
}

export default function Onboarding({ profile, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bienvenido/a a Negoworking",
      subtitle: "La comunidad de catalizadores empresariales",
      content: (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚀</div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "24px",
            fontWeight: 700,
            color: S.text,
            marginBottom: "12px"
          }}>
            {profile?.name ? `Hola, ${profile.name.split(" ")[0]}!` : "Bienvenido/a!"}
          </h2>
          <p style={{
            fontSize: "14px",
            color: S.textSec,
            lineHeight: 1.6,
            maxWidth: "320px",
            margin: "0 auto 24px"
          }}>
            Negoworking te conecta con otros consultores, coaches y facilitadores
            de America Latina para crear sinergias y proyectos colaborativos.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "24px"
          }}>
            {[
              { icon: "🔍", label: "Explora perfiles" },
              { icon: "🎯", label: "Conecta" },
              { icon: "💬", label: "Colabora" },
            ].map(item => (
              <div key={item.label} style={{
                background: S.blueBg,
                borderRadius: "12px",
                padding: "16px 12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "6px" }}>{item.icon}</div>
                <p style={{ fontSize: "11px", color: S.blue, fontWeight: 600, margin: 0 }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: S.blue,
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Comenzar
          </button>
        </div>
      )
    },
    {
      title: "Completa tu perfil",
      subtitle: "Asi otros catalizadores pueden conocerte mejor",
      content: (
        <div>
          <div style={{
            background: S.greenBg,
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ fontSize: "20px" }}>⚡</span>
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: S.green, fontWeight: 600 }}>
                +50 XP por perfil completo
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.textSec }}>
                Sube de nivel y destaca en el ranking
              </p>
            </div>
          </div>
          <ProfileForm
            profile={profile}
            onSave={async (updates) => {
              await onComplete(updates);
            }}
            isOnboarding={true}
          />
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div style={{
      minHeight: "100vh",
      background: S.bg,
      fontFamily: "'DM Sans', sans-serif",
      padding: "20px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      <div style={{
        maxWidth: "440px",
        margin: "0 auto"
      }}>
        {/* Progress */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px"
        }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? S.blue : S.border,
                transition: "background 0.3s"
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "22px",
            fontWeight: 700,
            color: S.blue,
            margin: "0 0 4px"
          }}>
            {currentStep.title}
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: S.textSec }}>
            {currentStep.subtitle}
          </p>
        </div>

        {/* Content */}
        <div style={{
          background: S.card,
          borderRadius: "20px",
          padding: "24px",
          border: `1px solid ${S.border}`
        }}>
          {currentStep.content}
        </div>

        {/* Skip (only on step 0) */}
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "12px",
              background: "transparent",
              border: "none",
              color: S.textTer,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Ya tengo cuenta configurada
          </button>
        )}
      </div>
    </div>
  );
}
