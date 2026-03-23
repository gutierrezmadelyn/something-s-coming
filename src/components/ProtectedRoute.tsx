import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const S = {
  bg: "#FAFBFC",
  blue: "#2851A3",
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: S.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: `4px solid ${S.blue}20`,
            borderTopColor: S.blue,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "24px",
            fontWeight: 700,
            color: S.blue,
            margin: 0
          }}>
            Negoworking
          </h1>
          <p style={{ color: "#6B7280", fontSize: "13px", marginTop: "8px" }}>
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
