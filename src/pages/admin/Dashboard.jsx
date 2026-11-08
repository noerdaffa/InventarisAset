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

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

function Dashboard() {
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(outletCtx?.admin || null);

  const [data, setData] = useState({
    total_aset: 0,
    total_nilai_perolehan: 0,
    per_kondisi: [],
    per_satker: [],
  });
  const [ringkasan, setRingkasan] = useState({
    total_aset: 0,
    aset_tersedia: 0,
    aset_dipinjam: 0,
    peminjaman_menunggu: 0,
    pengembalian_menunggu: 0,
  });
  const [recentLoans, setRecentLoans] = useState([]);
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
      api.get("/peminjaman?limit=5").catch(() => ({ data: { data: [] } })),
    ])
      .then(([monRes, ringRes, loanRes]) => {
        if (monRes.data?.data) {
          setData(monRes.data.data);
        }
        if (ringRes.data?.data) {
          setRingkasan(ringRes.data.data);
        }
        if (Array.isArray(loanRes.data?.data)) {
          setRecentLoans(loanRes.data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalAset = data.total_aset || ringkasan.total_aset || 0;
  const pctTersedia = totalAset > 0 ? ((ringkasan.aset_tersedia / totalAset) * 100).toFixed(1) : 0;
  const pctDipinjam = totalAset > 0 ? ((ringkasan.aset_dipinjam / totalAset) * 100).toFixed(1) : 0;
  const hasPending = (ringkasan.peminjaman_menunggu || 0) > 0 || (ringkasan.pengembalian_menunggu || 0) > 0;

  // Filter top satkers for display
  const topSatker = (data.per_satker || []).slice(0, 4);

  return (
    <div className="dash-canvas">
      {/* ─── Modern Executive View Header ─── */}
      <header className="dash-view-header">
        <div className="dash-view-titles">
          <h1 className="dash-view-title">Dashboard Admin </h1>
        </div>
        <div className="dash-view-actions">
          <button
            className="dash-cta-btn dash-cta-primary"
            onClick={() => navigate("/admin/aset")}
            title="Tambah atau catat aset BMN baru"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Registrasi Aset Baru
          </button>
          <button
            className="dash-cta-btn dash-cta-secondary"
            onClick={() => navigate("/admin/export")}
            title="Cetak berkas rekapitulasi inventaris resmi"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Unduh Rekap PDF
          </button>
        </div>
      </header>

      {/* ─── Active Triage Notice (Only when tasks are waiting) ─── */}
      {!loading && hasPending && (
        <section className="dash-triage-strip" aria-label="Antrean Tindakan Admin">
          <div className="dash-triage-item">
            <span className="dash-triage-dot" />
            <div className="dash-triage-copy">
              <strong>Tindakan Memerlukan Verifikasi:</strong>
              <span>
                {ringkasan.peminjaman_menunggu > 0 && (
                  <> <strong>{ringkasan.peminjaman_menunggu}</strong> permohonan pinjam baru menunggu persetujuan.</>
                )}
                {ringkasan.pengembalian_menunggu > 0 && (
                  <> <strong>{ringkasan.pengembalian_menunggu}</strong> barang dinas menunggu pengecekan fisik.</>
                )}
              </span>
            </div>
          </div>
          <div className="dash-triage-links">
            {ringkasan.peminjaman_menunggu > 0 && (
              <button
                className="dash-triage-action"
                onClick={() => navigate("/admin/peminjaman")}
              >
                Tinjau Permohonan ({ringkasan.peminjaman_menunggu})
              </button>
            )}
            {ringkasan.pengembalian_menunggu > 0 && (
              <button
                className="dash-triage-action"
                onClick={() => navigate("/admin/pengembalian")}
              >
                Cek Fisik ({ringkasan.pengembalian_menunggu})
              </button>
            )}
          </div>
        </section>
      )}

      {/* ─── Symmetrical 2-Card Metric Deck (Bilateral Balance) ─── */}
      <section className="dash-metrics-duo" aria-label="Metrik Utama Inventaris">
        {/* Card 1: Total Master BMN & Rasio Operasional */}
        <div
          className="dash-metric-card"
          onClick={() => navigate("/admin/aset")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/admin/aset")}
          title="Buka katalog master aset"
        >
          <div className="dash-card-topbar">
            <span className="dash-metric-category">KATALOG MASTER BMN</span>
            <div className="dash-icon-box dark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
          </div>
          <div className="dash-metric-figure">
            <span className="dash-metric-big">
              {loading ? "—" : totalAset.toLocaleString("id-ID")}
            </span>
            <span className="dash-metric-unit">Unit Terdata</span>
          </div>
          <p className="dash-metric-note" style={{ minHeight: "auto", marginBottom: 12 }}>
            Total inventaris perangkat operasional dinas dan logistik BMKG yang aktif terdaftar.
          </p>
          <div className="dash-ratio-container">
            <div className="dash-ratio-labels">
              <span>Siap Pakai: <strong>{loading ? "..." : (ringkasan.aset_tersedia || 0)} Unit ({pctTersedia}%)</strong></span>
              <span>Dipinjam: <strong>{loading ? "..." : (ringkasan.aset_dipinjam || 0)} Unit ({pctDipinjam}%)</strong></span>
            </div>
            <div className="dash-ratio-track" aria-hidden="true">
              <div className="dash-ratio-part ready" style={{ width: `${pctTersedia}%` }} />
              <div className="dash-ratio-part loaned" style={{ width: `${pctDipinjam}%` }} />
            </div>
          </div>
        </div>

        {/* Card 2: Valuasi & Nilai Perolehan Aset */}
        <div
          className="dash-metric-card"
          onClick={() => navigate("/admin/export")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/admin/export")}
          title="Buka laporan valuasi aset dinas"
        >
          <div className="dash-card-topbar">
            <span className="dash-metric-category">NILAI BUKU PEROLEHAN</span>
            <div className="dash-icon-box dark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
          </div>
          <div className="dash-metric-figure">
            <span className="dash-metric-big text-blue">
              {loading ? "—" : formatRupiah(data.total_nilai_perolehan)}
            </span>
          </div>
          <p className="dash-metric-note" style={{ minHeight: "auto", marginBottom: 12 }}>
            Akumulasi nilai kapitalisasi perolehan seluruh barang milik negara dinas BMKG.
          </p>
          <div className="dash-metric-valuation" style={{ marginTop: "auto", marginBottom: 0 }}>
            <span>Status Akuntansi:</span>
            <strong>Terkapitalisasi Resmi di Neraca BMN</strong>
          </div>
        </div>
      </section>

      {/* ─── Main Two-Column Hub (60% / 40%) ─── */}
      <div className="dash-layout-split">
        {/* Left Column (60%): Sirkulasi Terkini + Quick Shortcuts */}
        <div className="dash-col-primary">
          {/* Real Live Activity: Sirkulasi Peminjaman Terkini */}
          <section className="dash-panel-box">
            <div className="dash-panel-titlebar">
              <div>
                <span className="dash-panel-kicker">AKTIVITAS TERBARU</span>
                <h2 className="dash-panel-heading">Sirkulasi &amp; Peminjaman Terkini</h2>
              </div>
              <button
                className="dash-link-action"
                onClick={() => navigate("/admin/peminjaman")}
              >
                Lihat Semua ({ringkasan.total_aset || 0}) &rarr;
              </button>
            </div>

            <div className="dash-table-container">
              {loading ? (
                <div className="dash-state-pad">Memuat data sirkulasi aset...</div>
              ) : recentLoans.length === 0 ? (
                <div className="dash-state-pad empty">
                  <p>Belum ada riwayat permohonan peminjaman tercatat.</p>
                  <button
                    className="dash-cta-btn dash-cta-secondary"
                    onClick={() => navigate("/admin/peminjaman")}
                    style={{ marginTop: 8 }}
                  >
                    Buka Modul Peminjaman
                  </button>
                </div>
              ) : (
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Peminjam</th>
                      <th>Nama Barang</th>
                      <th>Tgl Pinjam</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLoans.map((loan) => {
                      const st = (loan.status || "").toUpperCase();
                      let stBadge = "pill-muted";
                      if (st === "DIPINJAM") stBadge = "pill-loaned";
                      if (st === "DIKEMBALIKAN") stBadge = "pill-ready";
                      if (st === "MENUNGGU") stBadge = "pill-alert";
                      if (st === "MENUNGGU_PENGEMBALIAN") stBadge = "pill-warn";

                      return (
                        <tr
                          key={loan.id}
                          onClick={() => navigate("/admin/peminjaman")}
                          className="dash-row-interactive"
                          title="Klik untuk membuka detail peminjaman"
                        >
                          <td className="dash-cell-emp">
                            <strong>{loan.nama_pegawai || loan.nip}</strong>
                            <small>{loan.nip}</small>
                          </td>
                          <td className="dash-cell-asset" title={loan.nama_aset}>
                            {loan.nama_aset || "—"}
                          </td>
                          <td className="dash-cell-date">
                            {formatDate(loan.tanggal_pinjam)}
                          </td>
                          <td>
                            <span className={`dash-status-pill ${stBadge}`}>
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Quick Workflow Navigation Strip */}
          <section className="dash-shortcuts-strip" aria-label="Akses Cepat Modul">
            <button
              className="dash-tool-card"
              onClick={() => navigate("/admin/aset")}
            >
              <div className="dash-tool-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="dash-tool-text">
                <strong>Katalog Master Aset</strong>
                <span>Spesifikasi, NUP &amp; riwayat</span>
              </div>
            </button>

            <button
              className="dash-tool-card"
              onClick={() => navigate("/admin/import")}
            >
              <div className="dash-tool-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="dash-tool-text">
                <strong>Import Berkas Excel</strong>
                <span>Sinkronisasi BMN massal</span>
              </div>
            </button>

            <button
              className="dash-tool-card"
              onClick={() => navigate("/admin/monitoring")}
            >
              <div className="dash-tool-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="dash-tool-text">
                <strong>Audit &amp; Monitoring</strong>
                <span>Sebaran ruangan &amp; satker</span>
              </div>
            </button>

            <button
              className="dash-tool-card"
              onClick={() => navigate("/admin/export")}
            >
              <div className="dash-tool-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="dash-tool-text">
                <strong>Laporan Aset PDF</strong>
                <span>Cetak rekapitulasi dinas</span>
              </div>
            </button>
          </section>
        </div>

        {/* Right Column (40%): Audit Kondisi Fisik + Sebaran Satker */}
        <div className="dash-col-secondary">
          {/* Physical Condition Breakdown */}
          <section className="dash-panel-box">
            <div className="dash-panel-titlebar">
              <div>
                <span className="dash-panel-kicker">AUDIT FISIK</span>
                <h2 className="dash-panel-heading">Kondisi Kelaikan Aset</h2>
              </div>
              <button
                className="dash-link-action"
                onClick={() => navigate("/admin/monitoring")}
              >
                Detail Audit &rarr;
              </button>
            </div>

            <div className="dash-condition-stack">
              {loading ? (
                <div className="dash-state-pad">Memuat data kelaikan...</div>
              ) : (data.per_kondisi || []).length === 0 ? (
                <div className="dash-state-pad">Belum ada rekapan kondisi aset.</div>
              ) : (
                data.per_kondisi.map((row) => {
                  const pct = totalAset > 0 ? ((row.jumlah / totalAset) * 100).toFixed(1) : 0;
                  const isBaik = row.kondisi?.toLowerCase().includes("baik");
                  const isRingan = row.kondisi?.toLowerCase().includes("ringan");
                  const barColor = isBaik ? "var(--color-ready)" : isRingan ? "var(--color-warn)" : "var(--color-alert)";

                  return (
                    <div className="dash-cond-item" key={row.kondisi}>
                      <div className="dash-cond-header">
                        <span className="dash-cond-name">{row.kondisi}</span>
                        <span className="dash-cond-count">
                          <strong>{row.jumlah} Unit</strong>
                          <span className="dash-cond-pct">{pct}%</span>
                        </span>
                      </div>
                      <div className="dash-cond-track" aria-hidden="true">
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

          {/* Sebaran Satker Terbanyak */}
          <section className="dash-panel-box">
            <div className="dash-panel-titlebar">
              <div>
                <span className="dash-panel-kicker">DISTRIBUSI INSTANSI</span>
                <h2 className="dash-panel-heading">Sebaran Satuan Kerja</h2>
              </div>
              <button
                className="dash-link-action"
                onClick={() => navigate("/admin/monitoring")}
              >
                Monitoring &rarr;
              </button>
            </div>

            <div className="dash-satker-list">
              {loading ? (
                <div className="dash-state-pad">Memuat sebaran satker...</div>
              ) : topSatker.length === 0 ? (
                <div className="dash-state-pad">Belum ada sebaran satker.</div>
              ) : (
                topSatker.map((item, idx) => (
                  <div className="dash-satker-row" key={item.nama_satker || idx}>
                    <div className="dash-satker-meta">
                      <span className="dash-satker-rank">{idx + 1}</span>
                      <strong className="dash-satker-name" title={item.nama_satker}>
                        {item.nama_satker}
                      </strong>
                    </div>
                    <span className="dash-satker-badge">
                      {item.jumlah} Unit
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
