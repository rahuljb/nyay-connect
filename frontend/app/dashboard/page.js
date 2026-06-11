"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Admin states
  const [allAdvocates, setAllAdvocates] = useState([]);

  // Advocate profile editing states
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [courtsString, setCourtsString] = useState("");
  const [langsString, setLangsString] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [allSpecs, setAllSpecs] = useState([]);
  const [profileSuccess, setProfileSuccess] = useState("");

  // Scheduling States (Advocate accepting lead)
  const [schedulingId, setSchedulingId] = useState(null);
  const [appDate, setAppDate] = useState("");
  const [meetLink, setMeetLink] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Decode token
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
      const decodedUser = JSON.parse(jsonPayload);
      setUser(decodedUser);

      // Fetch dashboard data
      fetchDashboardData(decodedUser, token);
    } catch (e) {
      console.error(e);
      localStorage.removeItem("token");
      router.push("/login");
    }
  }, []);

  const fetchDashboardData = async (currentUser, token) => {
    setLoading(true);
    try {
      // 1. Fetch consultations (common for citizen and advocate)
      const res = await fetch("http://127.0.0.1:8000/api/consultations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data);
      }

      // 2. Fetch admin data (all advocates)
      if (currentUser.role === "admin") {
        const advsRes = await fetch("http://127.0.0.1:8000/api/search");
        if (advsRes.ok) {
          const advsData = await advsRes.json();
          setAllAdvocates(advsData);
        }
      }

      // 3. Fetch advocate profile details for editing
      if (currentUser.role === "advocate") {
        // Fetch current advocate profile
        const profRes = await fetch("http://127.0.0.1:8000/api/advocates/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profRes.ok) {
          const profData = await profRes.json();
          setBio(profData.bio || "");
          setExperience(profData.experience_years || "");
          setCity(profData.city || "");
          setStateName(profData.state || "");
          setCourtsString((profData.courts || []).join(", "));
          setLangsString((profData.languages || []).join(", "));
          setSelectedSpecs(profData.specializations.map((s) => s.id));
        }

        // Fetch all specializations
        const specsRes = await fetch("http://127.0.0.1:8000/api/specializations");
        if (specsRes.ok) {
          const specsData = await specsRes.json();
          setAllSpecs(specsData);
        }
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Advocate actions: Accept/Decline leads
  const handleUpdateStatus = async (consultationId, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/consultations/${consultationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Refresh local list
        setConsultations(
          consultations.map((c) =>
            c.id === consultationId ? { ...c, status: newStatus } : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Advocate accepts lead and schedules appointment
  const handleAcceptWithSchedule = async (e, consultationId) => {
    e.preventDefault();
    if (!appDate) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/consultations/${consultationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "accepted",
          appointment_date: new Date(appDate).toISOString(),
          meeting_link: meetLink,
        }),
      });

      if (res.ok) {
        const updatedConsultation = await res.json();
        // Refresh local list
        setConsultations(
          consultations.map((c) =>
            c.id === consultationId
              ? {
                  ...c,
                  status: "accepted",
                  appointment_date: updatedConsultation.appointment_date,
                  meeting_link: updatedConsultation.meeting_link,
                }
              : c
          )
        );
        // Clear forms
        setSchedulingId(null);
        setAppDate("");
        setMeetLink("");
      }
    } catch (err) {
      console.error("Scheduling failed", err);
    }
  };

  // Admin actions: Toggle verification / Premium status
  const handleToggleVerify = async (advocateId, currentVerified) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/verify/${advocateId}?verified=${!currentVerified}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setAllAdvocates(
          allAdvocates.map((a) =>
            a.id === advocateId ? { ...a, verified: !currentVerified } : a
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePremium = async (advocateId, currentPremium) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/premium/${advocateId}?premium=${!currentPremium}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setAllAdvocates(
          allAdvocates.map((a) =>
            a.id === advocateId ? { ...a, premium: !currentPremium } : a
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Advocate action: Save Profile Edit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess("");
    setError("");
    const token = localStorage.getItem("token");

    // Clean lists
    const courtsList = courtsString
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    const langsList = langsString
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l !== "");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/advocates/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experience_years: parseInt(experience) || 0,
          city,
          state: stateName,
          bio,
          courts: courtsList,
          languages: langsList,
          specialization_ids: selectedSpecs,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update profile");
      }

      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSpecSelect = (id) => {
    if (selectedSpecs.includes(id)) {
      setSelectedSpecs(selectedSpecs.filter((s) => s !== id));
    } else {
      setSelectedSpecs([...selectedSpecs, id]);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
        <div style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Loading dashboard...</div>
      </div>
    );
  }

  if (!user) return null;

  // Split Consultations based on requested layouts
  const pendingLeads = consultations.filter((c) => c.status === "pending");
  const currentCases = consultations.filter((c) => c.status === "accepted");
  const previousCases = consultations.filter((c) => c.status === "completed");
  const upcomingAppointments = consultations.filter(
    (c) => c.status === "accepted" && c.appointment_date
  );

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <div>
          <span className="badge" style={{ color: user.role === "admin" ? "var(--accent-danger)" : user.role === "advocate" ? "var(--accent-warning)" : "var(--accent-success)" }}>
            {user.role.toUpperCase()} PANEL
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.5px", marginTop: "0.5rem" }}>
            User Dashboard
          </h1>
        </div>
        <div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Welcome, <strong>{user.email}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", color: "red", background: "rgba(255,0,0,0.05)", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}>
          {error}
        </div>
      )}

      {/* 1. CITIZEN DASHBOARD */}
      {user.role === "citizen" && (
        <div className="dashboard-main">
          {/* Upcoming Appointment Details */}
          <h2 className="profile-section-title" style={{ color: "var(--accent-warning)", borderBottomColor: "rgba(245,158,11,0.2)" }}>
            📅 Upcoming Appointment Details
          </h2>
          {upcomingAppointments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
              No upcoming appointments scheduled yet.
            </p>
          ) : (
            <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
              {upcomingAppointments.map((c) => (
                <div key={c.id} className="dashboard-item" style={{ borderLeft: "4px solid var(--accent-warning)", background: "rgba(245,158,11,0.02)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Consultation with {c.advocate_name}</h3>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "0.4rem", fontWeight: "600" }}>
                      ⏰ Scheduled Time: {new Date(c.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {c.meeting_link && (
                      <p style={{ fontSize: "0.85rem", color: "var(--accent-primary)", marginTop: "0.25rem" }}>
                        🔗 Meeting Details:{" "}
                        <a href={c.meeting_link.startsWith("http") ? c.meeting_link : `https://${c.meeting_link}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                          {c.meeting_link}
                        </a>
                      </p>
                    )}
                  </div>
                  <span className="status-badge status-accepted" style={{ background: "rgba(245,158,11,0.1)", color: "var(--accent-warning)", borderColor: "rgba(245,158,11,0.2)" }}>Scheduled</span>
                </div>
              ))}
            </div>
          )}

          {/* Current Cases */}
          <h2 className="profile-section-title" style={{ color: "var(--accent-success)", borderBottomColor: "rgba(16,185,129,0.2)" }}>
            💼 Current Cases
          </h2>
          {currentCases.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
              No active/current cases.
            </p>
          ) : (
            <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
              {currentCases.map((c) => (
                <div key={c.id} className="dashboard-item" style={{ borderLeft: "4px solid var(--accent-success)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                      Active Case under {c.advocate_name}
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>"{c.issue_summary}"</p>
                  </div>
                  <span className="status-badge status-accepted">Active</span>
                </div>
              ))}
            </div>
          )}

          {/* Previous Case List */}
          <h2 className="profile-section-title" style={{ color: "var(--accent-primary)", borderBottomColor: "rgba(59,130,246,0.2)" }}>
            🏛️ Previous Case List
          </h2>
          {previousCases.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
              No completed cases.
            </p>
          ) : (
            <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
              {previousCases.map((c) => (
                <div key={c.id} className="dashboard-item" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                      Resolved Case with {c.advocate_name}
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>"{c.issue_summary}"</p>
                  </div>
                  <span className="status-badge status-completed">Completed</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending Requests */}
          {pendingLeads.length > 0 && (
            <>
              <h2 className="profile-section-title">⏳ Sent Consultation Requests (Pending)</h2>
              <div className="dashboard-list">
                {pendingLeads.map((c) => (
                  <div key={c.id} className="dashboard-item">
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Request to {c.advocate_name}</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>"{c.issue_summary}"</p>
                    </div>
                    <span className="status-badge status-pending">Pending Review</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. ADVOCATE DASHBOARD */}
      {user.role === "advocate" && (
        <div className="dashboard-grid">
          {/* Main Area: Leads & Appointments split */}
          <div className="dashboard-main">
            {/* Upcoming Appointment Details */}
            <h2 className="profile-section-title" style={{ color: "var(--accent-warning)", borderBottomColor: "rgba(245,158,11,0.2)" }}>
              📅 Upcoming Appointment Details
            </h2>
            {upcomingAppointments.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
                No appointments scheduled.
              </p>
            ) : (
              <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
                {upcomingAppointments.map((c) => (
                  <div key={c.id} className="dashboard-item" style={{ borderLeft: "4px solid var(--accent-warning)", background: "rgba(245,158,11,0.02)" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Client: {c.citizen_name}</h3>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "0.4rem", fontWeight: "600" }}>
                        ⏰ Scheduled: {new Date(c.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      {c.meeting_link && (
                        <p style={{ fontSize: "0.85rem", color: "var(--accent-primary)", marginTop: "0.25rem" }}>
                          🔗 Link / Location:{" "}
                          <a href={c.meeting_link.startsWith("http") ? c.meeting_link : `https://${c.meeting_link}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                            {c.meeting_link}
                          </a>
                        </p>
                      )}
                    </div>
                    <span className="status-badge status-accepted" style={{ background: "rgba(245,158,11,0.1)", color: "var(--accent-warning)" }}>Scheduled</span>
                  </div>
                ))}
              </div>
            )}

            {/* Current Cases */}
            <h2 className="profile-section-title" style={{ color: "var(--accent-success)", borderBottomColor: "rgba(16,185,129,0.2)" }}>
              💼 Current Cases
            </h2>
            {currentCases.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
                No active cases.
              </p>
            ) : (
              <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
                {currentCases.map((c) => (
                  <div key={c.id} className="dashboard-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem", borderLeft: "4px solid var(--accent-success)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Client: {c.citizen_name}</h3>
                      <span className="status-badge status-accepted">Active</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>"{c.issue_summary}"</p>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => handleUpdateStatus(c.id, "completed")} className="btn btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                        Mark Case Completed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Previous Case List */}
            <h2 className="profile-section-title" style={{ color: "var(--accent-primary)", borderBottomColor: "rgba(59,130,246,0.2)" }}>
              🏛️ Previous Case List (Completed)
            </h2>
            {previousCases.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem", paddingLeft: "0.5rem" }}>
                No completed cases yet.
              </p>
            ) : (
              <div className="dashboard-list" style={{ marginBottom: "2rem" }}>
                {previousCases.map((c) => (
                  <div key={c.id} className="dashboard-item" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Client: {c.citizen_name}</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>"{c.issue_summary}"</p>
                    </div>
                    <span className="status-badge status-completed">Completed</span>
                  </div>
                ))}
              </div>
            )}

            {/* Incoming Leads (Pending) */}
            <h2 className="profile-section-title">⏳ Incoming Case Leads (Pending Approval)</h2>
            {pendingLeads.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingLeft: "0.5rem" }}>
                No pending leads.
              </p>
            ) : (
              <div className="dashboard-list">
                {pendingLeads.map((c) => (
                  <div key={c.id} className="dashboard-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Lead from: {c.citizen_name}</h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Received: {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="status-badge status-pending">New Lead</span>
                    </div>

                    <p style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                      {c.issue_summary}
                    </p>

                    {schedulingId === c.id ? (
                      <form onSubmit={(e) => handleAcceptWithSchedule(e, c.id)} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", padding: "1rem", background: "rgba(59, 130, 246, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--accent-primary)" }}>Schedule Consultation Appointment</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.65rem" }}>Date & Time</label>
                            <input
                              type="datetime-local"
                              className="form-input"
                              value={appDate}
                              onChange={(e) => setAppDate(e.target.value)}
                              required
                              style={{ fontSize: "0.8rem", padding: "0.5rem" }}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.65rem" }}>Meeting Link / Venue</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Google Meet link"
                              value={meetLink}
                              onChange={(e) => setMeetLink(e.target.value)}
                              style={{ fontSize: "0.8rem", padding: "0.5rem" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                          <button type="button" onClick={() => setSchedulingId(null)} className="btn btn-secondary" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}>
                            Cancel
                          </button>
                          <button type="submit" className="btn btn-success" style={{ padding: "0.3rem 1.2rem", fontSize: "0.8rem" }}>
                            Confirm & Schedule
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: "flex", gap: "0.7rem", alignSelf: "flex-end" }}>
                        <button onClick={() => handleUpdateStatus(c.id, "declined")} className="btn btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                          Decline
                        </button>
                        <button onClick={() => setSchedulingId(c.id)} className="btn btn-success" style={{ padding: "0.4rem 1.2rem", fontSize: "0.85rem" }}>
                          Accept & Schedule
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Area: Profile Editor */}
          <div>
            <div className="profile-card-widget" style={{ position: "sticky", top: "100px" }}>
              <h2 className="profile-section-title" style={{ fontSize: "1.15rem", borderBottomColor: "var(--accent-warning)" }}>
                Edit Advocate Profile
              </h2>
              {profileSuccess && (
                <div style={{ color: "var(--accent-success)", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: "600" }}>
                  {profileSuccess}
                </div>
              )}
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Years of Experience</label>
                  <input
                    type="number"
                    className="form-input"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                  />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.7rem" }}>City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.7rem" }}>State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Bio / Practice About</label>
                  <textarea
                    rows={4}
                    className="form-input"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your legal experience..."
                    style={{ fontFamily: "inherit", fontSize: "0.85rem" }}
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Courts (Comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={courtsString}
                    onChange={(e) => setCourtsString(e.target.value)}
                    placeholder="e.g. High Court Kerala, District Court"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Languages (Comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={langsString}
                    onChange={(e) => setLangsString(e.target.value)}
                    placeholder="e.g. English, Malayalam, Hindi"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.7rem" }}>Specializations</label>
                  <div style={{ maxHeight: "100px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.4rem" }}>
                    {allSpecs.map((spec) => (
                      <div key={spec.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                        <input
                          type="checkbox"
                          id={`dash-spec-${spec.id}`}
                          checked={selectedSpecs.includes(spec.id)}
                          onChange={() => handleSpecSelect(spec.id)}
                        />
                        <label htmlFor={`dash-spec-${spec.id}`} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                          {spec.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
                  Save Profile
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN DASHBOARD */}
      {user.role === "admin" && (
        <div className="dashboard-main">
          <h2 className="profile-section-title">Manage Platform Advocates</h2>
          
          <div className="dashboard-list">
            {allAdvocates.map((adv) => (
              <div key={adv.id} className="dashboard-item" style={{ gap: "2rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>{adv.name}</h3>
                    {adv.verified && <span style={{ color: "var(--accent-success)", fontSize: "0.85rem" }}>[Verified]</span>}
                    {adv.premium && <span style={{ color: "var(--accent-warning)", fontSize: "0.85rem" }}>[Featured]</span>}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    📍 {adv.city} • Yrs Exp: {adv.experience_years} • Specializations: {adv.specializations.join(", ")}
                  </p>
                </div>
                
                <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                  {/* Verification Toggle */}
                  <button
                    onClick={() => handleToggleVerify(adv.id, adv.verified)}
                    className={`btn ${adv.verified ? "btn-secondary" : "btn-success"}`}
                    style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", width: "120px" }}
                  >
                    {adv.verified ? "Unverify" : "Verify Profile"}
                  </button>

                  {/* Premium/Featured Toggle */}
                  <button
                    onClick={() => handleTogglePremium(adv.id, adv.premium)}
                    className={`btn ${adv.premium ? "btn-secondary" : "btn-primary"}`}
                    style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", width: "120px" }}
                  >
                    {adv.premium ? "Demote" : "Feature (★)"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
