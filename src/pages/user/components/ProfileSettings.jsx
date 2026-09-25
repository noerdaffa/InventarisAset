import React, { useState } from "react";
import api from "../../../api";
import "./ProfileSettings.css";

function ProfileSettings({ userData }) {
  const [profile, setProfile] = useState({
    nip: userData?.nip || "",
    nama: userData?.nama || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await api.put(`/user/${profile.nip}`, {
        nama: profile.nama,
      });

      if (response.data.success) {
        const updatedUserData = {
          ...userData,
          nama: profile.nama,
        };
        localStorage.setItem("userData", JSON.stringify(updatedUserData));

        setSuccessMsg("Nama profil pegawai berhasil diperbarui.");
        setEditMode(false);
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui data profil.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (passwordForm.passwordBaru !== passwordForm.konfirmasiPassword) {
      setErrorMsg("Kata sandi baru dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (passwordForm.passwordBaru.length < 6) {
      setErrorMsg("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(`/user/${profile.nip}/change-password`, {
        password_lama: passwordForm.passwordLama,
        password_baru: passwordForm.passwordBaru,
      });

      if (response.data.success) {
        setSuccessMsg("Kata sandi akun Anda berhasil diperbarui.");
        setPasswordForm({
          passwordLama: "",
          passwordBaru: "",
          konfirmasiPassword: "",
        });
        setChangePasswordMode(false);
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah kata sandi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Header Halaman Profil */}
      <div className="profile-header">
        <div className="profile-badge-role">Pengaturan Akun Kedinasan</div>
        <h2 className="profile-title">Profil &amp; Keamanan Pegawai</h2>
        <p className="profile-subtitle">
          Kelola informasi data diri resmi dan pengaturan keamanan kata sandi portal inventaris BMKG.
        </p>
      </div>

      {/* Alert Notifikasi */}
      {successMsg && (
        <div className="profile-alert success" role="alert">
          <svg className="profile-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="profile-alert error" role="alert">
          <svg className="profile-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Dua Kolom: Identitas & Keamanan */}
      <div className="profile-grid">
        {/* Kolom 1: Kartu Identitas Pegawai */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="card-header-icon blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 className="profile-card-title">Identitas Pegawai</h3>
              <p className="profile-card-subtitle">Data resmi yang terhubung dengan sistem BMN</p>
            </div>

            {!editMode && (
              <button
                type="button"
                className="btn-edit-action"
                onClick={() => setEditMode(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Ubah Nama</span>
              </button>
            )}
          </div>

          {/* Badge Avatar Visual */}
          <div className="employee-credential-box">
            <div className="employee-avatar-wrap">
              <div className="employee-avatar-circle">
                {profile.nama?.[0]?.toUpperCase() || "P"}
              </div>
              <span className="employee-status-dot" title="Status Pegawai Aktif"></span>
            </div>
            <div className="employee-details">
              <h4 className="employee-name-display">{profile.nama}</h4>
              <div className="employee-nip-tag">NIP. {profile.nip}</div>
              <div className="employee-badge-verified">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Akun Pegawai BMKG Terverifikasi</span>
              </div>
            </div>
          </div>

          {editMode ? (
            <form onSubmit={handleUpdateProfile} className="profile-edit-form">
              <div className="profile-form-group">
                <div className="label-with-hint">
                  <label htmlFor="edit-nip">Nomor Induk Pegawai (NIP)</label>
                  <span className="field-locked-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Terkunci permanen
                  </span>
                </div>
                <input
                  type="text"
                  id="edit-nip"
                  name="nip"
                  value={profile.nip}
                  disabled
                  className="profile-input disabled"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="edit-nama">Nama Lengkap Pegawai</label>
                <input
                  type="text"
                  id="edit-nama"
                  name="nama"
                  value={profile.nama}
                  onChange={handleProfileChange}
                  className="profile-input"
                  required
                />
              </div>

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  className="btn-cancel-profile"
                  onClick={() => setEditMode(false)}
                  disabled={loading}
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info-grid">
              <div className="info-cell">
                <span className="info-cell-label">NIP Resmi</span>
                <span className="info-cell-value monospace">{profile.nip}</span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Nama Lengkap</span>
                <span className="info-cell-value">{profile.nama || "—"}</span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Hak Akses Sistem</span>
                <span className="info-cell-value">Peminjaman &amp; Monitoring Aset</span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Instansi</span>
                <span className="info-cell-value">BMKG Republik Indonesia</span>
              </div>
            </div>
          )}
        </div>

        {/* Kolom 2: Keamanan Akun & Reset Password */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="card-header-icon amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 className="profile-card-title">Keamanan &amp; Kata Sandi</h3>
              <p className="profile-card-subtitle">Pengaturan kata sandi untuk melindungi akses inventaris</p>
            </div>

            {!changePasswordMode && (
              <button
                type="button"
                className="btn-edit-action"
                onClick={() => setChangePasswordMode(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Ubah Sandi</span>
              </button>
            )}
          </div>

          {changePasswordMode ? (
            <form onSubmit={handleChangePassword} className="profile-edit-form">
              <div className="profile-form-group">
                <label htmlFor="passwordLama">Kata Sandi Saat Ini</label>
                <input
                  type="password"
                  id="passwordLama"
                  name="passwordLama"
                  value={passwordForm.passwordLama}
                  onChange={handlePasswordChange}
                  className="profile-input"
                  placeholder="Masukkan kata sandi lama"
                  required
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="passwordBaru">Kata Sandi Baru</label>
                <input
                  type="password"
                  id="passwordBaru"
                  name="passwordBaru"
                  value={passwordForm.passwordBaru}
                  onChange={handlePasswordChange}
                  className="profile-input"
                  placeholder="Minimal 6 karakter"
                  required
                />
                <span className="field-helper-text">Gunakan minimal 6 karakter kombinasi huruf dan angka.</span>
              </div>

              <div className="profile-form-group">
                <label htmlFor="konfirmasiPassword">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  id="konfirmasiPassword"
                  name="konfirmasiPassword"
                  value={passwordForm.konfirmasiPassword}
                  onChange={handlePasswordChange}
                  className="profile-input"
                  placeholder="Ketik ulang kata sandi baru"
                  required
                />
              </div>

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={loading}
                >
                  {loading ? "Menyimpan Sandi..." : "Perbarui Kata Sandi"}
                </button>
                <button
                  type="button"
                  className="btn-cancel-profile"
                  onClick={() => setChangePasswordMode(false)}
                  disabled={loading}
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="security-overview-box">
              <div className="security-status-row">
                <div className="security-shield-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="security-status-title">Status Sandi: Terlindungi</h4>
                  <p className="security-status-desc">
                    Kata sandi Anda tersimpan dengan enkripsi aman di server BMKG.
                  </p>
                </div>
              </div>

              <div className="security-guidelines">
                <div className="guideline-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Jangan berikan kata sandi Anda kepada orang lain</span>
                </div>
                <div className="guideline-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Perbarui kata sandi secara berkala demi keamanan data BMN</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
