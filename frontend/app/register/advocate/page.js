"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdvocateRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Advocate professional details
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [stateBarCouncil, setStateBarCouncil] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch specializations for checkboxes
    const fetchSpecs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/specializations");
        if (res.ok) {
          const data = await res.json();
          setSpecializations(data);
        }
      } catch (err) {
        console.error("Failed to load specializations", err);
      }
    };
    fetchSpecs();
  }, []);

  const handleSpecChange = (id) => {
    if (selectedSpecs.includes(id)) {
      setSelectedSpecs(selectedSpecs.filter((s) => s !== id));
    } else {
      setSelectedSpecs([...selectedSpecs, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1. Register User (role is hardcoded to advocate)
      const registerRes = await fetch("http://127.0.0.1:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role: "advocate", password }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.detail || "Registration failed");
      }

      // 2. Login User to get JWT token
      const loginRes = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        throw new Error("Login failed after registration");
      }

      const token = loginData.access_token;
      localStorage.setItem("token", token);

      // 3. Create advocate profile
      const profileRes = await fetch("http://127.0.0.1:8000/api/advocates/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enrollment_number: enrollmentNumber,
          state_bar_council: stateBarCouncil,
          experience_years: parseInt(experienceYears) || 0,
          city,
          state: stateName,
          specialization_ids: selectedSpecs,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.detail || "Failed to create advocate profile");
      }

      setSuccess("Advocate Registration successful! Redirecting to dashboard...");
      window.dispatchEvent(new Event("auth-change"));

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in">
      <div className="auth-card" style={{ maxWidth: "700px" }}>
        <div className="auth-header">
          <span className="badge" style={{ color: "var(--accent-warning)", borderColor: "rgba(245,158,11,0.3)" }}>Advocate Portal</span>
          <h2 className="auth-title" style={{ marginTop: "0.5rem" }}>Advocate Enrollment</h2>
          <p className="auth-subtitle">List your practice on India's premium advocate discovery network</p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--accent-danger)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid var(--accent-success)",
              color: "#6ee7b7",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Column 1 (Login details) */}
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "var(--accent-primary)" }}>
                1. Account Credentials
              </h3>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Adv. Hari Prasad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Login ID)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. name@lawfirm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secure Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Column 2 (Professional details) */}
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "var(--accent-warning)" }}>
                2. Professional Credentials
              </h3>

              <div className="form-group">
                <label className="form-label">Bar Council Enrollment Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. K/1245/2012"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State Bar Council</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bar Council of Kerala"
                  value={stateBarCouncil}
                  onChange={(e) => setStateBarCouncil(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
                <div>
                  <label className="form-label">Exp (Yrs)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="12"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">City of Practice</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Trivandrum"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kerala"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "0.5rem" }}>
                  Practice Specializations
                </label>
                <div
                  style={{
                    maxHeight: "115px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.5rem",
                    background: "rgba(255,255,255,0.01)",
                  }}
                >
                  {specializations.map((spec) => (
                    <div
                      key={spec.id}
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}
                    >
                      <input
                        type="checkbox"
                        id={`spec-${spec.id}`}
                        checked={selectedSpecs.includes(spec.id)}
                        onChange={() => handleSpecChange(spec.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <label
                        htmlFor={`spec-${spec.id}`}
                        style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}
                      >
                        {spec.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1.5rem" }}
            disabled={loading}
          >
            {loading ? "Registering Advocate Profile..." : "Submit Enrollment & Open Dashboard"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "2rem" }}>
          Already registered?{" "}
          <Link href="/login" className="auth-link">
            Login here
          </Link>
          <br />
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "inline-block", marginTop: "0.5rem" }}>
            Registering as a client seeking counsel? Use the{" "}
            <Link href="/register" style={{ textDecoration: "underline" }}>
              Citizen Registration Page
            </Link>
            .
          </span>
        </div>
      </div>
    </div>
  );
}
