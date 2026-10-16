import React from "react";
import { TERMS_SECTIONS, EFFECTIVE } from "./legalContent";

export default function TermsOfService({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 24, color: "#FFFFFF", height: "fit-content" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 4, fontWeight: 800 }}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: "#B7C4DC", marginBottom: 16 }}>{EFFECTIVE}</p>

        <div style={{ fontSize: 13, color: "#E4E8F2", lineHeight: 1.6 }}>
          {TERMS_SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {s.h && <div style={{ fontWeight: 800, color: "#FFFFFF", marginBottom: 4 }}>{s.h}</div>}
              {s.ul && (
                <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>
                  {s.ul.map((item, j) => <li key={j} style={{ marginBottom: 4 }}>{item}</li>)}
                </ul>
              )}
              {s.p && s.p.map((para, j) => <p key={j} style={{ margin: "0 0 6px" }}>{para}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
