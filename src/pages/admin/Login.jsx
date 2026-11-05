import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import "./Login.css";

function AdminLogin() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!name.trim() || !password.trim()) {
      setMessage({ text: "Nama pengguna dan kata sandi wajib diisi.", type: "error" });
      return;
    }
    setLoading(true);

    try {
      const response = await api.post("/login", {
        name: name.trim(),
        password: password,
      });

      if (response.data.success) {
        setMessage({ text: "Verifikasi berhasil", type: "success" });
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
    <div className="auth-light-page">
      <div className="auth-light-shell">
        {/* Kolom Informasi Instansi & Inventaris */}
        <section className="auth-light-summary">
          <div className="auth-brand-row">
            <img src="/logo-bmkg.png" alt="Logo BMKG" className="auth-bmkg-logo" />
            <div className="auth-brand-meta">
              <span className="auth-brand-instansi">Badan Meteorologi Klimatologi dan Geofisika</span>
              <span className="auth-brand-system">Sistem Inventaris Barang Milik Negara</span>
            </div>
          </div>

          <div className="auth-summary-content">
            <span className="auth-badge-role">Portal Admin</span>
            <h1 className="auth-summary-title">
              Pengelolaan Aset
            </h1>
          </div>

          <div className="auth-summary-footer">
            <span>Badan Meteorologi, Klimatologi, dan Geofisika</span>
          </div>
        </section>

        {/* Kolom Form Otentikasi */}
        <section className="auth-light-form-panel">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Login Admin</h2>
            <p className="auth-form-subtitle">
              Gunakan akun pengelola untuk mengelola master data aset dan operasional inventaris.
            </p>
          </div>

          {message.text && (
            <div className={`auth-alert ${message.type}`} role="alert">
              {message.type === "error" ? (
                <svg className="auth-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              ) : (
                <svg className="auth-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-input-group">
              <label htmlFor="admin-name" className="auth-label">
                username
              </label>
              <input
                id="admin-name"
                className="auth-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                placeholder="Masukkan usrname admin"
                required
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="admin-password" className="auth-label">
                  password
                </label>
              </div>
              <input
                id="admin-password"
                className="auth-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" aria-hidden="true"></span>
                  Memverifikasi Akun...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="auth-switch-box">
            <span className="auth-switch-text">Bukan admin?</span>
            <Link to="/user/login" className="auth-switch-link">
              Login ke Pegawai
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminLogin;
