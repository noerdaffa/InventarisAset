import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../api";
import "./admin.css";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function Dashboard() {
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(outletCtx?.admin || null);

  const [data, setData] = useState({
    total_aset: 0,
    total_nilai_perolehan: 0,
    per_kondisi: [],
  });
  const [ringkasan, setRingkasan] = useState({
    total_aset: 0,
    aset_tersedia: 0,
    aset_dipinjam: 0,
    peminjaman_menunggu: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem("adminData");
    if (!adminData && !outletCtx?.admin) {
      navigate("/admin/login");
      return;
    }
    if (!admin && adminData) {
      setAdmin(JSON.parse(adminData));
    }
  }, [navigate, outletCtx, admin]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/monitoring/summary").catch(() => ({ data: { data: null } })),
      api.get("/aset/ringkasan-status").catch(() => ({ data: { data: null } })),
    ])
      .then(([monRes, ringRes]) => {
        if (monRes.data?.data) {
          setData(monRes.data.data);
        }
        if (ringRes.data?.data) {
          setRingkasan(ringRes.data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ─── Statistik Ringkasan Cepat ─── */}
      <div className="d-grid-cards" style={{ marginBottom: 20 }}>
        <div
          className="d-card"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/aset")}
          title="Lihat seluruh inventaris aset"
        >
          <div className="d-card-label">TOTAL ASET BMN</div>
          <div className="d-card-value">
            {loading ? "..." : (data.total_aset || ringkasan.total_aset || 0).toLocaleString("id-ID")}
          </div>
          <div className="d-card-sub">
            Total nilai perolehan: {formatRupiah(data.total_nilai_perolehan)}
          </div>
        </div>

        <div
          className="d-card"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/aset")}
          title="Lihat aset yang tersedia"
        >
          <div className="d-card-label" style={{ color: "#16a34a" }}>ASET TERSEDIA</div>
          <div className="d-card-value" style={{ color: "#15803d" }}>
            {loading ? "..." : ringkasan.aset_tersedia.toLocaleString("id-ID")}
          </div>
          <div className="d-card-sub">Siap operasional & dipinjamkan</div>
        </div>

        <div
          className="d-card"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/pengembalian")}
          title="Lihat aset yang sedang dipinjam"
        >
          <div className="d-card-label" style={{ color: "#7c3aed" }}>SEDANG DIPINJAM</div>
          <div className="d-card-value" style={{ color: "#6d28d9" }}>
            {loading ? "..." : ringkasan.aset_dipinjam.toLocaleString("id-ID")}
          </div>
          <div className="d-card-sub">Dipinjam oleh pegawai dinas</div>
        </div>

        <div
          className="d-card"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/peminjaman")}
          title="Lihat permohonan peminjaman yang menunggu respon"
        >
          <div className="d-card-label" style={{ color: "#b45309" }}>PERMOHONAN MENUNGGU</div>
          <div className="d-card-value" style={{ color: "#d97706" }}>
            {loading ? "..." : ringkasan.peminjaman_menunggu}
          </div>
          <div className="d-card-sub">Menunggu verifikasi admin</div>
        </div>
      </div>

      {/* ─── Panel Distribusi Kondisi Fisik ─── */}
      <div className="d-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="d-panel-title" style={{ margin: 0 }}>Distribusi Kondisi Aset Fisik</div>
          <button
            className="d-btn d-btn-secondary d-btn-sm"
            onClick={() => navigate("/admin/monitoring")}
          >
            Buka Monitoring Detail →
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Memuat statistik...</div>
        ) : (data.per_kondisi || []).length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
            Belum ada data inventaris aset tercatat.
          </div>
        ) : (
          data.per_kondisi.map((row) => {
            const pct = data.total_aset > 0 ? ((row.jumlah / data.total_aset) * 100).toFixed(1) : 0;
            return (
              <div className="d-bar-row" key={row.kondisi}>
                <div className="d-bar-label">{row.kondisi}</div>
                <div className="d-bar-track">
                  <div
                    className="d-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background:
                        row.kondisi?.toLowerCase().includes("baik")
                          ? "#16a34a"
                          : row.kondisi?.toLowerCase().includes("ringan")
                          ? "#f59e0b"
                          : "#dc2626",
                    }}
                  />
                </div>
                <div className="d-bar-value">
                  {row.jumlah} ({pct}%)
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Akses Cepat Modul Admin ─── */}
      <div className="d-panel" style={{ marginTop: 20 }}>
        <div className="d-panel-title">Akses Cepat Modul Pengelolaan</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/aset")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>📦 Kelola Data Aset</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Katalog inventaris &amp; master data</span>
          </button>

          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/peminjaman")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>📋 Kelola Peminjaman</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Persetujuan &amp; serah terima aset</span>
          </button>

          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/pengembalian")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>🔄 Kelola Pengembalian</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Pemeriksaan fisik &amp; penyelesaian</span>
          </button>

          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/import")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>📥 Import Berkas Excel</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Unggah massal data BMN</span>
          </button>

          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/monitoring")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>📊 Monitoring Aset</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Distribusi satker &amp; status</span>
          </button>

          <button
            className="d-btn d-btn-secondary"
            onClick={() => navigate("/admin/export")}
            style={{ padding: "14px", justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <strong style={{ color: "#0f172a" }}>📑 Cetak Laporan PDF</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Dokumen resmi inventaris</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
