import React from "react";

export default function TermsOfService({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 24, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 4, fontWeight: 800 }}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: "#B7C4DC", marginBottom: 16 }}>Last updated: {new Date().toLocaleDateString()}</p>

        <div style={{ fontSize: 13, color: "#E4E8F2", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 14 }}>
          <p><strong>1. What Spot Park is.</strong> Spot Park is a marketplace connecting people who have unused parking spaces ("Hosts") with people looking to park a vehicle ("Drivers"). Spot Park is currently in early testing. Reservations made through the app are not yet processed with real payment — no money is currently charged or transferred.</p>

          <p><strong>2. Your account.</strong> You must provide accurate information when creating an account. You're responsible for keeping your login credentials secure and for all activity under your account.</p>

          <p><strong>3. Listings.</strong> Hosts are solely responsible for the accuracy of their listings, including space dimensions, availability, and photos. Spot Park does not inspect or verify listed spaces.</p>

          <p><strong>4. Arrangements between users.</strong> Any agreement to park in or rent out a space is between the Driver and Host directly. Spot Park is not a party to that arrangement and is not responsible for disputes, property damage, towing, tickets, or any other outcome of a parking arrangement made through the app.</p>

          <p><strong>5. Prohibited conduct.</strong> You agree not to use Spot Park for unlawful purposes, to list a space you don't have the right to offer, or to misrepresent your vehicle or a listing.</p>

          <p><strong>6. Changes.</strong> Spot Park is actively being developed and these terms, along with the app's features, may change as it evolves.</p>

          <p><strong>7. No warranty.</strong> Spot Park is provided "as is" during this testing phase, without warranties of any kind.</p>

          <p><strong>8. Contact.</strong> Questions about these terms can be sent to the app's listed contact email.</p>

          <p style={{ fontSize: 11, color: "#9AA8C4", marginTop: 8 }}>This is a plain-language summary for an early-stage app and is not a substitute for formal legal advice.</p>
        </div>
      </div>
    </div>
  );
}