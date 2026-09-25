import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import "./Auth.css";

function UserRegister() {
  const [form, setForm] = useState({ nip: "", nama: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: "", type: "" });

    if (!form.nip.trim() || !form.nama.trim() || !form.password) {
      return setMessage({ text: "Seluruh kolom formulir wajib diisi.", type: "error" });
    }
    if (form.password.length < 6) {
      return setMessage({ text: "Kata sandi minimal harus 6 karakter.", type: "error" });
    }
    if (form.password !== form.confirmPassword) {
      return setMessage({ text: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.", type: "error" });
    }

    setLoading(true);
    try {
      await api.post("/user/register", {
        nip: form.nip.trim(),
        nama: form.nama.trim(),
        password: form.password,
      });
      setMessage({ text: "Registrasi berhasil. Mengalihkan ke halaman masuk...", type: "success" });
      setTimeout(() => navigate("/user/login"), 700);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "Registrasi akun pegawai gagal. Silakan coba kembali.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="auth-light-page">
      <div className="auth-light-shell">
        {/* Kolom Informasi Registrasi Pegawai */}
        <section className="auth-light-summary">
          <div className="auth-brand-row">
            <img src="/logo-bmkg.png" alt="Logo BMKG" className="auth-bmkg-logo" />
            <div className="auth-brand-meta">
              <span className="auth-brand-instansi">BMKG INDONESIA</span>
              <span className="auth-brand-system">Sistem Inventaris BMN</span>
            </div>
          </div>

          <div className="auth-summary-content">
            <span className="auth-badge-role">Pendaftaran Akun</span>
            <h1 className="auth-summary-title">
              Daftarkan Akun Inventaris Pegawai
            </h1>
            <p className="auth-summary-desc">
              Lengkapi data identitas kedinasan untuk mengaktifkan akses pencatatan barang,
              peminjaman perlengkapan operasional, dan pemantauan kondisi aset dinas.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7.5" r="4"></circle>
                    <polyline points="17 11 19 13 23 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Validasi NIP Kedinasan</h4>
                  <p className="auth-feature-sub">Gunakan Nomor Induk Pegawai aktif yang tercatat resmi pada instansi BMKG.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Keamanan Akun Kedinasan</h4>
                  <p className="auth-feature-sub">Tetapkan kata sandi minimal 6 karakter untuk perlindungan data aset dinas.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <h4 className="auth-feature-heading">Aktivasi Langsung</h4>
                  <p className="auth-feature-sub">Setelah pendaftaran selesai, Anda dapat langsung login ke portal pegawai.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-summary-footer">
            <span>Badan Meteorologi, Klimatologi, dan Geofisika</span>
          </div>
        </section>

        {/* Kolom Form Registrasi Pegawai */}
        <section className="auth-light-form-panel">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Buat Akun Baru</h2>
            <p className="auth-form-subtitle">
              Pastikan data yang diisi telah sesuai dengan identitas pegawai Anda.
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
              <label htmlFor="register-nip" className="auth-label">
                Nomor Induk Pegawai (NIP)
              </label>
              <input
                id="register-nip"
                className="auth-control"
                type="number"
                value={form.nip}
                onChange={update("nip")}
                autoComplete="username"
                placeholder="Contoh: 199501012020121001"
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="register-nama" className="auth-label">
                Nama Lengkap
              </label>
              <input
                id="register-nama"
                className="auth-control"
                type="text"
                value={form.nama}
                onChange={update("nama")}
                autoComplete="name"
                placeholder="Masukkan nama lengkap beserta gelar"
                required
              />
            </div>

            <div className="auth-grid-2col">
              <div className="auth-input-group">
                <label htmlFor="register-password" className="auth-label">
                  Kata Sandi
                </label>
                <input
                  id="register-password"
                  className="auth-control"
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="new-password"
                  placeholder="Min. 6 karakter"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="register-confirm" className="auth-label">
                  Konfirmasi Sandi
                </label>
                <input
                  id="register-confirm"
                  className="auth-control"
                  type="password"
                  value={form.confirmPassword}
                  onChange={update("confirmPassword")}
                  autoComplete="new-password"
                  placeholder="Ulangi sandi"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" aria-hidden="true"></span>
                  Mendaftarkan Akun...
                </span>
              ) : (
                "Daftar"
              )}
            </button>
          </form>

          <div className="auth-switch-box">
            <span className="auth-switch-text">Sudah memiliki akun terdaftar?</span>
            <Link to="/user/login" className="auth-switch-link">
              Login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default UserRegister;