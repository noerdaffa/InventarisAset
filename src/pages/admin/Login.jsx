import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import "./Login.css";

function AdminLogin() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!name.trim() || !password.trim()) {
      setMessage({ text: "username dan password diisi.", type: "error" });
      return;
    }
    setLoading(true);

    try {
      const response = await api.post("/login", {
        name: name.trim(),
        username: name.trim(),
        password: password,
      });

      if (response.data.success) {
        setMessage({ text: "Verifikasi berhasil. Mengalihkan...", type: "success" });
        localStorage.setItem("adminData", JSON.stringify(response.data.data));
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 400);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "username atau password tidak valid.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-portrait-page">
      <div className="auth-portrait-container">
        {/* Kartu Login Portrait */}
        <div className="auth-portrait-card">
          {/* Header Kartu: Logo & Identitas Resmi BMKG */}
          <div className="auth-card-header">
            <div className="auth-logo-badge">
              <img src="/logo-bmkg.png" alt="Logo BMKG" className="auth-bmkg-logo" />
            </div>
            <span className="auth-instansi-tag">BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</span>
            <h1 className="auth-card-title">Form Login Admin</h1>
          </div>

          {message.text && (
            <div className={`auth-alert ${message.type}`} role="alert">
              {message.type === "error" ? (
                <svg className="auth-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              ) : (
                <svg className="auth-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Form Login Admin */}
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-input-group">
              <label htmlFor="admin-name" className="auth-label">
                username
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="admin-name"
                  className="auth-control with-icon"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  placeholder="Masukkan username admin"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="admin-password" className="auth-label">
                  Password
                </label>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="admin-password"
                  className="auth-control with-icon with-action"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" aria-hidden="true" />
                  Memverifikasi Akun...
                </span>
              ) : (
                "Masuk ke Portal Admin"
              )}
            </button>
          </form>

          {/* Footer Switch ke Login Pegawai */}
          <div className="auth-switch-box">
            <span className="auth-switch-text">Bukan admin?</span>
            <Link to="/user/login" className="auth-switch-link">
              Masuk sebagai Pegawai
            </Link>
          </div>
        </div>

        {/* Hak Cipta Luar Kartu */}
        <footer className="auth-page-footer">
          <span>&copy; Badan Meteorologi, Klimatologi, dan Geofisika</span>
        </footer>
      </div>
    </div>
  );
}

export default AdminLogin;
