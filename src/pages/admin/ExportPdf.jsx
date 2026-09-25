import React, { useEffect, useState } from "react";
import api from "../../api";
import "./admin.css";

function ExportPdf() {
  const [opsi, setOpsi] = useState({ kondisi: [], status_bmn: [], nama_satker: [] });
  const [filterAset, setFilterAset] = useState({ search: "", kondisi: "", status_bmn: "", nama_satker: "" });
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/aset/opsi-filter")
      .then((res) => setOpsi(res.data.data))
      .catch(() => {});
  }, []);

  const downloadFile = async (url, params, filename, key) => {
    setDownloading(key);
    setError("");
    try {
      const res = await api.get(url, { params, responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError("Gagal membuat file PDF. Pastikan server backend berjalan.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <div>
      {error && <div className="d-alert d-alert-error">{error}</div>}

      <div className="d-panel">
        <div className="d-panel-title">Export Laporan Data Aset</div>
        <div className="d-form-grid" style={{ marginBottom: 14 }}>
          <div className="d-form-field full">
            <label>Kata kunci (opsional)</label>
            <input
              value={filterAset.search}
              onChange={(e) => setFilterAset({ ...filterAset, search: e.target.value })}
              placeholder="Nama barang, kode barang..."
            />
          </div>
          <div className="d-form-field">
            <label>Kondisi</label>
            <select value={filterAset.kondisi} onChange={(e) => setFilterAset({ ...filterAset, kondisi: e.target.value })}>
              <option value="">Semua Kondisi</option>
              {opsi.kondisi.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="d-form-field">
            <label>Status BMN</label>
            <select
              value={filterAset.status_bmn}
              onChange={(e) => setFilterAset({ ...filterAset, status_bmn: e.target.value })}
            >
              <option value="">Semua Status</option>
              {opsi.status_bmn.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="d-form-field full">
            <label>Satuan Kerja</label>
            <select
              value={filterAset.nama_satker}
              onChange={(e) => setFilterAset({ ...filterAset, nama_satker: e.target.value })}
            >
              <option value="">Semua Satker</option>
              {opsi.nama_satker.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="d-btn d-btn-primary"
          disabled={downloading === "aset"}
          onClick={() => downloadFile("/export/aset/pdf", filterAset, "laporan-aset.pdf", "aset")}
        >
          {downloading === "aset" ? "Membuat PDF..." : "Export Data Aset (PDF)"}
        </button>
      </div>
    </div>
  );
}

export default ExportPdf;
