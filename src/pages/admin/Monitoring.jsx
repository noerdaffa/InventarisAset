import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import "./admin.css";

export default function Monitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    total_aset: 0,
    total_nilai_perolehan: 0,
    per_kondisi: [],
    per_status_bmn: [],
    per_satker: [],
  });

  const [ringkasan, setRingkasan] = useState({
    total_aset: 0,
    aset_tersedia: 0,
    aset_dipinjam: 0,
    peminjaman_menunggu: 0,
    pengembalian_menunggu: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Ambil data monitoring & ringkasan status secara bersamaan
  const loadMonitoringData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const [monRes, ringRes] = await Promise.all([
        api.get("/monitoring/summary"),
        api.get("/aset/ringkasan-status").catch(() => ({ data: { data: null } })),
      ]);

      if (monRes?.data?.data) {
        setData((prev) => ({
          ...prev,
          ...monRes.data.data,
          per_kondisi: Array.isArray(monRes.data.data.per_kondisi) ? monRes.data.data.per_kondisi : [],
          per_status_bmn: Array.isArray(monRes.data.data.per_status_bmn) ? monRes.data.data.per_status_bmn : [],
        }));
      }
      if (ringRes?.data?.data) {
        setRingkasan((prev) => ({ ...prev, ...ringRes.data.data }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data monitoring aset. Pastikan server backend aktif.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  // Perhitungan metrik ringkasan secara aman
  const totalAset = Number(data?.total_aset || ringkasan?.total_aset) || 0;

  const kondisiStats = useMemo(() => {
    let baik = 0;
    let ringan = 0;
    let berat = 0;

    const list = Array.isArray(data?.per_kondisi) ? data.per_kondisi : [];
    list.forEach((row) => {
      const k = String(row?.kondisi || "").toLowerCase();
      const count = Number(row?.jumlah) || 0;
      if (k.includes("baik")) baik += count;
      else if (k.includes("ringan")) ringan += count;
      else if (k.includes("berat")) berat += count;
    });

    const totalRusak = ringan + berat;
    const pctBaik = totalAset > 0 ? ((baik / totalAset) * 100).toFixed(1) : "0";
    const pctRusak = totalAset > 0 ? ((totalRusak / totalAset) * 100).toFixed(1) : "0";

    return { baik, ringan, berat, totalRusak, pctBaik, pctRusak };
  }, [data?.per_kondisi, totalAset]);

  // Navigasi cepat dengan filter
  const handleFilterKondisi = (kondisi) => {
    navigate(`/admin/aset?kondisi=${encodeURIComponent(kondisi)}`);
  };

  return (
    <div className="dash-canvas">
      {/* ─── Executive View Header ─── */}
      <header className="dash-view-header">
        <div className="dash-view-titles">
          <div className="dash-kicker-tag">
            <span className="dash-kicker-dot" />
            <span>MONITORING &amp; AUDIT FISIK</span>
          </div>
          <h1 className="dash-view-title">Monitoring Kondisi Aset BMN</h1>
          <p className="dash-view-desc">
            Badan Meteorologi, Klimatologi, dan Geofisika &bull; Pemantauan komprehensif kondisi kelaikan fisik dan evaluasi inventaris dinas secara real-time.
          </p>
        </div>

        <div className="dash-view-actions">
          <button
            type="button"
            className="d-btn d-btn-secondary d-btn-sm"
            onClick={() => loadMonitoringData(true)}
            disabled={loading || refreshing}
            title="Segarkan data monitoring terbaru"
          >
            <svg
              className={refreshing ? "adm-spin" : ""}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{refreshing ? "Menyinkronkan..." : "Segarkan"}</span>
          </button>
        </div>
      </header>

      {/* ─── State: Loading ─── */}
      {loading && !refreshing && (
        <div className="dash-panel-box" style={{ textAlign: "center", padding: "50px 20px" }}>
          <div className="dash-state-box">
            <svg className="adm-spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
            <div>
              <strong style={{ display: "block", color: "#0f172a", fontSize: 15, marginBottom: 4 }}>
                Memuat Data Monitoring Aset
              </strong>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Menghubungkan ke basis data inventaris BMKG...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── State: Error ─── */}
      {error && !loading && (
        <div
          className="dash-panel-box"
          style={{ background: "#fef2f2", borderColor: "#fecaca", padding: "20px 24px", marginBottom: 20 }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", color: "#991b1b", fontSize: 14.5, marginBottom: 4 }}>
                Gagal Menampilkan Data Monitoring
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
            <button
              type="button"
              className="d-btn d-btn-secondary d-btn-sm"
              onClick={() => loadMonitoringData(false)}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Content Canvas ─── */}
      {!loading && !error && (
        <>
          {/* ─── Top Executive KPI Cards ─── */}
          <div className="d-grid-cards">
            {/* Card 1: Total Aset */}
            <div className="d-card" style={{ cursor: "pointer" }} onClick={() => navigate("/admin/aset")}>
              <div className="d-card-label">TOTAL INVENTARIS BMN</div>
              <div className="d-card-value">{totalAset.toLocaleString("id-ID")} Unit</div>
              <div className="d-card-sub">
                Valuasi: <strong style={{ color: "#0f172a" }}>{formatRupiah(data?.total_nilai_perolehan || 0)}</strong>
              </div>
            </div>

            {/* Card 2: Kondisi Prima / Baik */}
            <div className="d-card" style={{ cursor: "pointer" }} onClick={() => handleFilterKondisi("Baik")}>
              <div className="d-card-label" style={{ color: "#059669" }}>KONDISI LAIK OPERASIONAL</div>
              <div className="d-card-value" style={{ color: "#059669" }}>
                {kondisiStats.baik.toLocaleString("id-ID")} Unit
              </div>
              <div className="d-card-sub">
                Tingkat kelaikan: <strong style={{ color: "#059669" }}>{kondisiStats.pctBaik}%</strong> dari total
              </div>
            </div>

            {/* Card 3: Perlu Pemeliharaan */}
            <div
              className="d-card"
              style={{ cursor: "pointer" }}
              onClick={() => handleFilterKondisi(kondisiStats.berat > 0 ? "Rusak Berat" : "Rusak Ringan")}
            >
              <div className="d-card-label" style={{ color: kondisiStats.totalRusak > 0 ? "#d97706" : "#64748b" }}>
                PERLU PERAWATAN / PERBAIKAN
              </div>
              <div className="d-card-value" style={{ color: kondisiStats.totalRusak > 0 ? "#b45309" : "#0f172a" }}>
                {kondisiStats.totalRusak.toLocaleString("id-ID")} Unit
              </div>
              <div className="d-card-sub">
                {kondisiStats.ringan} Rusak Ringan &bull; {kondisiStats.berat} Rusak Berat
              </div>
            </div>
          </div>

          {/* ─── Area Audit Fisik (Simetris Penuh Rata Kanan-Kiri) ─── */}
          <section className="dash-panel-box">
            <div className="dash-panel-titlebar" style={{ marginBottom: 20 }}>
              <div>
                <span className="dash-panel-kicker">AUDIT FISIK</span>
                <h2 className="dash-panel-heading" style={{ margin: "2px 0 0" }}>Distribusi Kondisi Kelaikan Aset</h2>
              </div>
              <button
                type="button"
                className="dash-link-action"
                onClick={() => navigate("/admin/aset")}
                title="Buka katalog data inventaris aset"
              >
                Lihat Katalog Aset &rarr;
              </button>
            </div>

            <div className="dash-condition-stack">
              {(data?.per_kondisi || []).length === 0 ? (
                <div className="dash-state-pad">Belum ada rekapan kondisi aset.</div>
              ) : (
                (data?.per_kondisi || []).map((row) => {
                  const pct = totalAset > 0 ? ((row.jumlah / totalAset) * 100).toFixed(1) : 0;
                  const kLower = (row.kondisi || "").toLowerCase();
                  const isBaik = kLower.includes("baik");
                  const isRingan = kLower.includes("ringan");
                  const isBerat = kLower.includes("berat");

                  const barColor = isBaik
                    ? "#059669"
                    : isRingan
                    ? "#d97706"
                    : isBerat
                    ? "#dc2626"
                    : "#64748b";

                  return (
                    <div
                      className="dash-cond-item clickable"
                      key={row.kondisi}
                      onClick={() => handleFilterKondisi(row.kondisi)}
                      title={`Klik untuk melihat aset berkondisi "${row.kondisi}"`}
                      style={{ padding: "12px 14px" }}
                    >
                      <div className="dash-cond-header" style={{ fontSize: 13.5, marginBottom: 5 }}>
                        <span className="dash-cond-header-tag">
                          <span className="dash-cond-dot" style={{ width: 10, height: 10, background: barColor }} />
                          <span className="dash-cond-name" style={{ fontSize: 14 }}>{row.kondisi}</span>
                        </span>
                        <span className="dash-cond-count">
                          <strong style={{ fontSize: 14 }}>{Number(row.jumlah).toLocaleString("id-ID")} Unit</strong>
                          <span className="dash-cond-pct" style={{ fontSize: 12, padding: "2px 8px" }}>{pct}%</span>
                        </span>
                      </div>
                      <div className="dash-cond-track" style={{ height: 9 }} aria-hidden="true">
                        <div
                          className="dash-cond-fill"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
