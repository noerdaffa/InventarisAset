import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import { formatRupiah, formatTanggal, slugBadge } from "../../utils/format";
import "./admin.css";

const KOSONG = {
  nama_satker: "",
  kode_barang: "",
  nup: "",
  nama_barang: "",
  status_bmn: "",
  merk: "",
  tipe: "",
  kondisi: "Baik",
  nama: "",
  tanggal_perolehan: "",
  nilai_perolehan: "",
};

const FILTER_AWAL = {
  kondisi: "",
  status_bmn: "",
  tanggal_dari: "",
  tanggal_sampai: "",
  nilai_min: "",
  nilai_max: "",
};

const FILTER_LABELS = {
  kondisi: "Kondisi",
  status_bmn: "Status BMN",
  nama_satker: "Satker",
  tanggal_dari: "Dari",
  tanggal_sampai: "Sampai",
  nilai_min: "Min",
  nilai_max: "Max",
};

function KelolaAset() {
  const { admin } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [opsi, setOpsi] = useState({ kondisi: [], status_bmn: [], nama_satker: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(KOSONG);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api
      .get("/aset/opsi-filter")
      .then((res) => setOpsi(res.data.data))
      .catch(() => {});
  }, []);

  const loadData = useCallback(
    (page = 1) => {
      setLoading(true);
      api
        .get("/aset", { params: { search, ...filter, page, limit: 10 } })
        .then((res) => {
          setRows(res.data.data);
          setPagination(res.data.pagination);
        })
        .catch((err) => setError(err.response?.data?.message || "Gagal memuat data aset"))
        .finally(() => setLoading(false));
    },
    [search, filter]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const openTambah = () => {
    setEditingId(null);
    setForm(KOSONG);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (aset) => {
    setEditingId(aset.id);
    setForm({
      ...aset,
      tanggal_perolehan: aset.tanggal_perolehan ? aset.tanggal_perolehan.slice(0, 10) : "",
      nilai_perolehan: aset.nilai_perolehan || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleResetFilter = () => {
    setFilter(FILTER_AWAL);
    setSearch("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = { ...form, admin_id: admin.id };
    try {
      if (editingId) {
        await api.put(`/aset/${editingId}`, payload);
      } else {
        await api.post("/aset", payload);
      }
      setShowModal(false);
      loadData(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || "Gagal menyimpan data aset");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (aset) => {
    if (!window.confirm(`Hapus aset "${aset.nama_barang}"?`)) return;
    try {
      await api.delete(`/aset/${aset.id}`, { data: { admin_id: admin.id } });
      loadData(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus aset");
    }
  };

  const activeFilterCount = Object.values(filter).filter(Boolean).length;
  const hasActiveFilter = activeFilterCount > 0 || search;

  return (
    <div>
      <div className="d-panel" style={{ marginBottom: 12 }}>
        <div className="d-toolbar">
          <div className="d-search-box">
            <svg className="d-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              className="d-search-input"
              placeholder="Cari barang, kode, satker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="d-search-clear" onClick={() => setSearch("")} title="Hapus pencarian">✕</button>
            )}
          </div>
          <button
            className={`d-btn d-btn-secondary ${activeFilterCount > 0 ? "d-btn-filter-active" : ""}`}
            onClick={() => setShowFilter((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>
            {showFilter ? "Tutup Filter" : "Filter"}
            {activeFilterCount > 0 && <span className="d-filter-count">{activeFilterCount}</span>}
          </button>
          <button className="d-btn d-btn-primary" onClick={openTambah}>+ Tambah</button>
        </div>

        {hasActiveFilter && (
          <div className="d-filter-chips">
            {search && (
              <span className="d-chip">
                "{search}"
                <button onClick={() => setSearch("")}>✕</button>
              </span>
            )}
            {Object.entries(filter).map(([k, v]) =>
              v ? (
                <span key={k} className="d-chip">
                  {FILTER_LABELS[k]}: {v}
                  <button onClick={() => setFilter((f) => ({ ...f, [k]: "" }))}>✕</button>
                </span>
              ) : null
            )}
            {hasActiveFilter && (
              <button className="d-chip-reset" onClick={handleResetFilter}>
                Reset semua
              </button>
            )}
          </div>
        )}

        {showFilter && (
          <div className="d-filter-panel">
            <div className="d-filter-grid">
              <div className="d-filter-item">
                <label>Kondisi</label>
                <select name="kondisi" value={filter.kondisi} onChange={handleFilterChange}>
                  <option value="">Semua</option>
                  {opsi.kondisi.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="d-filter-item">
                <label>Status BMN</label>
                <select name="status_bmn" value={filter.status_bmn} onChange={handleFilterChange}>
                  <option value="">Semua</option>
                  {opsi.status_bmn.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="d-filter-item">
                <label>Satuan Kerja</label>
                <select name="nama_satker" value={filter.nama_satker} onChange={handleFilterChange}>
                  <option value="">Semua</option>
                  {opsi.nama_satker.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="d-filter-item d-filter-date-range">
                <label>Tanggal Perolehan</label>
                <div className="d-range-group">
                  <input type="date" name="tanggal_dari" value={filter.tanggal_dari} onChange={handleFilterChange} />
                  <span className="d-range-sep">s/d</span>
                  <input type="date" name="tanggal_sampai" value={filter.tanggal_sampai} onChange={handleFilterChange} />
                </div>
              </div>
              <div className="d-filter-item d-filter-num-range">
                <label>Nilai Perolehan (Rp)</label>
                <div className="d-range-group">
                  <input type="number" name="nilai_min" value={filter.nilai_min} onChange={handleFilterChange} placeholder="Min" />
                  <span className="d-range-sep">—</span>
                  <input type="number" name="nilai_max" value={filter.nilai_max} onChange={handleFilterChange} placeholder="Max" />
                </div>
              </div>
            </div>
            <div className="d-filter-footer">
              <button className="d-btn d-btn-secondary d-btn-sm" onClick={handleResetFilter}>Reset Semua</button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="d-alert d-alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="d-panel" style={{ padding: loading || rows.length === 0 ? 20 : "16px 0 0" }}>
        <div className="d-panel-header" style={{ padding: "0 20px 14px" }}>
          <span className="d-panel-title">Data Aset</span>
          <span className="d-panel-info">
            {loading ? "" : `${pagination.total} data ditemukan`}
          </span>
        </div>

        {loading ? (
          <div className="d-loading">
            <div className="d-spinner" />
            <span>Memuat data...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="d-empty">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
            <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>Tidak ada data aset</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              {hasActiveFilter
                ? "Coba ubah atau reset filter pencarian"
                : "Mulai dengan menambah aset atau import Excel"}
            </div>
          </div>
        ) : (
          <>
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th style={{ width: 42, textAlign: "center" }}>No</th>
                    <th>Nama Barang</th>
                    <th>Kode Barang</th>
                    <th>NUP</th>
                    <th>Kondisi</th>
                    <th>Nilai Perolehan</th>
                    <th style={{ width: 80, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={a.id}>
                      <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>
                        {(pagination.page - 1) * 10 + i + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>{a.nama_barang}</div>
                        {a.merk || a.tipe ? (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                            {[a.merk, a.tipe].filter(Boolean).join(" / ")}
                          </div>
                        ) : null}
                      </td>
                      <td><span className="d-code">{a.kode_barang}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>{a.nup}</td>
                      <td>
                        <span className={`d-badge badge-${slugBadge(a.kondisi)}`}>
                          {a.kondisi || "-"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatRupiah(a.nilai_perolehan)}</td>
                      <td>
                        <div className="d-actions">
                          <button className="d-action-btn d-action-edit" onClick={() => openEdit(a)} title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="d-action-btn d-action-delete" onClick={() => handleDelete(a)} title="Hapus">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-pagination">
              <span>
                Hal {pagination.page} / {pagination.totalPages}
              </span>
              <button
                className="d-btn d-btn-secondary d-btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
              >
                ← Prev
              </button>
              <button
                className="d-btn d-btn-secondary d-btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="d-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="d-modal" onClick={(e) => e.stopPropagation()}>
            <div className="d-modal-title">{editingId ? "Edit Aset" : "Tambah Aset Baru"}</div>
            {formError && <div className="d-alert d-alert-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="d-form-grid">
                <div className="d-form-field full">
                  <label>Nama Satker</label>
                  <input name="nama_satker" value={form.nama_satker || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field">
                  <label>Kode Barang *</label>
                  <input name="kode_barang" value={form.kode_barang || ""} onChange={handleChange} required />
                </div>
                <div className="d-form-field">
                  <label>NUP *</label>
                  <input type="number" name="nup" value={form.nup || ""} onChange={handleChange} required />
                </div>
                <div className="d-form-field full">
                  <label>Nama Barang *</label>
                  <input name="nama_barang" value={form.nama_barang || ""} onChange={handleChange} required />
                </div>
                <div className="d-form-field">
                  <label>Merk</label>
                  <input name="merk" value={form.merk || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field">
                  <label>Tipe</label>
                  <input name="tipe" value={form.tipe || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field">
                  <label>Kondisi</label>
                  <select name="kondisi" value={form.kondisi || ""} onChange={handleChange}>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
                <div className="d-form-field">
                  <label>Status BMN</label>
                  <input name="status_bmn" value={form.status_bmn || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field">
                  <label>Nama Pengelola</label>
                  <input name="nama" value={form.nama || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field">
                  <label>Tanggal Perolehan</label>
                  <input type="date" name="tanggal_perolehan" value={form.tanggal_perolehan || ""} onChange={handleChange} />
                </div>
                <div className="d-form-field full">
                  <label>Nilai Perolehan (Rp)</label>
                  <input type="number" name="nilai_perolehan" value={form.nilai_perolehan || ""} onChange={handleChange} />
                </div>
              </div>
              <div className="d-modal-actions">
                <button type="button" className="d-btn d-btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="d-btn d-btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KelolaAset;
