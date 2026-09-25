import React, { useEffect, useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "../../user/Dashboard.css"; // Reuse the premium user dashboard styling

const MENU = [
  { 
    path: "/admin/dashboard", 
    label: "Beranda Utama", 
    subtitle: "Ringkasan & Statistik",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    )
  },
  { 
    path: "/admin/dashboard/import", 
    label: "Import Data", 
    subtitle: "Unggah Massal BMN",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  },
  { 
    path: "/admin/dashboard/aset", 
    label: "Kelola Data Aset", 
    subtitle: "Inventaris Terpusat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  { 
    path: "/admin/dashboard/peminjaman", 
    label: "Kelola Peminjaman", 
    subtitle: "Peminjaman & Pengembalian",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    )
  },
  { 
    path: "/admin/dashboard/monitoring", 
    label: "Monitoring Aset", 
    subtitle: "Lacak Kondisi & Status",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  { 
    path: "/admin/dashboard/export", 
    label: "Export PDF", 
    subtitle: "Cetak Laporan Resmi",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  },
];

const PAGE_TITLES = {
  "/admin/dashboard": "Beranda Utama",
  "/admin/dashboard/import": "Import Data BMN",
  "/admin/dashboard/aset": "Manajemen Aset",
  "/admin/dashboard/peminjaman": "Kelola Peminjaman",
  "/admin/dashboard/monitoring": "Monitoring BMN",
  "/admin/dashboard/export": "Laporan PDF",
};

function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const adminData = localStorage.getItem("adminData");
    if (!adminData) {
      navigate("/admin/login");
      return;
    }
    setAdmin(JSON.parse(adminData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    navigate("/admin/login");
  };

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

  if (!admin) return null;

  const currentTitle = PAGE_TITLES[location.pathname] || "Dashboard Admin";

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
              <span className="dash-pulse-dot" style={{ background: "#f59e0b", boxShadow: "0 0 0 2px #fef3c7" }} aria-hidden="true"></span>
              <span>Portal Administrator</span>
            </div>
          )}
        </div>

        <nav className="dash-nav" aria-label="Menu Utama">
          <div className="dash-nav-section-label">
            {sidebarOpen ? "MENU NAVIGASI" : "•••"}
          </div>
          {MENU.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `dash-nav-item ${isActive ? "active" : ""}`}
              title={item.label}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {sidebarOpen && (
                <div className="dash-nav-text">
                  <span className="dash-nav-title">{item.label}</span>
                  <span className="dash-nav-sub">{item.subtitle}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-nav-item dash-logout" onClick={handleLogout} title="Keluar dari sistem">
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
                <span className="dash-nav-sub">Akhiri sesi admin</span>
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
              <span className="dash-bc-parent">Administrator</span>
              <span className="dash-bc-sep">/</span>
              <span className="dash-bc-current">{currentTitle}</span>
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

            <div className="dash-user-chip" role="button" title="Admin Terautentikasi">
              <div className="dash-user-avatar" style={{ background: "#1e3a8a" }}>
                {admin.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="dash-user-meta">
                <span className="dash-user-name">{admin.name}</span>
                <span className="dash-user-nip">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner (Hanya tampil di Beranda atau bisa di semua halaman) */}
        {location.pathname === "/admin/dashboard" && (
          <section className="dash-hero-banner">
            <div className="dash-hero-content">
              <div className="dash-hero-headline">
                <div className="dash-hero-tag" style={{ background: "#fef3c7", color: "#b45309" }}>
                  <span className="dash-tag-dot" style={{ background: "#f59e0b" }}></span>
                  <span>Panel Administrator BMN</span>
                </div>
                <h1 className="dash-hero-title">
                  Selamat Bekerja, <span>{admin.name}</span>
                </h1>
                <p className="dash-hero-desc">
                  Kendali penuh atas data inventaris Barang Milik Negara. Pantau statistik aset, kelola pendaftaran barang baru, dan cetak laporan resmi dari satu tempat terpadu.
                </p>
              </div>

              <div className="dash-hero-kpis">
                <div className="dash-kpi-card" onClick={() => navigate("/admin/dashboard/aset")}>
                  <div className="dash-kpi-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                  </div>
                  <div className="dash-kpi-text">
                    <span className="dash-kpi-label">Master Data</span>
                    <strong className="dash-kpi-value">Kelola Aset BMN</strong>
                  </div>
                </div>

                <div className="dash-kpi-card" onClick={() => navigate("/admin/dashboard/export")}>
                  <div className="dash-kpi-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="dash-kpi-text">
                    <span className="dash-kpi-label">Laporan PDF</span>
                    <strong className="dash-kpi-value">Cetak Dokumen Resmi</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Konten Utama */}
        <main className="dash-content">
          <Outlet context={{ admin }} />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
