"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "#f4f6fa",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(180deg, #001e46 0%, #0a2e5c 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          !
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111a26", margin: 0 }}>Application error</h1>
          <p style={{ marginTop: 6, maxWidth: 360, fontSize: 14, color: "#64748b" }}>
            Something went badly wrong loading the app. Try reloading — if it keeps happening, contact IT support.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            background: "linear-gradient(180deg, #001e46 0%, #0a2e5c 100%)",
            color: "#fff",
            border: "1px solid #001e46",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
