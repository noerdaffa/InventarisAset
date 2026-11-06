import React, { useEffect, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api from "../../api";
import "./admin.css";

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function ImportData() {
  const { admin } = useOutletContext();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [riwayat, setRiwayat] = useState([]);
  const [showErrorList, setShowErrorList] = useState(false);

  // Modal / drawer untuk melihat aset dari batch tertentu
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchAssets, setBatchAssets] = useState([]);
  const [loadingBatchAssets, setLoadingBatchAssets] = useState(false);

  const loadRiwayat = () => {
    api
      .get("/import/riwayat")
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setRiwayat(res.data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRiwayat();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) {
      if (!dropped.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("Format berkas tidak didukung. Mohon unggah berkas .xlsx, .xls, atau .csv");
        return;
      }
      setFile(dropped);
      setResult(null);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Pilih berkas Excel terlebih dahulu sebelum melakukan impor.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    // Ambil ID admin secara aman untuk mencegah error null
    let adminId = admin?.id;
    if (!adminId) {
      try {
        const stored = localStorage.getItem("adminData");
        if (stored) adminId = JSON.parse(stored)?.id;
      } catch (e) {}
    }

    const formData = new FormData();
    formData.append("file", file);
    if (adminId) {
      formData.append("admin_id", adminId);
    }

    try {
      const res = await api.post("/import/aset", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data?.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      loadRiwayat();
      // Buka otomatis daftar error jika ada baris yang gagal
      if (res.data?.data?.errors?.length > 0) {
        setShowErrorList(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal mengimpor data berkas Excel.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBatchAssets = async (batch) => {
    setSelectedBatch(batch);
    setLoadingBatchAssets(true);
    try {
      const res = await api.get(`/import/${batch.id}/aset`);
      setBatchAssets(res.data?.data || []);
    } catch (err) {
      alert("Gagal memuat daftar aset batch");
      setBatchAssets([]);
    } finally {
      setLoadingBatchAssets(false);
    }
  };

  const handleDeleteBatch = async (importId, fileName, totalAset) => {
    const confirmMsg = `Hapus batch import "${fileName}"?\n\n⚠️ Semua ${totalAset || 0} aset dari batch ini akan dihapus dari sistem.\n\nTindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/import/${importId}`);
      if (result?.import_id === importId) {
        setResult(null);
      }
      loadRiwayat();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus batch import");
    }
  };

  return (
    <div className="dash-canvas">
      {/* ─── Header Halaman Impor ─── */}
      <header className="dash-view-header">
        <div className="dash-view-titles">
          <h1 className="dash-view-title">Import Data Aset</h1>
          <p className="dash-view-desc">
            Unggah data aset barang milik negara melalui file spreadsheet Microsoft Excel (.xlsx / .xls).
          </p>
        </div>
      </header>

      {/* ─── Area Unggah Berkas (Rata Kanan-Kiri & Simetris) ─── */}
      <section className="dash-panel-box">
        <div className="dash-panel-titlebar" style={{ marginBottom: 20 }}>
          <div>
            <h2 className="dash-panel-heading" style={{ margin: "2px 0 0" }}>Pilih Berkas Excel</h2>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#0369a1",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              padding: "5px 12px",
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            Maksimal 20 MB &bull; Format .xlsx, .xls, .csv
          </span>
        </div>

        {error && (
          <div className="adm-action-notice" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", marginBottom: 18 }}>
            <div className="adm-notice-lead">
              <span className="adm-notice-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </span>
              <div className="adm-notice-text">
                <strong style={{ color: "#991b1b" }}>Proses Import Terkendala</strong>
                <p style={{ color: "#b91c1c" }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            className="adm-action-notice"
            style={{
              background: result.berhasil > 0 ? "#f0fdf4" : "#fffbeb",
              borderColor: result.berhasil > 0 ? "#bbf7d0" : "#fde68a",
              color: result.berhasil > 0 ? "#166534" : "#92400e",
              marginBottom: 18,
            }}
          >
            <div className="adm-notice-lead">
              <span
                className="adm-notice-icon"
                style={{
                  background: result.berhasil > 0 ? "#dcfce7" : "#fef3c7",
                  color: result.berhasil > 0 ? "#15803d" : "#d97706",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </span>
              <div className="adm-notice-text" style={{ flex: 1 }}>
                <strong style={{ color: result.berhasil > 0 ? "#166534" : "#92400e" }}>
                  {result.berhasil > 0 ? "Impor Berhasil Diproses" : "Perhatian Hasil Impor"}
                </strong>
                <p style={{ color: result.berhasil > 0 ? "#15803d" : "#b45309" }}>
                  <strong>{result.berhasil}</strong> aset berhasil masuk ke sistem, {result.gagal} catatan dari total {result.total} baris berkas.
                </p>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="dash-cta-btn dash-cta-primary"
                    onClick={() => navigate("/admin/aset")}
                    style={{ fontSize: 12.5, padding: "6px 14px" }}
                  >
                    Buka di Master Data Aset &rarr;
                  </button>
                  {result.asets?.length > 0 && (
                    <button
                      className="dash-cta-btn dash-cta-secondary"
                      onClick={() => {
                        const el = document.getElementById("preview-hasil-impor");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{ fontSize: 12.5, padding: "6px 14px" }}
                    >
                      Lihat Daftar Aset di Bawah &darr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {result?.errors?.length > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 14, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#92400e" }}>
                Terdapat {result.errors.length} catatan penyesuaian pada baris data:
              </strong>
              <button
                onClick={() => setShowErrorList((v) => !v)}
                className="dash-link-action"
                style={{ fontSize: 12 }}
              >
                {showErrorList ? "Sembunyikan Rincian" : "Tampilkan Rincian"}
              </button>
            </div>
            {showErrorList && (
              <ul style={{ margin: "10px 0 0 18px", fontSize: 12, color: "#b45309", maxHeight: 180, overflowY: "auto" }}>
                {result.errors.map((e, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Interaktif Dropzone Simetris */}
        <div
          className={`dash-dropzone-box ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          style={{ padding: "40px 24px" }}
        >
          <input
            id="excel-input"
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div className="dash-dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>

          {file ? (
            <div className="dash-file-preview">
              <strong className="dash-file-name">{file.name}</strong>
              <span className="dash-file-size">Ukuran: {formatBytes(file.size)}</span>
              <span className="dash-file-change">Klik atau seret untuk mengganti berkas</span>
            </div>
          ) : (
            <div className="dash-dropzone">
              <strong>Seret &amp; lepas File di sini, atau klik untuk memilih</strong>
            </div>
          )}
        </div>

        {/* Baris Aksi Impor (Rata Kanan-Kiri & Terstruktur) */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            paddingTop: 18,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {file ? (
              <span style={{ color: "#0f172a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Berkas siap diimpor: <span style={{ color: "#0284c7" }}>{file.name}</span> ({formatBytes(file.size)})
              </span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {file && !loading && (
              <button
                type="button"
                className="dash-cta-btn dash-cta-secondary"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                style={{ padding: "9px 18px", fontSize: 13 }}
              >
                Batal
              </button>
            )}

            <button
              type="button"
              className="dash-cta-btn dash-cta-primary"
              onClick={handleUpload}
              disabled={loading || !file}
              style={{
                opacity: loading || !file ? 0.6 : 1,
                minWidth: 170,
                justifyContent: "center",
                padding: "9px 22px",
                fontSize: 13,
              }}
            >
              {loading ? (
                <>
                  <span className="adm-loader-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Memproses Data...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Mulai Import Aset
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Pratinjau Langsung Aset yang Baru Saja Diimpor ─── */}
      {result?.asets?.length > 0 && (
        <section id="preview-hasil-impor" className="dash-panel-box" style={{ marginTop: 22 }}>
          <div className="dash-panel-titlebar">
            <div>
              <span className="dash-panel-kicker">DATA AKTIF</span>
              <h2 className="dash-panel-heading">
                Pratinjau Aset Berhasil Diimpor ({result.asets.length} Unit)
              </h2>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="dash-cta-btn dash-cta-primary"
                onClick={() => navigate("/admin/aset")}
              >
                Buka di Master Data Aset &rarr;
              </button>
            </div>
          </div>

          <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#64748b" }}>
            Data di bawah ini telah berhasil tersimpan di basis data dan siap digunakan untuk peminjaman dinas atau audit:
          </p>

          <div className="dash-table-container">
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>No</th>
                  <th>Kodefikasi BMN</th>
                  <th>Nama Barang</th>
                  <th>Satuan Kerja</th>
                  <th>Kondisi</th>
                  <th style={{ textAlign: "right" }}>Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody>
                {result.asets.slice(0, 50).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td style={{ textAlign: "center", color: "#94a3b8" }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: 700, background: "#f0f9ff", padding: "2px 6px", borderRadius: 4 }}>
                        {item.kode_barang}
                      </span>
                      {item.nup && <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b" }}>NUP {item.nup}</span>}
                    </td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{item.nama_barang}</strong>
                      {(item.merk || item.tipe) && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {[item.merk, item.tipe].filter(Boolean).join(" - ")}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "#334155" }}>{item.nama_satker}</td>
                    <td>
                      <span className="dash-status-pill pill-ready">
                        {item.kondisi || "Baik"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                      {formatRupiah(item.nilai_perolehan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.asets.length > 50 && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#64748b", margin: "14px 0 0" }}>
                Menampilkan 50 aset pertama dari total {result.asets.length} aset. Seluruh data selengkapnya dapat dikelola melalui Master Data Aset.
              </p>
            )}
          </div>
        </section>
      )}


      {/* ─── Modal Rincian Aset Per Batch ─── */}
      {selectedBatch && (
        <div className="d-modal-overlay" onClick={() => setSelectedBatch(null)}>
          <div className="d-modal" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span className="dash-panel-kicker">BATCH #{selectedBatch.id}</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 17, color: "#0f172a" }}>
                  {selectedBatch.nama_file}
                </h3>
                <small style={{ color: "#64748b" }}>
                  Waktu Impor: {new Date(selectedBatch.imported_at).toLocaleString("id-ID")} &bull; Total Berhasil: {selectedBatch.jumlah_berhasil} Aset
                </small>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#64748b", lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {loadingBatchAssets ? (
              <div className="dash-state-pad">Memuat daftar aset...</div>
            ) : batchAssets.length === 0 ? (
              <div className="dash-state-pad">Tidak ada aset tercatat pada batch ini (kemungkinan sudah dihapus atau diperbarui).</div>
            ) : (
              <div className="dash-table-container" style={{ maxHeight: 380, overflowY: "auto" }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: "center" }}>No</th>
                      <th>Kodefikasi BMN &amp; NUP</th>
                      <th>Nama Barang</th>
                      <th>Satuan Kerja</th>
                      <th>Kondisi</th>
                      <th style={{ textAlign: "right" }}>Nilai Perolehan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchAssets.map((a, idx) => (
                      <tr key={a.id}>
                        <td style={{ textAlign: "center", color: "#94a3b8" }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: 700 }}>
                            {a.kode_barang}
                          </span>
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b" }}>NUP {a.nup}</span>
                        </td>
                        <td>
                          <strong style={{ color: "#0f172a" }}>{a.nama_barang}</strong>
                          {(a.merk || a.tipe) && (
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {[a.merk, a.tipe].filter(Boolean).join(" - ")}
                            </div>
                          )}
                        </td>
                        <td style={{ color: "#334155" }}>{a.nama_satker || "—"}</td>
                        <td>
                          <span className="dash-status-pill pill-ready">{a.kondisi || "Baik"}</span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                          {formatRupiah(a.nilai_perolehan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="dash-cta-btn dash-cta-secondary" onClick={() => setSelectedBatch(null)}>
                Tutup
              </button>
              <button
                className="dash-cta-btn dash-cta-primary"
                onClick={() => {
                  setSelectedBatch(null);
                  navigate("/admin/aset");
                }}
              >
                Buka di Master Data Aset &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportData;
