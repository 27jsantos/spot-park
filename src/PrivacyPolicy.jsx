import React from "react";

export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 24, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 4, fontWeight: 800 }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: "#B7C4DC", marginBottom: 16 }}>Last updated: {new Date().toLocaleDateString()}</p>

        <div style={{ fontSize: 13, color: "#E4E8F2", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 14 }}>
          <p><strong>What we collect.</strong> When you use Spot Aura, we collect: your email address (for your account), a vehicle profile you provide (year/make/model or body type), photos you upload when listing a space, and location data (only when you choose to use "current location" while listing a space, or when your browser shares your location to center the map).</p>

          <p><strong>How it's used.</strong> This information is used only to operate Spot Aura's core features: showing your listings and their location to other users, checking vehicle-to-space fit, and displaying your reservations and reviews to you.</p>

          <p><strong>Who can see it.</strong> Your listed spaces (including photos and location) are visible to anyone using the app, since that's how the marketplace works. Your reservations and vehicle profile are private to your account.</p>

          <p><strong>Where it's stored.</strong> Data is stored using Supabase, a third-party database provider, and the app itself is hosted on Vercel. Map data is provided by OpenStreetMap. Payments are processed by Stripe.</p>

          <p><strong>Your choices.</strong> You can edit or delete any space you've listed at any time. To delete your account or request your data be removed, contact the app's listed contact email.</p>

          <p><strong>Changes.</strong> This policy may be updated as Spot Aura develops. Continued use of the app after changes means you accept the updated policy.</p>

          <p style={{ fontSize: 11, color: "#9AA8C4", marginTop: 8 }}>This is a plain-language summary for an early-stage app and is not a substitute for formal legal advice.</p>
        </div>
      </div>
    </div>
  );
}