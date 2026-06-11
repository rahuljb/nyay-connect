"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth on load
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      if (token) {
        // Decode simple token payloads
        try {
          // Payload is the second part of JWT
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            window
              .atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const parsed = JSON.parse(jsonPayload);
          setUser(parsed);
        } catch (e) {
          console.error("Failed to decode token", e);
          localStorage.removeItem("token");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();

    // Listen for custom login events to refresh navbar instantly
    window.addEventListener("auth-change", checkAuth);
    return () => {
      window.removeEventListener("auth-change", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
    window.location.href = "/";
  };

  return (
    <nav className="navbar">
      <Link href="/" className="logo-container">
        <span className="logo-icon">⚖️</span>
        <span className="logo-text">Nyay Connect</span>
      </Link>

      <div className="nav-links">
        <Link href="/" className="nav-link">
          Find Advocates
        </Link>
        {user && (
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
        )}
      </div>

      <div className="nav-buttons">
        {user ? (
          <>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Hello, <strong>{user.email.split("@")[0]}</strong> (
              {user.role.toUpperCase()})
            </span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
