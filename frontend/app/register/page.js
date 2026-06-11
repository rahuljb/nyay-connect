"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Role is hardcoded to citizen for this page
  const role = "citizen";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1. Register User
      const registerRes = await fetch("http://127.0.0.1:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role, password }),
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

      setSuccess("Citizen Account created! Redirecting to dashboard...");
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
      <div className="auth-card" style={{ maxWidth: "450px" }}>
        <div className="auth-header">
          <h2 className="auth-title">Citizen Registration</h2>
          <p className="auth-subtitle">Create a client account to search, consult, and manage your legal issues</p>
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
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1.5rem" }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Login here
          </Link>
          <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Are you a legal practitioner looking to list your services?
            </span>
            <br />
            <Link href="/register/advocate" className="auth-link" style={{ fontSize: "0.85rem", display: "inline-block", marginTop: "0.25rem" }}>
              Join as Advocate →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
