import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api";
import { formatRupiah, formatTanggal, slugBadge } from "../../../utils/format";
import "./AsetList.css";

function AsetList({ userData, initialTab = "aset" }) {
  const [asets, setAsets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    kondisi: "",
    status_bmn: "",
    nama_satker: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    kondisi: [],
    status_bmn: [],
    nama_satker: [],
  });

  // ─── State Peminjaman ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pinjamModal, setPinjamModal] = useState(null); // aset yang dipilih
  const [pinjamForm, setPinjamForm] = useState({ tanggal_pinjam: "", tanggal_rencana_kembali: "", keterangan: "" });
  const [pinjamSaving, setPinjamSaving] = useState(false);
  const [pinjamMsg, setPinjamMsg] = useState({ text: "", type: "" });
  const [riwayat, setRiwayat] = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  // ─── State Pengembalian oleh User ───────────────────────────────────
  const [modalUserKembali, setModalUserKembali] = useState(null);
  const [tglUserKembali, setTglUserKembali] = useState(new Date().toISOString().slice(0, 10));
  const [kondisiUserKembali, setKondisiUserKembali] = useState("Baik");
  const [catatanUserKembali, setCatatanUserKembali] = useState("");
  const [submittingUserKembali, setSubmittingUserKembali] = useState(false);
  const [msgUserKembali, setMsgUserKembali] = useState({ text: "", type: "" });

  // Fetch data aset dari database
  const fetchAsets = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pagination.limit,
          search: searchTerm,
          ...filters,
        };
        const response = await api.get("/aset", { params });
        if (response.data.success) {
          setAsets(response.data.data);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        console.error("Error fetching asets:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, pagination.limit]
  );

  // Fetch opsi filter yang ada dari database
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get("/aset/opsi-filter");
      if (response.data.success) {
        setFilterOptions(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAsets(1);
  }, [fetchAsets]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      kondisi: "",
      status_bmn: "",
      nama_satker: "",
    });
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchAsets(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchAsets(pagination.page + 1);
    }
  };

  const isFiltered =
    searchTerm || filters.kondisi || filters.status_bmn || filters.nama_satker;

  const activeFilterCount = [
    filters.kondisi,
    filters.status_bmn,
    filters.nama_satker,
  ].filter(Boolean).length;

  // ─── Fungsi Peminjaman ──────────────────────────────────────────────
  const fetchRiwayat = useCallback(async () => {
    if (!userData?.nip) return;
    setRiwayatLoading(true);
    try {
      const res = await api.get(`/peminjaman/user/${userData.nip}`);
      setRiwayat(res.data.data || []);
    } catch {}
    finally { setRiwayatLoading(false); }
  }, [userData]);

  useEffect(() => {
    if (activeTab === "peminjaman" || activeTab === "pengembalian") {
      fetchRiwayat();
    }
  }, [activeTab, fetchRiwayat]);

  const openPinjam = (aset) => {
    const today = new Date().toISOString().slice(0, 10);
    setPinjamForm({ tanggal_pinjam: today, tanggal_rencana_kembali: "", keterangan: "" });
    setPinjamMsg({ text: "", type: "" });
    setPinjamModal(aset);
  };

  const submitPinjam = async (e) => {
    e.preventDefault();
    if (!pinjamForm.tanggal_pinjam) {
      setPinjamMsg({ text: "Tanggal pinjam wajib diisi.", type: "error" });
      return;
    }
    setPinjamSaving(true);
    setPinjamMsg({ text: "", type: "" });
    try {
      await api.post("/peminjaman", {
        nip: userData.nip,
        aset_ids: [pinjamModal.id],
        tanggal_pinjam: pinjamForm.tanggal_pinjam,
        tanggal_rencana_kembali: pinjamForm.tanggal_rencana_kembali || null,
        keterangan: pinjamForm.keterangan || null,
      });
      setPinjamMsg({ text: "Permintaan peminjaman berhasil diajukan! Menunggu persetujuan admin.", type: "success" });
      setTimeout(() => { setPinjamModal(null); setActiveTab("peminjaman"); fetchRiwayat(); }, 1500);
    } catch (err) {
      setPinjamMsg({ text: err.response?.data?.message || "Gagal mengajukan peminjaman.", type: "error" });
    } finally {
      setPinjamSaving(false);
    }
  };

  const STATUS_CFG = {
    MENUNGGU:              { label: "Menunggu Persetujuan", color: "#b45309", bg: "#fef3c7" },
    DISETUJUI:             { label: "Disetujui (Siap Diambil)", color: "#1d4ed8", bg: "#dbeafe" },
    DIPINJAM:              { label: "Sedang Dipinjam", color: "#7c3aed", bg: "#ede9fe" },
    MENUNGGU_PENGEMBALIAN: { label: "Menunggu Verifikasi Admin", color: "#b45309", bg: "#fef9c3" },
    DIKEMBALIKAN:          { label: "Selesai Dikembalikan", color: "#15803d", bg: "#dcfce7" },
    DITOLAK:               { label: "Ditolak", color: "#dc2626", bg: "#fee2e2" },
  };

  const handleOpenUserKembali = (peminjamanItem) => {
    setModalUserKembali(peminjamanItem);
    setTglUserKembali(new Date().toISOString().slice(0, 10));
    setKondisiUserKembali("Baik");
    setCatatanUserKembali("");
    setMsgUserKembali({ text: "", type: "" });
  };

  const handleSubmitUserKembali = async (e) => {
    e.preventDefault();
    if (!modalUserKembali) return;
    setSubmittingUserKembali(true);
    setMsgUserKembali({ text: "", type: "" });
    try {
      const rawIds = modalUserKembali.aset_ids ? String(modalUserKembali.aset_ids).split(",") : [];
      const kondisiMap = {};
      if (rawIds.length > 0) {
        rawIds.forEach((id) => { kondisiMap[id.trim()] = kondisiUserKembali; });
      } else {
        kondisiMap[modalUserKembali.id] = kondisiUserKembali;
      }

      await api.put(`/peminjaman/${modalUserKembali.id}/ajukan-kembali`, {
        nip: userData?.nip,
        tanggal_kembali: tglUserKembali,
        kondisi_kembali: kondisiMap,
        catatan_kembali: catatanUserKembali,
      });
      setMsgUserKembali({
        text: "Pengembalian berhasil diajukan! Silakan serahkan barang fisik ke petugas BMN untuk verifikasi dan penyelesaian.",
        type: "success",
      });
      setTimeout(() => {
        setModalUserKembali(null);
        fetchRiwayat();
        fetchAsets(pagination.page);
      }, 1500);
    } catch (err) {
      setMsgUserKembali({
        text: err.response?.data?.message || "Gagal mengajukan pengembalian.",
        type: "error",
      });
    } finally {
      setSubmittingUserKembali(false);
    }
  };


  return (
    <div className="aset-list-container">
      {/* ── Tab Navigation ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
        {[
          ["aset", "📦 Daftar Aset BMN"],
          ["peminjaman", "📋 Peminjaman Saya (Aktif)"],
          ["pengembalian", "🔄 Riwayat Pengembalian"]
        ].map(([key, lbl]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: "8px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: "none", background: "none", borderBottom: activeTab === key ? "2px solid #0284c7" : "2px solid transparent",
            color: activeTab === key ? "#0284c7" : "#64748b", marginBottom: -2, transition: "all 0.15s",
          }}>{lbl}</button>
        ))}
      </div>

      {activeTab === "aset" && (
      <>
      {/* Header & Metrik */}
      <div className="aset-list-header">
        <div className="aset-header-left">
          <div className="aset-badge-scope">Katalog Inventaris BMKG</div>
          <h2 className="aset-header-title">Daftar Data Aset BMN</h2>
          <p className="aset-list-subtitle">
            Pencarian dan pemantauan data barang milik negara di lingkungan BMKG secara transparan dan akurat.
          </p>
        </div>

        <div className="aset-metric-chip">
          <div className="metric-chip-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="metric-chip-meta">
            <span className="metric-chip-value">{pagination.total?.toLocaleString("id-ID") || 0}</span>
            <span className="metric-chip-label">Total Aset Terdaftar</span>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian dan Filter */}
      <div className="search-filter-section">
        <div className="search-box-wrapper">
          <span className="search-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nama aset, kode barang, NUP, merk, tipe, atau satker..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchTerm("")}
              title="Hapus kata kunci pencarian"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns-row">
          <div className="filter-select-wrapper">
            <select
              name="kondisi"
              value={filters.kondisi}
              onChange={handleFilterChange}
              className={`filter-select ${filters.kondisi ? "active" : ""}`}
            >
              <option value="">Semua Kondisi Fisik</option>
              {filterOptions.kondisi && filterOptions.kondisi.length > 0 ? (
                filterOptions.kondisi.map((k) => (
                  <option key={k} value={k}>
                    Kondisi: {k}
                  </option>
                ))
              ) : (
                <>
                  <option value="Baik">Kondisi: Baik</option>
                  <option value="Rusak Ringan">Kondisi: Rusak Ringan</option>
                  <option value="Rusak Berat">Kondisi: Rusak Berat</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              name="status_bmn"
              value={filters.status_bmn}
              onChange={handleFilterChange}
              className={`filter-select ${filters.status_bmn ? "active" : ""}`}
            >
              <option value="">Semua Status BMN</option>
              {filterOptions.status_bmn && filterOptions.status_bmn.length > 0 ? (
                filterOptions.status_bmn.map((s) => (
                  <option key={s} value={s}>
                    Status: {s}
                  </option>
                ))
              ) : (
                <>
                  <option value="Digunakan">Status: Digunakan</option>
                  <option value="Tidak Digunakan">Status: Tidak Digunakan</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-select-wrapper filter-satker-wrapper">
            <select
              name="nama_satker"
              value={filters.nama_satker}
              onChange={handleFilterChange}
              className={`filter-select ${filters.nama_satker ? "active" : ""}`}
            >
              <option value="">Seluruh Satuan Kerja (Satker)</option>
              {filterOptions.nama_satker &&
                filterOptions.nama_satker.map((sat) => (
                  <option key={sat} value={sat}>
                    Satker: {sat}
                  </option>
                ))}
            </select>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-reset-filter"
              title="Reset semua filter dan pencarian"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Reset Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Data / State Loading / Empty State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-title">Sinkronisasi data inventaris...</p>
          <span className="loading-sub">Mengambil catatan aset terkini dari server BMKG</span>
        </div>
      ) : asets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <h3 className="empty-state-title">Aset Tidak Ditemukan</h3>
          <p className="empty-state-desc">
            {isFiltered
              ? "Tidak ada data aset inventaris yang cocok dengan kriteria filter atau kata kunci pencarian Anda."
              : "Belum ada catatan aset yang tersedia dalam basis data inventaris."}
          </p>
          {isFiltered && (
            <button onClick={handleClearFilters} className="btn-reset-empty">
              Kembalikan ke Semua Aset
            </button>
          )}
        </div>
      ) : (
        <div className="aset-table-container">
          <div className="table-wrapper">
            <table className="aset-table">
              <thead>
                <tr>
                  <th style={{ width: 46, textAlign: "center" }}>No</th>
                  <th>Nama Barang &amp; Pengelola</th>
                  <th>Kodefikasi BMN</th>
                  <th>Merk &amp; Tipe</th>
                  <th>Satuan Kerja</th>
                  <th>Kondisi Fisik</th>
                  <th>Status Penggunaan</th>
                  <th>Tgl Perolehan</th>
                  <th style={{ textAlign: "right" }}>Nilai Perolehan</th>
                  <th style={{ textAlign: "center" }}>Pinjam</th>
                </tr>
              </thead>
              <tbody>
                {asets.map((aset, idx) => (
                  <tr key={aset.id || idx}>
                    <td className="col-number">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>

                    <td className="col-nama-barang">
                      <div className="nama-barang-title">{aset.nama_barang || "Tanpa Nama Barang"}</div>
                      {aset.nama ? (
                        <div className="nama-pengelola">
                          <span className="pengelola-dot"></span>
                          <span>Pengelola: {aset.nama}</span>
                        </div>
                      ) : (
                        <div className="nama-pengelola-empty">Pengelola Umum / Bersama</div>
                      )}
                    </td>

                    <td className="col-kode">
                      <div className="kode-barang-cell">
                        <span className="kode-tag" title="Kode Barang">
                          {aset.kode_barang || "-"}
                        </span>
                        {aset.nup !== undefined && aset.nup !== null && (
                          <span className="nup-tag" title="Nomor Urut Pendaftaran">
                            NUP {aset.nup}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {aset.merk || aset.tipe ? (
                        <div className="merk-tipe-text">
                          <strong className="merk-strong">{aset.merk || "-"}</strong>
                          {aset.tipe && <span className="tipe-sub">{aset.tipe}</span>}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="col-satker">
                      {aset.nama_satker ? (
                        <div className="satker-cell" title={aset.nama_satker}>
                          <svg className="satker-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21h18"></path>
                            <path d="M9 8h1"></path>
                            <path d="M9 12h1"></path>
                            <path d="M9 16h1"></path>
                            <path d="M14 8h1"></path>
                            <path d="M14 12h1"></path>
                            <path d="M14 16h1"></path>
                            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                          </svg>
                          <span className="satker-name">{aset.nama_satker}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge-kondisi kondisi-${slugBadge(aset.kondisi)}`}>
                        <span className="badge-dot" aria-hidden="true"></span>
                        <span>{aset.kondisi || "Baik"}</span>
                      </span>
                    </td>

                    <td>
                      <span className={`badge-status status-${slugBadge(aset.status_bmn)}`}>
                        {aset.status_bmn || "Digunakan"}
                      </span>
                    </td>

                    <td className="col-tanggal">
                      {formatTanggal(aset.tanggal_perolehan)}
                    </td>

                    <td className="col-nilai text-right">
                      {formatRupiah(aset.nilai_perolehan)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {aset.status_pinjam === "DIPINJAM" ? (
                        <span style={{
                          display: "inline-block", padding: "4px 10px", fontSize: 11.5, fontWeight: 700, borderRadius: 20,
                          background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", whiteSpace: "nowrap"
                        }}>
                          Sedang Dipinjam
                        </span>
                      ) : aset.status_pinjam === "DISETUJUI" ? (
                        <span style={{
                          display: "inline-block", padding: "4px 10px", fontSize: 11.5, fontWeight: 700, borderRadius: 20,
                          background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", whiteSpace: "nowrap"
                        }}>
                          Disetujui
                        </span>
                      ) : (
                        <button
                          onClick={() => openPinjam(aset)}
                          title="Ajukan peminjaman aset ini"
                          style={{
                            padding: "4px 12px", fontSize: 12, fontWeight: 700, borderRadius: 20,
                            border: "1px solid #0284c7", background: "#e0f2fe", color: "#0284c7",
                            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#0284c7"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#e0f2fe"; e.currentTarget.style.color = "#0284c7"; }}
                        >
                          + Pinjam
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="pagination-wrapper">
            <div className="pagination-info">
              Menampilkan{" "}
              <strong>
                {Math.min(
                  (pagination.page - 1) * pagination.limit + 1,
                  pagination.total
                )}
              </strong>{" "}
              –{" "}
              <strong>
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}
              </strong>{" "}
              dari <strong>{pagination.total?.toLocaleString("id-ID")}</strong> total aset
            </div>

            <div className="pagination-controls">
              <button
                onClick={handlePrevPage}
                disabled={pagination.page <= 1}
                className="btn-pagination"
                aria-label="Halaman sebelumnya"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Sebelumnya</span>
              </button>

              <div className="pagination-page-indicator">
                <span className="page-current">{pagination.page}</span>
                <span className="page-slash">/</span>
                <span className="page-total">{pagination.totalPages}</span>
              </div>

              <button
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-pagination"
                aria-label="Halaman selanjutnya"
              >
                <span>Selanjutnya</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ── Tab Peminjaman Aktif ── */}
      {activeTab === "peminjaman" && (
        <div>
          <div className="aset-list-header" style={{ marginBottom: 16 }}>
            <div className="aset-header-left">
              <div className="aset-badge-scope">Status Peminjaman Pegawai</div>
              <h2 className="aset-header-title">Permohonan & Peminjaman Aktif</h2>
              <p className="aset-list-subtitle">Pantau permohonan yang menunggu persetujuan dan aset operasional yang sedang Anda gunakan.</p>
            </div>
          </div>
          {riwayatLoading ? (
            <div className="loading-state"><div className="spinner"></div><p className="loading-title">Memuat status peminjaman...</p></div>
          ) : riwayat.filter((r) => r.status !== "DIKEMBALIKAN").length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="empty-state-title">Tidak Ada Peminjaman Aktif</h3>
              <p className="empty-state-desc">Anda saat ini tidak memiliki permohonan yang sedang berjalan atau aset yang sedang dipinjam. Buka tab <strong>Daftar Aset BMN</strong> untuk meminjam barang.</p>
            </div>
          ) : (
            <div className="aset-table-container">
              <div className="table-wrapper">
                <table className="aset-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Aset yang Dipinjam</th>
                      <th>Tanggal Pinjam</th>
                      <th>Rencana Kembali</th>
                      <th>Status Saat Ini</th>
                      <th>Keterangan Keperluan</th>
                      <th style={{ textAlign: "center", width: 140 }}>Aksi Pengembalian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayat.filter((r) => r.status !== "DIKEMBALIKAN").map((r, i) => {
                      const cfg = STATUS_CFG[r.status] || { label: r.status, color: "#64748b", bg: "#f1f5f9" };
                      return (
                        <tr key={r.id}>
                          <td className="col-number">{i + 1}</td>
                          <td><div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{r.nama_aset || "—"}</div></td>
                          <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{formatTanggal(r.tanggal_pinjam)}</td>
                          <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{r.tanggal_rencana_kembali ? formatTanggal(r.tanggal_rencana_kembali) : "—"}</td>
                          <td>
                            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "#64748b" }}>{r.keterangan || "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            {r.status === "DIPINJAM" ? (
                              <button
                                onClick={() => handleOpenUserKembali(r)}
                                style={{
                                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                  background: "#16a34a", color: "#fff", border: "none", cursor: "pointer",
                                  display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"
                                }}
                              >
                                🔄 Kembalikan
                              </button>
                            ) : r.status === "MENUNGGU_PENGEMBALIAN" ? (
                              <span style={{ fontSize: 11.5, color: "#b45309", fontWeight: 700 }}>
                                ⏳ Verifikasi Admin
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Riwayat & Fitur Pengembalian ── */}
      {activeTab === "pengembalian" && (
        <div>
          <div className="aset-list-header" style={{ marginBottom: 16 }}>
            <div className="aset-header-left">
              <div className="aset-badge-scope" style={{ background: "#dcfce7", color: "#15803d" }}>Layanan Pengembalian BMN</div>
              <h2 className="aset-header-title">Pengembalian Aset Operasional</h2>
              <p className="aset-list-subtitle">Ajukan pengembalian aset yang telah selesai digunakan untuk diperiksa dan disubmit selesai oleh admin BMN.</p>
            </div>
          </div>

          {/* Bagian 1: Barang yang Sedang Dipinjam & Perlu Dikembalikan */}
          {riwayat.filter((r) => r.status === "DIPINJAM").length > 0 && (
            <div style={{ marginBottom: 24, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed" }} />
                <h3 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>Barang yang Sedang Anda Bawa (Siap Dikembalikan)</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {riwayat.filter((r) => r.status === "DIPINJAM").map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <strong style={{ fontSize: 13.5, color: "#0f172a", display: "block" }}>{item.nama_aset}</strong>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Dipinjam sejak: {formatTanggal(item.tanggal_pinjam)} · Rencana kembali: {formatTanggal(item.tanggal_rencana_kembali) || "—"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenUserKembali(item)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        background: "#16a34a", color: "#fff", border: "none", cursor: "pointer",
                      }}
                    >
                      🔄 Kembalikan Barang Ini
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bagian 2: Pengembalian Sedang Menunggu Verifikasi Admin */}
          {riwayat.filter((r) => r.status === "MENUNGGU_PENGEMBALIAN").length > 0 && (
            <div style={{ marginBottom: 24, background: "#fefce8", border: "1px solid #fef08a", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} />
                <h3 style={{ margin: 0, fontSize: 14, color: "#854d0e" }}>Pengembalian Sedang Menunggu Verifikasi Petugas BMN</h3>
              </div>
              <p style={{ margin: "0 0 10px 0", fontSize: 12.5, color: "#713f12" }}>
                Pengajuan pengembalian telah Anda kirim. Silakan serahkan unit fisik barang ke pengelola BMN agar admin memeriksa kondisi dan melakukan submit selesai.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {riwayat.filter((r) => r.status === "MENUNGGU_PENGEMBALIAN").map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #fde047", borderRadius: 8, padding: "10px 14px" }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{item.nama_aset}</strong>
                      <div style={{ fontSize: 12, color: "#854d0e" }}>Tanggal Pengajuan Kembali: {formatTanggal(item.tanggal_kembali)}</div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, background: "#fef9c3", color: "#854d0e", padding: "3px 10px", borderRadius: 12 }}>
                      Menunggu Cek Admin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bagian 3: Histori Selesai Dikembalikan */}
          <h3 style={{ fontSize: 14, margin: "0 0 10px 0", color: "#334155" }}>Histori Selesai Dikembalikan</h3>
          {riwayatLoading ? (
            <div className="loading-state"><div className="spinner"></div><p className="loading-title">Memuat histori pengembalian...</p></div>
          ) : riwayat.filter((r) => r.status === "DIKEMBALIKAN").length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <h3 className="empty-state-title">Belum Ada Riwayat Selesai Dikembalikan</h3>
              <p className="empty-state-desc">Belum ada catatan aset yang pernah selesai dikembalikan dalam akun Anda.</p>
            </div>
          ) : (
            <div className="aset-table-container">
              <div className="table-wrapper">
                <table className="aset-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Aset Dikembalikan</th>
                      <th>Tanggal Pinjam</th>
                      <th>Tanggal Kembali Real</th>
                      <th>Kondisi Saat Kembali</th>
                      <th>Status</th>
                      <th>Catatan Pengembalian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayat.filter((r) => r.status === "DIKEMBALIKAN").map((r, i) => (
                      <tr key={r.id}>
                        <td className="col-number">{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nama_aset || "—"}</div>
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{formatTanggal(r.tanggal_pinjam)}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: 13, fontWeight: 700, color: "#16a34a" }}>
                          {formatTanggal(r.tanggal_kembali)}
                        </td>
                        <td style={{ fontSize: 12.5, color: "#334155" }}>
                          {r.detail_aset_kondisi || "Baik"}
                        </td>
                        <td>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#15803d", background: "#dcfce7" }}>
                            ✓ Dikembalikan
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: "#64748b" }}>{r.keterangan || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Pengajuan Peminjaman ── */}
      {pinjamModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setPinjamModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 460,
            boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", marginBottom: 4, textTransform: "uppercase" }}>Pengajuan Peminjaman</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{pinjamModal.nama_barang}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{pinjamModal.kode_barang} · NUP {pinjamModal.nup}</div>
              </div>
              <button onClick={() => setPinjamModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
            </div>

            {pinjamMsg.text && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600,
                background: pinjamMsg.type === "error" ? "#fee2e2" : "#dcfce7",
                color: pinjamMsg.type === "error" ? "#dc2626" : "#15803d",
                border: `1px solid ${pinjamMsg.type === "error" ? "#fca5a5" : "#86efac"}`,
              }}>{pinjamMsg.text}</div>
            )}

            <form onSubmit={submitPinjam}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>Tanggal Pinjam *</label>
                  <input
                    type="date"
                    value={pinjamForm.tanggal_pinjam}
                    onChange={(e) => setPinjamForm({ ...pinjamForm, tanggal_pinjam: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>Rencana Kembali</label>
                  <input
                    type="date"
                    value={pinjamForm.tanggal_rencana_kembali}
                    onChange={(e) => setPinjamForm({ ...pinjamForm, tanggal_rencana_kembali: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>Keterangan / Keperluan</label>
                  <textarea
                    value={pinjamForm.keterangan}
                    onChange={(e) => setPinjamForm({ ...pinjamForm, keterangan: e.target.value })}
                    placeholder="Tulis keperluan peminjaman aset ini..."
                    rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  type="submit"
                  disabled={pinjamSaving}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                    background: pinjamSaving ? "#94a3b8" : "#0284c7", color: "#fff",
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: pinjamSaving ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {pinjamSaving ? "Mengajukan..." : "Ajukan Peminjaman"}
                </button>
                <button
                  type="button"
                  onClick={() => setPinjamModal(null)}
                  style={{
                    flex: "none", padding: "11px 20px", borderRadius: 10,
                    border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569",
                    fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Pengajuan Pengembalian oleh User ── */}
      {modalUserKembali && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setModalUserKembali(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Layanan Pengembalian BMN
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  Ajukan Pengembalian Aset
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
                  Aset: <strong>{modalUserKembali.nama_aset || modalUserKembali.nama_barang || "Aset Terpilih"}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalUserKembali(null)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {msgUserKembali.text && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  background: msgUserKembali.type === "error" ? "#fee2e2" : "#dcfce7",
                  color: msgUserKembali.type === "error" ? "#dc2626" : "#15803d",
                  border: `1px solid ${msgUserKembali.type === "error" ? "#fca5a5" : "#86efac"}`,
                }}
              >
                {msgUserKembali.text}
              </div>
            )}

            <form onSubmit={handleSubmitUserKembali}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Tanggal Pengembalian *
                </label>
                <input
                  type="date"
                  value={tglUserKembali}
                  onChange={(e) => setTglUserKembali(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Kondisi Fisik Barang Saat Dikembalikan *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { val: "Baik", label: "🟢 Baik", desc: "Normal & lengkap" },
                    { val: "Rusak Ringan", label: "🟡 Rusak Ringan", desc: "Kendala minor" },
                    { val: "Rusak Berat", label: "🔴 Rusak Berat", desc: "Tidak berfungsi" },
                  ].map((k) => (
                    <label
                      key={k.val}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "10px 6px",
                        borderRadius: 8,
                        border: kondisiUserKembali === k.val ? "2px solid #16a34a" : "1px solid #e2e8f0",
                        background: kondisiUserKembali === k.val ? "#f0fdf4" : "#f8fafc",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="kondisiUser"
                        value={k.val}
                        checked={kondisiUserKembali === k.val}
                        onChange={(e) => setKondisiUserKembali(e.target.value)}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: kondisiUserKembali === k.val ? "#15803d" : "#334155" }}>
                        {k.label}
                      </span>
                      <span style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{k.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Catatan / Keterangan Pengembalian
                </label>
                <textarea
                  value={catatanUserKembali}
                  onChange={(e) => setCatatanUserKembali(e.target.value)}
                  placeholder="Kelengkapan unit (charger, kabel, dsb), kondisi bodi, atau lokasi serah terima fisik..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#166534",
                  marginBottom: 18,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span>ℹ️</span>
                <span>
                  Setelah submit, serahkan barang fisik ke <strong>Pengelola BMN</strong> agar admin memeriksa fisik dan melakukan konfirmasi submit selesai.
                </span>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={submittingUserKembali}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 10,
                    border: "none",
                    background: submittingUserKembali ? "#94a3b8" : "#16a34a",
                    color: "#ffffff",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: submittingUserKembali ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {submittingUserKembali ? "Mengajukan..." : "✓ Kirim Pengajuan Pengembalian"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalUserKembali(null)}
                  style={{
                    padding: "11px 18px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AsetList;
