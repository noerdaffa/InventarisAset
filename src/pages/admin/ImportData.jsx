import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import "./admin.css";

function ImportData() {
  const { admin } = useOutletContext();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [riwayat, setRiwayat] = useState([]);

  const loadRiwayat = () => {
    api
      .get("/import/riwayat")
      .then((res) => setRiwayat(res.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadRiwayat();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Pilih file excel terlebih dahulu");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("admin_id", admin.id);

    try {
      const res = await api.post("/import/aset", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      loadRiwayat();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengimpor data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (importId, fileName, totalAset) => {
    const confirmMsg = `Hapus batch import "${fileName}"?\n\n⚠️ Semua ${totalAset} aset dari batch ini akan dihapus.\n\nTindakan ini tidak dapat dibatalkan.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/import/${importId}`);
      loadRiwayat();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus batch import");
    }
  };

  return (
    <div>
      <div className="d-panel">
        <div className="d-panel-title">Import Data Aset</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        </p>

        {error && <div className="d-alert d-alert-error">{error}</div>}
        {result && (
          <div className="d-alert d-alert-success">
            Import selesai: {result.berhasil} berhasil, {
            
            result.gagal} gagal dari {result.total} baris.
          </div>
        )}
        {result?.errors?.length > 0 && (
          <div className="d-alert d-alert-info">
            <strong>Detail baris gagal:</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <label
          className={`d-dropzone ${file ? "has-file" : ""}`}
          htmlFor="excel-input"
        >
          {file ? `${file.name}` : " Klik untuk memilih file .xlsx / .xls, atau seret file ke sini"}
        </label>
        <input
          id="excel-input"
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={{ marginTop: 16 }}>
          <button className="d-btn d-btn-primary" onClick={handleUpload} disabled={loading}>
            {loading ? "Mengimpor..." : "Import Data"}
          </button>
        </div>
      </div>

      <div className="d-panel">
        <div className="d-panel-title">Riwayat Import</div>
        {riwayat.length === 0 ? (
          <div className="d-empty">Belum ada riwayat import.</div>
        ) : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>Nama File</th>
                  <th>Total</th>
                  <th>Berhasil</th>
                  <th>Gagal</th>
                  <th>Admin</th>
                  <th>Waktu</th>
                  <th style={{ width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nama_file}</td>
                    <td>{r.jumlah_data}</td>
                    <td>{r.jumlah_berhasil}</td>
                    <td>{r.jumlah_gagal}</td>
                    <td>{r.admin_name || "-"}</td>
                    <td>{new Date(r.imported_at).toLocaleString("id-ID")}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="d-btn d-btn-danger d-btn-sm"
                        onClick={() =>
                          handleDeleteBatch(r.id, r.nama_file, r.jumlah_berhasil)
                        }
                        title="Hapus seluruh batch import"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportData;
