import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./NotificationBell.css";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function NotificationBell({ userData, onTriggerReload }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifikasi = useCallback(async () => {
    if (!userData?.nip) return;
    try {
      const res = await api.get(`/notifikasi/user/${userData.nip}?limit=20`);
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.warn("Gagal mengambil notifikasi:", err.message);
    }
  }, [userData?.nip]);

  // Expose fetchNotifikasi to parent if provided
  useEffect(() => {
    if (onTriggerReload) {
      onTriggerReload.current = fetchNotifikasi;
    }
  }, [onTriggerReload, fetchNotifikasi]);

  // Initial load & Polling interval tiap 20 detik
  useEffect(() => {
    fetchNotifikasi();
    const timer = setInterval(() => {
      fetchNotifikasi();
    }, 20000);

    const handleFocus = () => fetchNotifikasi();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifikasi]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (item) => {
    if (!item.dibaca) {
      try {
        await api.put(`/notifikasi/${item.id}/baca`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, dibaca: 1 } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn("Gagal update notifikasi:", err.message);
      }
    }
    setIsOpen(false);
    if (item.tautan) {
      navigate(item.tautan);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userData?.nip || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await api.put(`/notifikasi/baca-semua/${userData.nip}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, dibaca: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Gagal tandai semua dibaca:", err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (tipe) => {
    switch (tipe) {
      case "SELESAI":
        return (
          <div className="notif-item-icon icon-success" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        );
      case "PENGEMBALIAN":
        return (
          <div className="notif-item-icon icon-amber" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </div>
        );
      case "DISETUJUI":
        return (
          <div className="notif-item-icon icon-blue" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
      case "DITOLAK":
        return (
          <div className="notif-item-icon icon-red" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        );
      default:
        return (
          <div className="notif-item-icon icon-info" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notif-bell-button ${isOpen ? "active" : ""}`}
        onClick={toggleDropdown}
        aria-label="Pemberitahuan pengguna"
        aria-expanded={isOpen}
        title={unreadCount > 0 ? `${unreadCount} pemberitahuan baru` : "Pemberitahuan"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge-count" aria-live="polite">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown-panel" role="region" aria-label="Daftar Notifikasi">
          {/* Header Popover */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title-wrap">
              <h4 className="notif-header-title">Pemberitahuan Pegawai</h4>
              {unreadCount > 0 && (
                <span className="notif-header-unread-tag">{unreadCount} Baru</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-btn-mark-all"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                title="Tandai semua notifikasi telah dibaca"
              >
                {markingAll ? "Memperbarui..." : "Tandai Sudah Dibaca"}
              </button>
            )}
          </div>

          {/* List Notifikasi */}
          <div className="notif-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <p className="notif-empty-title">Belum Ada Pemberitahuan</p>
                <span className="notif-empty-desc">
                  Informasi perkembangan status permohonan dan verifikasi pengembalian aset akan tampil di sini.
                </span>
              </div>
            ) : (
              <ul className="notif-list" role="list">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`notif-list-item ${item.dibaca ? "read" : "unread"}`}
                    onClick={() => handleMarkAsRead(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleMarkAsRead(item);
                      }
                    }}
                  >
                    {getNotificationIcon(item.tipe)}

                    <div className="notif-item-content">
                      <div className="notif-item-topbar">
                        <span className="notif-item-title">{item.judul}</span>
                        <span className="notif-item-time">{formatRelativeTime(item.created_at)}</span>
                      </div>
                      <p className="notif-item-message">{item.pesan}</p>
                    </div>

                    {!item.dibaca && <span className="notif-unread-dot" aria-label="Belum dibaca"></span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Popover */}
          <div className="notif-dropdown-footer">
            <span className="notif-footer-note">Sistem Inventaris BMN &bull; BMKG</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
