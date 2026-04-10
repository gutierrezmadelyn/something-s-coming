import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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
  red: "#E11D48",
  redBg: "#FFF1F2",
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!email) {
      setFormError("Por favor ingresa tu correo electronico");
      return;
    }

    const { error } = await resetPassword(email);
    if (error) {
      setFormError(error.message || "Error al enviar el correo de recuperacion");
    } else {
      setSuccessMessage("Se ha enviado un enlace de recuperacion a tu correo electronico. Revisa tu bandeja de entrada.");
      setShowForgotPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setFormError("Por favor completa todos los campos");
      return;
    }

    if (!isLogin && !fullName) {
      setFormError("Por favor ingresa tu nombre completo");
      return;
    }

    if (password.length < 8) {
      setFormError("La contrasena debe tener al menos 8 caracteres");
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate("/");
      }
    } else {
      const { error, data } = await signUp(email, password, { full_name: fullName });
      if (!error && data) {
        setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
        setIsLogin(true);
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: S.bg,
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: S.card,
        borderRadius: "24px",
        padding: "32px",
        border: `1px solid ${S.border}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 700,
            color: S.blue,
            margin: 0
          }}>
            Negoworking
          </h1>
          <p style={{
            fontSize: "13px",
            color: S.textSec,
            marginTop: "8px",
            fontWeight: 500
          }}>
            Conecta con personas de tu interes
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: "flex",
          background: S.blueBg,
          borderRadius: "12px",
          padding: "4px",
          marginBottom: "24px"
        }}>
          <button
            onClick={() => { setIsLogin(true); setFormError(null); setSuccessMessage(null); }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: isLogin ? S.card : "transparent",
              color: isLogin ? S.blue : S.textSec,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: isLogin ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
            }}
          >
            Iniciar sesion
          </button>
          <button
            onClick={() => { setIsLogin(false); setFormError(null); setSuccessMessage(null); }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: !isLogin ? S.card : "transparent",
              color: !isLogin ? S.blue : S.textSec,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: !isLogin ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
            }}
          >
            Crear cuenta
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: S.greenBg,
            border: `1px solid ${S.green}30`,
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px"
          }}>
            <p style={{ margin: 0, color: S.green, fontSize: "13px", fontWeight: 500 }}>
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {(formError || error) && (
          <div style={{
            background: S.redBg,
            border: `1px solid ${S.red}30`,
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px"
          }}>
            <p style={{ margin: 0, color: S.red, fontSize: "13px", fontWeight: 500 }}>
              {formError || error?.message || "Error al procesar la solicitud"}
            </p>
          </div>
        )}

        {/* Forgot Password Form */}
        {showForgotPassword ? (
          <form onSubmit={handleResetPassword}>
            <p style={{
              fontSize: "13px",
              color: S.textSec,
              marginBottom: "16px",
              textAlign: "center"
            }}>
              Ingresa tu correo electronico y te enviaremos un enlace para restablecer tu contrasena.
            </p>

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
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `1.5px solid ${S.border}`,
                  fontSize: "14px",
                  color: S.text,
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = S.blue}
                onBlur={(e) => e.target.style.borderColor = S.border}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: loading ? S.textTer : S.blue,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                marginBottom: "12px"
              }}
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperacion"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setFormError(null);
              }}
              style={{
                width: "100%",
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
              Volver al inicio de sesion
            </button>
          </form>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit}>
              {!isLogin && (
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
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${S.border}`,
                      fontSize: "14px",
                      color: S.text,
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = S.blue}
                    onBlur={(e) => e.target.style.borderColor = S.border}
                  />
                </div>
              )}

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
                  Correo electronico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: `1.5px solid ${S.border}`,
                    fontSize: "14px",
                    color: S.text,
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = S.blue}
                  onBlur={(e) => e.target.style.borderColor = S.border}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: S.textSec,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Contrasena
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setFormError(null);
                        setSuccessMessage(null);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: S.blue,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      Olvide mi contrasena
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: `1.5px solid ${S.border}`,
                    fontSize: "14px",
                    color: S.text,
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = S.blue}
                  onBlur={(e) => e.target.style.borderColor = S.border}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: loading ? S.textTer : S.blue,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginBottom: "16px"
                }}
              >
                {loading ? "Procesando..." : (isLogin ? "Iniciar sesion" : "Crear cuenta")}
              </button>
            </form>


            {/* Test Account Info */}
            {isLogin && (
              <div style={{
                marginTop: "24px",
                padding: "12px 16px",
                background: S.blueBg,
                borderRadius: "12px",
                border: `1px solid ${S.blue}20`
              }}>
                <p style={{
                  margin: 0,
                  fontSize: "11px",
                  color: S.blue,
                  fontWeight: 600,
                  textAlign: "center"
                }}>
                  Cuenta de prueba: test@negoworking.com / Test123456!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
