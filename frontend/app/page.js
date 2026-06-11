"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [city, setCity] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(false);

  // AI Matching States
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const router = useRouter();

  // Load initial specializations and featured/premium advocates on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch specs
        const specsRes = await fetch("http://127.0.0.1:8000/api/specializations");
        if (specsRes.ok) {
          const specsData = await specsRes.json();
          setSpecializations(specsData);
        }

        // Fetch all/featured advocates initially
        const searchRes = await fetch("http://127.0.0.1:8000/api/search");
        if (searchRes.ok) {
          const advData = await searchRes.json();
          setAdvocates(advData);
        }
      } catch (err) {
        console.error("Error loading initial search data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Check login helper
  const checkLogin = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return false;
    }
    return true;
  };

  // Standard Search Handler
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    // Redirect if not logged in
    if (!checkLogin()) return;

    setLoading(true);
    setAiResult(null); // Clear AI results on standard search
    
    try {
      let url = "http://127.0.0.1:8000/api/search?";
      if (city) url += `city=${encodeURIComponent(city)}&`;
      if (selectedSpec) url += `specialization=${encodeURIComponent(selectedSpec)}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAdvocates(data);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  // AI Classification and Matching Handler
  const handleAiMatch = async (e) => {
    e.preventDefault();
    
    // Redirect if not logged in
    if (!checkLogin()) return;

    if (!aiQuery.trim()) return;
    setLoading(true);
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/ai/classify?query=${encodeURIComponent(aiQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setAiResult(data.classification);
        setAdvocates(data.recommended_advocates);
      }
    } catch (err) {
      console.error("AI Matching failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle View Profile button click
  const handleViewProfile = (advId) => {
    if (!checkLogin()) return;
    router.push(`/advocate/${advId}`);
  };

  const handleClear = async () => {
    setCity("");
    setSelectedSpec("");
    setAiQuery("");
    setAiResult(null);
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/search");
      if (res.ok) {
        const data = await res.json();
        setAdvocates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fade-in">
      <div className="hero-section">
        <span className="badge">Verified Legal Platform</span>
        <h1 className="hero-title">
          Find the Right Advocate <em>Nearby</em> for your Legal Needs
        </h1>
        <p className="hero-subtitle">
          Discover verified advocates in your city. Select by specialization, filter by courts or experience, 
          or describe your issue in plain English for instant AI matchmaking.
        </p>

        {/* Standard Search Bar */}
        <form onSubmit={handleSearch} className="search-container">
          <div className="search-group">
            <span className="search-icon">📍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Enter City (e.g. Trivandrum, Delhi)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="search-group">
            <span className="search-icon">💼</span>
            <select
              className="search-select"
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.name}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "0.8rem 1.8rem" }}>
            Search
          </button>
        </form>

        {/* AI Query Assistant Bar */}
        <form onSubmit={handleAiMatch} className="ai-bar">
          <div className="ai-bar-left">
            <span className="ai-icon">✨</span>
            <input
              type="text"
              className="ai-input"
              placeholder="Or describe your legal problem (e.g. Builder delayed apartment handover, need bail help)..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
              Ask AI Match
            </button>
            {(city || selectedSpec || aiQuery || aiResult) && (
              <button type="button" onClick={handleClear} className="btn btn-secondary" style={{ padding: "0.5rem 0.8rem" }}>
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="main-content">
        {/* AI Result Box */}
        {aiResult && (
          <div className="ai-recommendation-box">
            <div className="ai-recommendation-header">
              <span className="ai-tag">🤖 NyayAI Matchmaker</span>
              <span className="ai-match-percentage">Confidence Score: {aiResult.confidence}%</span>
            </div>
            <p className="ai-reasoning">
              Based on your query, our system has classified your legal issue under <strong>{aiResult.category}</strong>. 
              {aiResult.used_llm ? " Analyzed using advanced natural language parsing." : " Evaluated using context-based indexing."}
              <br />
              Below are the recommended legal experts specializing in <strong>{aiResult.category}</strong> sorted by experience and rating.
            </p>
          </div>
        )}

        {/* Advocates Section Header */}
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {aiResult ? `Recommended Experts for ${aiResult.category}` : "Available Advocates"}
            </h2>
            <p className="section-subtitle">
              {loading ? "Searching profiles..." : `Showing ${advocates.length} matches`}
            </p>
          </div>
        </div>

        {/* Advocates Grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Searching the Bar Council directory...</div>
          </div>
        ) : advocates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>No matching advocates found.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Try searching a different city or resetting filters. Click "Reset" to see all profiles.
            </p>
          </div>
        ) : (
          <div className="advocates-grid">
            {advocates.map((adv) => (
              <div
                key={adv.id}
                className={`advocate-card ${adv.premium ? "premium-card" : ""}`}
              >
                {adv.premium && <span className="premium-badge">Featured</span>}
                
                <div className="card-header">
                  <div className="advocate-name-row">
                    <h3 className="advocate-name">{adv.name}</h3>
                    {adv.verified && (
                      <span className="verified-icon" title="Verified by Admin">
                        ✅
                      </span>
                    )}
                  </div>
                  <div className="advocate-meta">
                    📍 {adv.city}, {adv.state}
                  </div>
                  
                  <div className="specialization-pills">
                    {adv.specializations.map((spec, idx) => (
                      <span key={idx} className="pill pill-primary">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="advocate-bio">{adv.bio || "No professional biography provided yet."}</p>

                <div className="card-footer">
                  <span className="experience-text">
                    Experience: <strong>{adv.experience_years} Years</strong>
                  </span>
                  
                  <button
                    onClick={() => handleViewProfile(adv.id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
