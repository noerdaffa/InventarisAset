import React, { useEffect, useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import "../admin.css";

const MENU = [
  { 
    path: "/admin/dashboard", 
    label: "Beranda", 
    end: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    )
  },
  { 
    path: "/admin/aset", 
    label: "Daftar Aset", 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  { 
    path: "/admin/peminjaman", 
    label: "Peminjaman", 
    badgeKey: "peminjaman_menunggu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    )
  },
  { 
    path: "/admin/pengembalian", 
    label: "Pengembalian", 
    badgeKey: "pengembalian_menunggu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    )
  },
  { 
    path: "/admin/import", 
    label: "Import", 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  },
  { 
    path: "/admin/monitoring", 
    label: "Monitoring Aset", 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  { 
    path: "/admin/export", 
    label: "Cetak Laporan", 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  "/admin": "Beranda",
  "/admin/dashboard": "Dasboard",
  "/admin/aset": "Kelola Data Aset",
  "/admin/peminjaman": "Kelola Peminjaman",
  "/admin/pengembalian": "Kelola Pengembalian",
  "/admin/import": "Import Data",
  "/admin/monitoring": "Monitoring Aset",
  "/admin/export": "Export Laporan",
  "/admin/dashboard/aset": "Kelola Data Aset",
  "/admin/dashboard/peminjaman": "Peminjaman",
  "/admin/dashboard/pengembalian": "Pengembalian",
  "/admin/dashboard/import": "Import Data BMN",
  "/admin/dashboard/monitoring": "Monitoring Aset",
  "/admin/dashboard/export": "Export Laporan PDF",
};

function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [badges, setBadges] = useState({
    peminjaman_menunggu: 0,
    pengembalian_menunggu: 0,
  });
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

  useEffect(() => {
    api.get("/aset/ringkasan-status")
      .then((res) => {
        if (res.data?.data) {
          setBadges({
            peminjaman_menunggu: res.data.data.peminjaman_menunggu || 0,
            pengembalian_menunggu: res.data.data.pengembalian_menunggu || 0,
          });
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    navigate("/admin/login");
  };

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "BMKG";
    }
  }, []);

  if (!admin) return null;

  const currentTitle = PAGE_TITLES[location.pathname] || "Dashboard Admin";

  return (
    <div className="adm-shell">
      {/* ─── Compact Modern Sidebar ─── */}
      <aside className={`adm-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="adm-sidebar-brand">
          <div
            className="adm-brand-link"
            onClick={() => navigate("/admin/dashboard")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/admin/dashboard")}
            title="Ke Beranda Utama"
          >
            <div className="adm-brand-symbol">
              <img src="/logo-bmkg.png" alt="Logo BMKG" />
            </div>
            {sidebarOpen && (
              <div className="adm-brand-meta">
                <span className="adm-brand-org">Badan Meteorologi Klimatologi dan Geofisika</span>
              </div>
            )}
          </div>
        </div>

        <nav className="adm-nav-menu" aria-label="Navigasi Utama">
          {sidebarOpen && <div className="adm-nav-group-label">MODUL PENGELOLAAN</div>}
          {MENU.map((item) => {
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `adm-nav-anchor ${isActive ? "active" : ""}`}
                title={item.label}
              >
                <span className="adm-nav-ico">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="adm-nav-name">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="adm-nav-pill" title={`${badgeCount} menunggu verifikasi`}>
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="adm-sidebar-bottom">
          <button
            className="adm-nav-anchor adm-btn-logout"
            onClick={handleLogout}
            title="Logut dari sesi administrator"
          >
            <span className="adm-nav-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {sidebarOpen && <span className="adm-nav-name">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content Canvas ─── */}
      <div className="adm-main-body">
        {/* Sleek Top Bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              className="adm-icon-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigasi sidebar"
              title={sidebarOpen ? "Persempit sidebar" : "Perluas sidebar"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <nav className="adm-crumbs" aria-label="Breadcrumb">
              <span className="adm-crumb-root">Logistik BMN</span>
              <span className="adm-crumb-sep">/</span>
              <span className="adm-crumb-target">{currentTitle}</span>
            </nav>
          </div>

          <div className="adm-topbar-right">
            <div className="adm-calendar-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{formattedDate}</span>
            </div>

            <div className="adm-profile-chip">
              <div className="adm-profile-badge">
                {admin.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="adm-profile-meta">
                <span className="adm-profile-name">{admin.name}</span>
                <span className="adm-profile-role">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="adm-workspace-content">
          <Outlet context={{ admin, badges }} />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
