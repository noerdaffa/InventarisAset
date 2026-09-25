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
        setMessage({ text: "Verifikasi berhasil. Mengalihkan ke dashboard...", type: "success" });
        localStorage.setItem("adminData", JSON.stringify(response.data.data));
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 400);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Kombinasi nama pengguna atau kata sandi tidak valid.";
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
              <span className="auth-brand-instansi">BMKG INDONESIA</span>
              <span className="auth-brand-system">Sistem Inventaris BMN</span>
            </div>
          </div>

          <div className="auth-summary-content">
            <span className="auth-badge-role">Portal Admin</span>
            <h1 className="auth-summary-title">
              Pengelolaan Aset &amp; Logistik Peralatan
            </h1>
            <p className="auth-summary-desc">
              Sistem pencatatan terpusat untuk pendataan nomor registrasi BMN,
              inventarisasi ruang kerja, dan pelacakan kondisi fisik peralatan dinas.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Kodefikasi &amp; Registrasi BMN</h4>
                  <p className="auth-feature-sub">Pencatatan spesifikasi, nomor seri, dan kode barang dinas.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Distribusi Ruangan &amp; Unit Kerja</h4>
                  <p className="auth-feature-sub">Pemetaan lokasi aset pada seluruh bidang dan stasiun operasional.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Audit Mutasi &amp; Berita Acara</h4>
                  <p className="auth-feature-sub">Pencatatan riwayat pemeliharaan, mutasi fisik, dan rekapitulasi data.</p>
                </div>
              </div>
            </div>
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
                Nama Pengguna
              </label>
              <input
                id="admin-name"
                className="auth-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                placeholder="Masukkan nama pengguna admin"
                required
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="admin-password" className="auth-label">
                  Kata Sandi
                </label>
              </div>
              <input
                id="admin-password"
                className="auth-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
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
              Login ke Portal Pegawai
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminLogin;
