import React, { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ProfileSettings from "./components/ProfileSettings";
import AsetList from "./components/AsetList";
import "./Dashboard.css";

const MENU = [
  {
    id: "profile",
    label: "Profil Pegawai",
    subtitle: "Identitas & Keamanan Akun",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "aset",
    label: "Daftar Aset BMN",
    subtitle: "Katalog & Pencarian Barang",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
];

function UserDashboard() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("userData") || "null");
  const [activeTab, setActiveTab] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "BMKG Indonesia";
    }
  }, []);

  if (!userData) return <Navigate to="/user/login" replace />;

  const logout = () => {
    localStorage.removeItem("userData");
    navigate("/user/login");
  };

  const activeMenu = MENU.find((m) => m.id === activeTab);

  return (
    <div className="dash-shell">
      {/* Sidebar Navigasi */}
      <aside className={`dash-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="dash-sidebar-header">
          <div className="dash-brand-wrap">
            <div className="dash-brand-logo">
              <img src="/logo-bmkg.png" alt="Logo BMKG" />
            </div>
            {sidebarOpen && (
              <div className="dash-brand-info">
                <span className="dash-brand-kicker">BMKG INDONESIA</span>
                <span className="dash-brand-title">Inventaris BMN</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="dash-user-badge-role">
              <span className="dash-pulse-dot" aria-hidden="true"></span>
              <span>Portal Pegawai</span>
            </div>
          )}
        </div>

        <nav className="dash-nav" aria-label="Menu Utama">
          <div className="dash-nav-section-label">
            {sidebarOpen ? "MENU NAVIGASI" : "•••"}
          </div>
          {MENU.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`dash-nav-item ${isActive ? "active" : ""}`}
                title={item.label}
              >
                <span className="dash-nav-icon">{item.icon}</span>
                {sidebarOpen && (
                  <div className="dash-nav-text">
                    <span className="dash-nav-title">{item.label}</span>
                    <span className="dash-nav-sub">{item.subtitle}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-nav-item dash-logout" onClick={logout} title="Keluar dari sistem">
            <span className="dash-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {sidebarOpen && (
              <div className="dash-nav-text">
                <span className="dash-nav-title">Keluar Akun</span>
                <span className="dash-nav-sub">Akhiri sesi login</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="dash-main">
        {/* Top Navbar */}
        <header className="dash-navbar">
          <div className="dash-navbar-left">
            <button
              className="dash-toggle-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigasi sidebar"
              title={sidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div className="dash-breadcrumb">
              <span className="dash-bc-parent">Layanan Inventaris</span>
              <span className="dash-bc-sep">/</span>
              <span className="dash-bc-current">{activeMenu?.label}</span>
            </div>
          </div>

          <div className="dash-navbar-right">
            <div className="dash-date-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{formattedDate}</span>
            </div>

            <div className="dash-user-chip" onClick={() => setActiveTab("profile")} role="button" title="Buka profil pegawai">
              <div className="dash-user-avatar">
                {userData.nama?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="dash-user-meta">
                <span className="dash-user-name">{userData.nama}</span>
                <span className="dash-user-nip">NIP. {userData.nip}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner Pegawai (Pengganti banner polos) */}
        <section className="dash-hero-banner">
          <div className="dash-hero-content">
            <div className="dash-hero-headline">
              <div className="dash-hero-tag">
                <span className="dash-tag-dot"></span>
                <span>Sistem Informasi Inventaris Barang Milik Negara</span>
              </div>
              <h1 className="dash-hero-title">
                Selamat Datang, <span>{userData.nama}</span>
              </h1>
              <p className="dash-hero-desc">
                Portal layanan mandiri pegawai BMKG untuk pengecekan spesifikasi barang inventaris,
                pemantauan status peminjaman peralatan, dan pembaruan profil kedinasan.
              </p>
            </div>

            <div className="dash-hero-kpis">
              <div className="dash-kpi-card" onClick={() => setActiveTab("aset")}>
                <div className="dash-kpi-icon blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div className="dash-kpi-text">
                  <span className="dash-kpi-label">Katalog Aset</span>
                  <strong className="dash-kpi-value">Data BMN Terpusat</strong>
                </div>
              </div>

              <div className="dash-kpi-card" onClick={() => setActiveTab("profile")}>
                <div className="dash-kpi-icon green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div className="dash-kpi-text">
                  <span className="dash-kpi-label">Status Akun</span>
                  <strong className="dash-kpi-value">Pegawai Terverifikasi</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Konten Tab Aktif */}
        <main className="dash-content">
          {activeTab === "profile" && <ProfileSettings userData={userData} />}
          {activeTab === "aset" && <AsetList userData={userData} />}
        </main>
      </div>
    </div>
  );
}

export default UserDashboard;