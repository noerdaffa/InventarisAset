import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import "./Auth.css";

function UserLogin() {
  const [form, setForm] = useState({ nip: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: "", type: "" });

    if (!form.nip.trim() || !form.password) {
      setMessage({ text: "NIP dan kata sandi wajib diisi.", type: "error" });
      return;
    }
    setLoading(true);

    try {
      const response = await api.post("/user/login", { ...form, nip: form.nip.trim() });
      localStorage.setItem("userData", JSON.stringify(response.data.data));
      setMessage({ text: "Login berhasil. Mengalihkan...", type: "success" });
      setTimeout(() => navigate("/user/dashboard"), 400);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "NIP atau kata sandi yang Anda masukkan salah.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-light-page">
      <div className="auth-light-shell">
        {/* Kolom Informasi Pegawai & Inventaris */}
        <section className="auth-light-summary">
          <div className="auth-brand-row">
            <img src="/logo-bmkg.png" alt="Logo BMKG" className="auth-bmkg-logo" />
            <div className="auth-brand-meta">
              <span className="auth-brand-instansi">BMKG INDONESIA</span>
              <span className="auth-brand-system">Sistem Inventaris BMN</span>
            </div>
          </div>

          <div className="auth-summary-content">
            <span className="auth-badge-role">Layanan Mandiri Pegawai</span>
            <h1 className="auth-summary-title">
              Portal Inventaris &amp; Logistik Kerja
            </h1>
            <p className="auth-summary-desc">
              Layanan terintegrasi bagi pegawai BMKG untuk pengecekan data aset,
              riwayat penempatan perlengkapan kantor, dan permohonan peminjaman barang.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7h-9"></path>
                    <path d="M14 17H5"></path>
                    <circle cx="17" cy="17" r="3"></circle>
                    <circle cx="7" cy="7" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Monitoring Aset Pegawai</h4>
                  <p className="auth-feature-sub">Pantau spesifikasi, kondisi, dan status pemakaian barang kerja.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Layanan Peminjaman Barang</h4>
                  <p className="auth-feature-sub">Pengajuan peminjaman peralatan teknis dan perlengkapan dinas operasional.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Tertib Administrasi BMN</h4>
                  <p className="auth-feature-sub">Mendukung akuntabilitas dan pencatatan barang milik negara yang rapi.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-summary-footer">
            <span>Badan Meteorologi, Klimatologi, dan Geofisika</span>
          </div>
        </section>

        {/* Kolom Form Otentikasi Pegawai */}
        <section className="auth-light-form-panel">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Login Pegawai</h2>
            <p className="auth-form-subtitle">
              Gunakan Nomor Induk Pegawai (NIP) dan kata sandi yang telah terdaftar.
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

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-input-group">
              <label htmlFor="user-nip" className="auth-label">
                NIP Pegawai
              </label>
              <input
                id="user-nip"
                className="auth-control"
                type="text"
                inputMode="numeric"
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
                autoComplete="username"
                placeholder="Contoh: 123456789"
                required
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="user-password" className="auth-label">
                  Kata Sandi
                </label>
              </div>
              <input
                id="user-password"
                className="auth-control"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi akun"
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
            <span className="auth-switch-text">Belum memiliki akun pegawai?</span>
            <Link to="/user/register" className="auth-switch-link">
              Daftar Akun Baru
            </Link>
          </div>

          <div className="auth-alt-entry">
            <Link to="/admin/login" className="auth-alt-link">
              Login Admin
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default UserLogin;