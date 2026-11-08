import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import "./Auth.css";

function UserRegister() {
  const [form, setForm] = useState({ nip: "", nama: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: "", type: "" });

    if (!form.nip.trim() || !form.nama.trim() || !form.password) {
      return setMessage({ text: "Seluruh kolom formulir pendaftaran wajib diisi.", type: "error" });
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
      setMessage({ text: "Pendaftaran berhasil. Mengalihkan ke halaman masuk...", type: "success" });
      setTimeout(() => navigate("/user/login"), 700);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "Registrasi akun pegawai gagal. Silakan periksa data kembali.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="auth-portrait-page">
      <div className="auth-portrait-container wide">
        <div className="auth-portrait-card">
          <div className="auth-card-header">
            <div className="auth-logo-badge">
              <img src="/logo-bmkg.png" alt="Logo BMKG" className="auth-bmkg-logo" />
            </div>
            <span className="auth-instansi-tag">BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</span>
            <h1 className="auth-card-title">Registrasi Pegawai</h1>
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

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-input-group">
              <label htmlFor="register-nip" className="auth-label">
                Nomor Induk Pegawai (NIP)
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="13" y2="12" />
                    <line x1="7" y1="16" x2="10" y2="16" />
                  </svg>
                </span>
                <input
                  id="register-nip"
                  className="auth-control with-icon"
                  type="text"
                  inputMode="numeric"
                  value={form.nip}
                  onChange={update("nip")}
                  autoComplete="username"
                  placeholder="Contoh: 199501012020121001"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="register-nama" className="auth-label">
                Nama Lengkap Pegawai
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="register-nama"
                  className="auth-control with-icon"
                  type="text"
                  value={form.nama}
                  onChange={update("nama")}
                  autoComplete="name"
                  placeholder="Masukkan nama lengkap beserta gelar"
                  required
                />
              </div>
            </div>

            <div className="auth-grid-2col">
              <div className="auth-input-group">
                <label htmlFor="register-password" className="auth-label">
                  Kata Sandi
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="register-password"
                    className="auth-control with-icon with-action"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    autoComplete="new-password"
                    placeholder="Min. 6 karakter"
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="register-confirm" className="auth-label">
                  Konfirmasi Sandi
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="register-confirm"
                    className="auth-control with-icon with-action"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    autoComplete="new-password"
                    placeholder="Ulangi sandi"
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Sembunyikan konfirmasi sandi" : "Lihat konfirmasi sandi"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" aria-hidden="true" />
                  Mendaftarkan Akun...
                </span>
              ) : (
                "Daftar Akun Pegawai"
              )}
            </button>
          </form>

          {/* Footer Switch ke Login Pegawai */}
          <div className="auth-switch-box">
            <span className="auth-switch-text">Sudah memiliki akun terdaftar?</span>
            <Link to="/user/login" className="auth-switch-link">
              masuk sebagai pegawai
            </Link>
          </div>

          <div className="auth-alt-entry">
            <Link to="/admin/login" className="auth-alt-link">
              masuk sebagai admin
            </Link>
          </div>
        </div>

        <footer className="auth-page-footer">
          <span>&copy; Badan Meteorologi, Klimatologi, dan Geofisika</span>
        </footer>
      </div>
    </div>
  );
}

export default UserRegister;
