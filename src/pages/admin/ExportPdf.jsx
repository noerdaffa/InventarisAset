import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./admin.css";

const PRESETS = [
  {
    id: "semua",
    label: "Semua Aset",
    desc: "Seluruh data inventaris BMN",
    filter: { search: "", kondisi: "", status_bmn: "", nama_satker: "", bulan: "" },
  },
  {
    id: "baik",
    label: "Kondisi Baik",
    desc: "Aset siap operasional",
    filter: { search: "", kondisi: "Baik", status_bmn: "", nama_satker: "", bulan: "" },
  },
  {
    id: "rusak",
    label: "Aset Rusak",
    desc: "Perlu perbaikan atau tindak lanjut",
    filter: { search: "", kondisi: "Rusak Berat", status_bmn: "", nama_satker: "", bulan: "" },
  },
  {
    id: "digunakan",
    label: "Status Digunakan",
    desc: "Sedang dipakai unit kerja",
    filter: { search: "", kondisi: "", status_bmn: "Digunakan", nama_satker: "", bulan: "" },
  },
  {
    id: "idle",
    label: "Belum Digunakan",
    desc: "Cadangan / persediaan inventaris",
    filter: { search: "", kondisi: "", status_bmn: "Belum Digunakan", nama_satker: "", bulan: "" },
  },
];

function ExportPdf() {
  const navigate = useNavigate();

  const [opsi, setOpsi] = useState({ kondisi: [], status_bmn: [], nama_satker: [] });
  const [filterAset, setFilterAset] = useState({
    search: "",
    kondisi: "",
    status_bmn: "",
    nama_satker: "",
    bulan: "",
  });
  const [activePreset, setActivePreset] = useState("semua");

  // State sinkronisasi & download
  const [matchingTotal, setMatchingTotal] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Ambil opsi filter unik dari database
  useEffect(() => {
    api
      .get("/aset/opsi-filter")
      .then((res) => {
        if (res.data?.data) {
          setOpsi({
            kondisi: res.data.data.kondisi || [],
            status_bmn: res.data.data.status_bmn || [],
            nama_satker: res.data.data.nama_satker || [],
          });
        }
      })
      .catch(() => {});
  }, []);

  // Live Query ke API /aset untuk mendapatkan jumlah aset yang cocok
  useEffect(() => {
    let cancel = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/aset", {
          params: {
            search: filterAset.search,
            kondisi: filterAset.kondisi,
            status_bmn: filterAset.status_bmn,
            nama_satker: filterAset.nama_satker,
            bulan: filterAset.bulan,
            page: 1,
            limit: 1,
          },
        });

        if (!cancel && res.data?.success) {
          setMatchingTotal(res.data.pagination?.total ?? 0);
        }
      } catch (err) {
        if (!cancel) setMatchingTotal(null);
      }
    }, 250);

    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [filterAset]);

  // Handler Ganti Preset
  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setFilterAset({ ...preset.filter });
    setError("");
    setSuccessNotice("");
  };

  // Handler Perubahan Input Manual
  const handleFilterChange = (key, value) => {
    setActivePreset("kustom");
    setFilterAset((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccessNotice("");
  };

  // Reset Filter & Parameter
  const handleReset = () => {
    setActivePreset("semua");
    setFilterAset({ search: "", kondisi: "", status_bmn: "", nama_satker: "", bulan: "" });
    setError("");
    setSuccessNotice("");
  };

  // Eksekusi Cetak / Unduh Dokumen PDF
  const handleDownloadPdf = async () => {
    setDownloading(true);
    setError("");
    setSuccessNotice("");

    try {
      const res = await api.get("/export/aset/pdf", {
        params: {
          search: filterAset.search,
          kondisi: filterAset.kondisi,
          status_bmn: filterAset.status_bmn,
          nama_satker: filterAset.nama_satker,
          bulan: filterAset.bulan,
        },
        responseType: "blob",
      });

      const kondPart = filterAset.kondisi ? `-${filterAset.kondisi.toLowerCase().replace(/\s+/g, "_")}` : "";
      const bulanPart = filterAset.bulan ? `-${filterAset.bulan}` : "";
      const datePart = new Date().toISOString().slice(0, 10);
      const filename = `laporan-bmn${kondPart}${bulanPart}-${datePart}.pdf`;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setSuccessNotice(
        `Dokumen berhasil diunduh (${matchingTotal !== null ? matchingTotal : "semua"} item aset disertakan).`
      );
    } catch (err) {
      setError("Gagal membuat berkas. Pastikan backend aktif dan data aset dapat diakses.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="dash-canvas">
      <header className="dash-view-header">
        <div className="dash-view-titles">
          <h1 className="dash-view-title">Cetak Dokumen Aset</h1>
        </div>
      </header>

      {/* ─── Notifikasi Umpan Balik (Alerts) ─── */}
      {error && (
        <div className="adm-action-notice" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", marginBottom: 18 }}>
          <div className="adm-notice-lead">
            <span className="adm-notice-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </span>
            <div className="adm-notice-text">
              <strong style={{ color: "#991b1b" }}>Cetak Dokumen Terkendala</strong>
              <p style={{ color: "#b91c1c" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {successNotice && (
        <div className="adm-action-notice" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46", marginBottom: 18 }}>
          <div className="adm-notice-lead">
            <span className="adm-notice-icon" style={{ background: "#d1fae5", color: "#059669" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <div className="adm-notice-text">
              <strong style={{ color: "#065f46" }}>Dokumen Berhasil Dibuat</strong>
              <p style={{ color: "#047857" }}>{successNotice}</p>
            </div>
          </div>
        </div>
      )}

      <section className="dash-export-filter-card">
        <div className="dash-panel-titlebar" style={{ marginBottom: 18 }}>
          <div>
            <span className="dash-panel-kicker">PARAMETER CETAK DOKUMEN</span>
            <h2 className="dash-panel-heading">Penyaringan Data Aset BMN</h2>
          </div>
          {matchingTotal !== null && (
            <span
              className="dash-chip-badge"
              style={{
                background: "#f0fdf4",
                color: "#15803d",
                border: "1px solid #bbf7d0",
                fontSize: 12,
                padding: "4px 10px",
              }}
            >
              {matchingTotal} unit aset terdata
            </span>
          )}
        </div>

        {/* Baris 1: Kata Kunci */}
        <div className="dash-form-row">
          <label className="dash-field-label">Kata Kunci Pencarian (Opsional)</label>
          <div className="dash-input-with-icon">
            <span className="dash-input-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="dash-input"
              placeholder="Nama barang, kode barang, NUP, atau nama satker..."
              value={filterAset.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
          <p className="dash-field-hint">
            Menyaring kecocokan kata kunci pada nama barang, kode BMN, nomor urut pendaftaran, dan satker.
          </p>
        </div>

        {/* Baris 2: Kondisi & Status BMN */}
        <div className="dash-form-grid-2">
          <div>
            <label className="dash-field-label">Kondisi Fisik Barang</label>
            <select
              className="dash-select"
              value={filterAset.kondisi}
              onChange={(e) => handleFilterChange("kondisi", e.target.value)}
            >
              <option value="">Semua Kondisi</option>
              {opsi.kondisi.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="dash-field-label">Status Penggunaan BMN</label>
            <select
              className="dash-select"
              value={filterAset.status_bmn}
              onChange={(e) => handleFilterChange("status_bmn", e.target.value)}
            >
              <option value="">Semua Status</option>
              {opsi.status_bmn.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 3: Satker & Periode Bulan */}
        <div className="dash-form-grid-2">
          <div>
            <label className="dash-field-label">Satuan Kerja (Satker)</label>
            <select
              className="dash-select"
              value={filterAset.nama_satker}
              onChange={(e) => handleFilterChange("nama_satker", e.target.value)}
            >
              <option value="">Semua Satuan Kerja Terdaftar</option>
              {opsi.nama_satker.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </select>
            <p className="dash-field-hint">Pilih unit kerja spesifik atau seluruh satker.</p>
          </div>

          <div>
            <label className="dash-field-label">Periode Bulan Perolehan (Opsional)</label>
            <input
              type="month"
              className="dash-input"
              value={filterAset.bulan}
              onChange={(e) => handleFilterChange("bulan", e.target.value)}
              placeholder="Pilih bulan & tahun..."
            />
            <p className="dash-field-hint">
              {filterAset.bulan ? (
                <span>
                  Filter aktif: <strong>{filterAset.bulan}</strong>{" "}
                  <button
                    type="button"
                    onClick={() => handleFilterChange("bulan", "")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: 11,
                      marginLeft: 4,
                    }}
                  >
                    (Hapus filter bulan)
                  </button>
                </span>
              ) : (
                "Pilih bulan untuk menyaring aset yang diperoleh pada periode tersebut."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ─── TOMBOL CETAK DOKUMEN (TEPAT DI BAWAH KOTAK 1) ─── */}
      <div className="dash-export-actions-row">
        <button
          type="button"
          className="dash-export-submit-btn"
          disabled={downloading || matchingTotal === 0}
          onClick={handleDownloadPdf}
          title={matchingTotal === 0 ? "Tidak ada aset yang cocok dengan filter" : "Cetak Dokumen PDF"}
        >
          {downloading ? (
            <>
              <svg className="adm-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span>Membuat Berkas PDF...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>
                Cetak Dokumen (PDF) {matchingTotal !== null ? `(${matchingTotal} Aset)` : ""}
              </span>
            </>
          )}
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="dash-cta-btn dash-cta-secondary"
            onClick={handleReset}
            title="Kembalikan semua parameter ke pengaturan awal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
          <button
            type="button"
            className="dash-cta-btn dash-cta-secondary"
            onClick={() => navigate("/admin/aset")}
            title="Ke katalog data aset"
          >
            Ke Data Aset &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportPdf;
