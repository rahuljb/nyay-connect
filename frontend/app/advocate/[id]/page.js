"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AdvocateProfile() {
  const { id } = useParams();
  const [advocate, setAdvocate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Consultation request states
  const [issueSummary, setIssueSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        setUser(JSON.parse(jsonPayload));
      } catch (e) {
        console.error("Token decoding error", e);
      }
    }

    // Fetch advocate profile
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/advocates/${id}`);
        if (!res.ok) {
          throw new Error("Advocate profile not found");
        }
        const data = await res.json();
        setAdvocate(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    if (!issueSummary.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          advocate_id: id,
          issue_summary: issueSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit request");
      }

      setSuccess(true);
      setIssueSummary("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
        <div style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Loading profile...</div>
      </div>
    );
  }

  if (error && !advocate) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Error</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
        <Link href="/" className="btn btn-primary">
          Back to search
        </Link>
      </div>
    );
  }

  const firstLetter = advocate.user.name ? advocate.user.name.charAt(0) : "A";

  return (
    <div className="profile-container fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          ← Back to Search results
        </Link>
      </div>

      <div className="profile-layout">
        {/* Main profile content */}
        <div className="profile-main">
          {/* Header */}
          <div className="profile-header-info">
            <div className="profile-avatar">{firstLetter}</div>
            <div className="profile-meta-main">
              <div className="profile-title-row">
                <h1 className="profile-name">{advocate.user.name}</h1>
                {advocate.verified && (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid var(--accent-success)",
                      color: "var(--accent-success)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    Verified Practitioner
                  </span>
                )}
                {advocate.premium && (
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid var(--accent-warning)",
                      color: "var(--accent-warning)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    Featured Advocate
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "0.5rem" }}>
                📍 {advocate.city}, {advocate.state}
              </p>
              <div className="specialization-pills">
                {advocate.specializations.map((spec) => (
                  <span key={spec.id} className="pill pill-primary">
                    {spec.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h2 className="profile-section-title">About the Advocate</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {advocate.bio || "No professional biography has been provided by this practitioner."}
            </p>
          </div>

          {/* Practice Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <h3 className="profile-section-title">Practice Courts</h3>
              <ul style={{ listStyle: "inside disc", color: "var(--text-secondary)", paddingLeft: "0.5rem" }}>
                {advocate.courts && advocate.courts.length > 0 ? (
                  advocate.courts.map((court, idx) => <li key={idx} style={{ marginBottom: "0.4rem" }}>{court}</li>)
                ) : (
                  <li>All local courts</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="profile-section-title">Languages Spoken</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {advocate.languages && advocate.languages.length > 0 ? (
                  advocate.languages.map((lang, idx) => (
                    <span key={idx} className="pill">
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="pill">English, Hindi</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Booking/Consultation widget) */}
        <div className="profile-sidebar">
          {/* Professional Credentials Widget */}
          <div className="profile-card-widget">
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Bar Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Experience:</span>
                <strong>{advocate.experience_years} Years</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Enrollment No:</span>
                <strong>{advocate.enrollment_number}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Bar Council:</span>
                <strong style={{ textAlign: "right" }}>{advocate.state_bar_council}</strong>
              </div>
            </div>
          </div>

          {/* Consultation Request Form Widget */}
          <div className="profile-card-widget" style={{ border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--accent-primary)" }}>
              Request Consultation
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Send details of your legal issue directly to this advocate to initiate a case review.
            </p>

            {success ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid var(--accent-success)",
                  color: "#6ee7b7",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                🎉 Request submitted successfully! The advocate has been notified and will review your lead. 
                You can track updates in your <Link href="/dashboard" style={{ textDecoration: "underline", fontWeight: "600" }}>Dashboard</Link>.
              </div>
            ) : !user ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Please login or register to send consultation requests.
                </p>
                <Link href="/login" className="btn btn-primary" style={{ width: "100%" }}>
                  Login to Consult
                </Link>
              </div>
            ) : user.role !== "citizen" ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  textAlign: "center",
                }}
              >
                Only Citizen accounts can submit client consultation requests.
              </div>
            ) : (
              <form onSubmit={handleConsultationSubmit}>
                {error && (
                  <div style={{ color: "red", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{error}</div>
                )}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Issue Summary</label>
                  <textarea
                    rows={4}
                    className="form-input"
                    placeholder="Describe your legal issue, contract terms, or property dispute here in detail..."
                    value={issueSummary}
                    onChange={(e) => setIssueSummary(e.target.value)}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Send Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
