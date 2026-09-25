import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
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
  nama_satker: "",
  tanggal_dari: "",
  tanggal_sampai: "",
  nilai_min: "",
  nilai_max: "",
  ketersediaan: "",
};

const FILTER_LABELS = {
  kondisi: "Kondisi",
  status_bmn: "Status BMN",
  nama_satker: "Satker",
  ketersediaan: "Status Pinjam",
  tanggal_dari: "Dari",
  tanggal_sampai: "Sampai",
  nilai_min: "Min",
  nilai_max: "Max",
};

export default function KelolaAset({ initialTab = "aset" }) {
  const { admin } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab);

  // ─── Stat Metrics ──────────────────────────────────────────────────────────
  const [ringkasan, setRingkasan] = useState({
    total_aset: 0,
    aset_tersedia: 0,
    aset_dipinjam: 0,
    peminjaman_menunggu: 0,
  });

  const loadRingkasan = useCallback(() => {
    api.get("/aset/ringkasan-status")
      .then((res) => setRingkasan(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRingkasan();
  }, [loadRingkasan]);

  // Sync activeTab with URL if needed
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. DATA INVENTARIS ASET (Tab 1)
  // ════════════════════════════════════════════════════════════════════════════
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [opsi, setOpsi] = useState({ kondisi: [], status_bmn: [], nama_satker: [] });
  const [loadingAset, setLoadingAset] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  // Modal Aset
  const [showModalAset, setShowModalAset] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formAset, setFormAset] = useState(KOSONG);
  const [savingAset, setSavingAset] = useState(false);
  const [formAsetError, setFormAsetError] = useState("");

  useEffect(() => {
    api.get("/aset/opsi-filter")
      .then((res) => setOpsi(res.data.data))
      .catch(() => {});
  }, []);

  const loadDataAset = useCallback(
    (page = 1) => {
      setLoadingAset(true);
      api.get("/aset", { params: { search, ...filter, page, limit: 10 } })
        .then((res) => {
          setRows(res.data.data);
          setPagination(res.data.pagination);
        })
        .catch(() => {})
        .finally(() => setLoadingAset(false));
    },
    [search, filter]
  );

  useEffect(() => {
    if (activeTab === "aset") {
      loadDataAset(1);
    }
  }, [activeTab, loadDataAset]);

  const openTambahAset = () => {
    setEditingId(null);
    setFormAset(KOSONG);
    setFormAsetError("");
    setShowModalAset(true);
  };

  const openEditAset = (aset) => {
    setEditingId(aset.id);
    setFormAset({
      ...aset,
      tanggal_perolehan: aset.tanggal_perolehan ? aset.tanggal_perolehan.slice(0, 10) : "",
      nilai_perolehan: aset.nilai_perolehan || "",
    });
    setFormAsetError("");
    setShowModalAset(true);
  };

  const handleSubmitAset = async (e) => {
    e.preventDefault();
    setSavingAset(true);
    setFormAsetError("");
    const payload = { ...formAset, admin_id: admin?.id };
    try {
      if (editingId) {
        await api.put(`/aset/${editingId}`, payload);
      } else {
        await api.post("/aset", payload);
      }
      setShowModalAset(false);
      loadDataAset(pagination.page);
      loadRingkasan();
    } catch (err) {
      setFormAsetError(err.response?.data?.message || "Gagal menyimpan data aset");
    } finally {
      setSavingAset(false);
    }
  };

  const handleDeleteAset = async (aset) => {
    if (!window.confirm(`Hapus aset "${aset.nama_barang}"?`)) return;
    try {
      await api.delete(`/aset/${aset.id}`, { data: { admin_id: admin?.id } });
      loadDataAset(pagination.page);
      loadRingkasan();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus aset");
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 2. KELOLA PEMINJAMAN ASET (Tab 2)
  // ════════════════════════════════════════════════════════════════════════════
  const [peminjamanList, setPeminjamanList] = useState([]);
  const [loadingPinjam, setLoadingPinjam] = useState(false);
  const [statusPinjamFilter, setStatusPinjamFilter] = useState("");
  const [searchPinjam, setSearchPinjam] = useState("");
  const [peminjamanPage, setPeminjamanPage] = useState(1);
  const [peminjamanPagination, setPeminjamanPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadDataPeminjaman = useCallback(() => {
    setLoadingPinjam(true);
    api.get("/peminjaman", {
      params: { status: statusPinjamFilter, search: searchPinjam, page: peminjamanPage, limit: 10 },
    })
      .then((res) => {
        setPeminjamanList(res.data.data);
        setPeminjamanPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoadingPinjam(false));
  }, [statusPinjamFilter, searchPinjam, peminjamanPage]);

  useEffect(() => {
    if (activeTab === "peminjaman") {
      loadDataPeminjaman();
    }
  }, [activeTab, loadDataPeminjaman]);

  // Aksi Peminjaman (Setujui, Tolak, Serahkan)
  const [actionLoading, setActionLoading] = useState("");
  const [modalTolak, setModalTolak] = useState(null); // item to reject
  const [alasanTolak, setAlasanTolak] = useState("");
  const [modalDetail, setModalDetail] = useState(null); // detail item

  const handleSetujuiPinjam = async (item) => {
    if (!window.confirm(`Setujui permohonan peminjaman oleh ${item.nama_pegawai}?`)) return;
    setActionLoading(`setujui-${item.id}`);
    try {
      await api.put(`/peminjaman/${item.id}/setujui`);
      loadDataPeminjaman();
      loadRingkasan();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menyetujui peminjaman");
    } finally {
      setActionLoading("");
    }
  };

  const handleKonfirmasiTolak = async (e) => {
    e.preventDefault();
    if (!modalTolak) return;
    setActionLoading(`tolak-${modalTolak.id}`);
    try {
      await api.put(`/peminjaman/${modalTolak.id}/tolak`, { alasan: alasanTolak });
      setModalTolak(null);
      setAlasanTolak("");
      loadDataPeminjaman();
      loadRingkasan();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menolak permohonan");
    } finally {
      setActionLoading("");
    }
  };

  const handleSerahkanBarang = async (item) => {
    if (!window.confirm(`Serahkan barang ke ${item.nama_pegawai}? Status akan berubah menjadi DIPINJAM.`)) return;
    setActionLoading(`serahkan-${item.id}`);
    try {
      await api.put(`/peminjaman/${item.id}/dipinjam`, { admin_id: admin?.id });
      loadDataPeminjaman();
      loadRingkasan();
      loadDataAset(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memperbarui status");
    } finally {
      setActionLoading("");
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 3. KELOLA PENGEMBALIAN ASET (Tab 3)
  // ════════════════════════════════════════════════════════════════════════════
  const [aktifDipinjam, setAktifDipinjam] = useState([]);
  const [loadingAktif, setLoadingAktif] = useState(false);
  const [subTabPengembalian, setSubTabPengembalian] = useState("aktif"); // 'aktif' | 'riwayat'
  const [riwayatPengembalian, setRiwayatPengembalian] = useState([]);
  const [loadingRiwayatKembali, setLoadingRiwayatKembali] = useState(false);

  // Modal Pengembalian
  const [modalKembali, setModalKembali] = useState(null); // item peminjaman being returned
  const [tglKembaliInput, setTglKembaliInput] = useState(new Date().toISOString().slice(0, 10));
  const [kondisiKembaliMap, setKondisiKembaliMap] = useState({});
  const [catatanKembali, setCatatanKembali] = useState("");
  const [submittingKembali, setSubmittingKembali] = useState(false);

  const loadAktifDipinjam = useCallback(() => {
    setLoadingAktif(true);
    api.get("/peminjaman/aktif-dipinjam")
      .then((res) => setAktifDipinjam(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingAktif(false));
  }, []);

  const loadRiwayatKembali = useCallback(() => {
    setLoadingRiwayatKembali(true);
    api.get("/peminjaman", { params: { status: "DIKEMBALIKAN", limit: 20 } })
      .then((res) => setRiwayatPengembalian(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingRiwayatKembali(false));
  }, []);

  useEffect(() => {
    if (activeTab === "pengembalian") {
      if (subTabPengembalian === "aktif") {
        loadAktifDipinjam();
      } else {
        loadRiwayatKembali();
      }
    }
  }, [activeTab, subTabPengembalian, loadAktifDipinjam, loadRiwayatKembali]);

  const openModalPengembalian = async (item) => {
    try {
      const res = await api.get(`/peminjaman/${item.id || item.peminjaman_id}`);
      const detailData = res.data.data;
      setModalKembali(detailData);
      setTglKembaliInput(new Date().toISOString().slice(0, 10));
      setCatatanKembali("");
      const initialConditions = {};
      detailData.detail?.forEach((d) => {
        initialConditions[d.aset_id] = d.kondisi_saat_pinjam || "Baik";
      });
      setKondisiKembaliMap(initialConditions);
    } catch (err) {
      alert("Gagal memuat rincian peminjaman untuk proses pengembalian");
    }
  };

  const handleConfirmPengembalian = async (e) => {
    e.preventDefault();
    if (!modalKembali) return;
    setSubmittingKembali(true);
    try {
      const payload = {
        tanggal_kembali: tglKembaliInput,
        kondisi_kembali: kondisiKembaliMap,
        catatan_kembali: catatanKembali,
        admin_id: admin?.id,
      };
      await api.put(`/peminjaman/${modalKembali.id}/kembalikan`, payload);
      alert("Aset berhasil dikembalikan dan tercatat dalam sistem!");
      setModalKembali(null);
      loadRingkasan();
      loadAktifDipinjam();
      loadDataAset(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memproses pengembalian");
    } finally {
      setSubmittingKembali(false);
    }
  };

  // Helper badge status peminjaman pada baris aset
  const renderAsetLoanStatus = (aset) => {
    if (aset.status_pinjam === "MENUNGGU_PENGEMBALIAN") {
      return (
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fde68a",
              whiteSpace: "nowrap",
            }}
            title={`Pengembalian diajukan oleh ${aset.peminjam_nama || aset.peminjam_nip}`}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
            Diajukan User (Verifikasi)
          </span>
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => openModalPengembalian({ id: aset.peminjaman_id, nama_barang: aset.nama_barang })}
              className="btn-action-kembali"
              style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", fontWeight: 700 }}
              title="Periksa fisik dan selesaikan pengembalian"
            >
              ✓ Selesaikan Pengembalian
            </button>
          </div>
        </div>
      );
    }
    if (aset.status_pinjam === "DIPINJAM") {
      return (
        <div>
          <span className="badge-pinjam-dipinjam" title={`Dipinjam oleh ${aset.peminjam_nama} (${aset.peminjam_nip})`}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
            Dipinjam: {aset.peminjam_nama || aset.peminjam_nip}
          </span>
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => openModalPengembalian({ id: aset.peminjaman_id, nama_barang: aset.nama_barang })}
              className="btn-action-kembali"
              title="Proses dan selesaikan pengembalian aset ini"
            >
              🔄 Selesaikan Pengembalian
            </button>
          </div>
        </div>
      );
    }
    if (aset.status_pinjam === "DISETUJUI") {
      return (
        <span className="badge-pinjam-disetujui">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7" }} />
          Disetujui (Siap Diambil)
        </span>
      );
    }
    return (
      <span className="badge-pinjam-tersedia">
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
        Tersedia
      </span>
    );
  };

  const activeFilterCount = Object.values(filter).filter(Boolean).length;
  const hasActiveFilter = activeFilterCount > 0 || search;

  return (
    <div>
      {/* ─── Top Unified Statistics Cards ─── */}
      <div className="d-grid-cards" style={{ marginBottom: 18 }}>
        <div className="d-card" style={{ cursor: "pointer" }} onClick={() => handleTabChange("aset")}>
          <div className="d-card-label">TOTAL ASET BMN</div>
          <div className="d-card-value">{ringkasan.total_aset.toLocaleString("id-ID")}</div>
          <div className="d-card-sub">Katalog Inventaris Resmi BMKG</div>
        </div>

        <div className="d-card" style={{ cursor: "pointer" }} onClick={() => { handleTabChange("aset"); setFilter({ ...FILTER_AWAL, ketersediaan: "tersedia" }); }}>
          <div className="d-card-label" style={{ color: "#16a34a" }}>ASET TERSEDIA</div>
          <div className="d-card-value" style={{ color: "#15803d" }}>{ringkasan.aset_tersedia.toLocaleString("id-ID")}</div>
          <div className="d-card-sub">Siap digunakan & dipinjamkan</div>
        </div>

        <div className="d-card" style={{ cursor: "pointer" }} onClick={() => handleTabChange("pengembalian")}>
          <div className="d-card-label" style={{ color: "#7c3aed" }}>SEDANG DIPINJAM</div>
          <div className="d-card-value" style={{ color: "#6d28d9" }}>{ringkasan.aset_dipinjam.toLocaleString("id-ID")}</div>
          <div className="d-card-sub">Operasional oleh pegawai dinas</div>
        </div>

        <div className="d-card" style={{ cursor: "pointer" }} onClick={() => handleTabChange("peminjaman")}>
          <div className="d-card-label" style={{ color: "#b45309" }}>PERMOHONAN MENUNGGU</div>
          <div className="d-card-value" style={{ color: "#d97706" }}>{ringkasan.peminjaman_menunggu}</div>
          <div className="d-card-sub">Menunggu persetujuan admin</div>
        </div>
      </div>

      {/* ─── Unified Hub Tab Bar ─── */}
      <div className="aset-unified-tabs">
        <button
          className={`aset-unified-tab ${activeTab === "aset" ? "active" : ""}`}
          onClick={() => handleTabChange("aset")}
        >
          <span>📦 Data Inventaris Aset</span>
          <span className="aset-tab-pill">{ringkasan.total_aset}</span>
        </button>

        <button
          className={`aset-unified-tab ${activeTab === "peminjaman" ? "active" : ""}`}
          onClick={() => handleTabChange("peminjaman")}
        >
          <span>📋 Kelola Peminjaman User</span>
          {ringkasan.peminjaman_menunggu > 0 ? (
            <span className="aset-tab-pill aset-tab-pill-warn">{ringkasan.peminjaman_menunggu} baru</span>
          ) : (
            <span className="aset-tab-pill">0</span>
          )}
        </button>

        <button
          className={`aset-unified-tab ${activeTab === "pengembalian" ? "active" : ""}`}
          onClick={() => handleTabChange("pengembalian")}
        >
          <span>🔄 Kelola Pengembalian User</span>
          {ringkasan.pengembalian_menunggu > 0 ? (
            <span className="aset-tab-pill aset-tab-pill-warn" style={{ background: "#fef08a", color: "#854d0e" }}>
              {ringkasan.pengembalian_menunggu} perlu verifikasi
            </span>
          ) : (
            <span className="aset-tab-pill">{ringkasan.aset_dipinjam} aktif</span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DATA INVENTARIS ASET                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "aset" && (
        <div className="d-panel">
          <div className="d-toolbar" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <div className="d-search-box" style={{ maxWidth: 360 }}>
                <svg className="d-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  className="d-search-input"
                  placeholder="Cari barang, kode BMN, satker, merk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && <button className="d-search-clear" onClick={() => setSearch("")}>✕</button>}
              </div>

              <select
                className="d-select"
                value={filter.ketersediaan}
                onChange={(e) => setFilter({ ...filter, ketersediaan: e.target.value })}
                style={{ fontSize: 13, padding: "8px 12px" }}
              >
                <option value="">Semua Ketersediaan</option>
                <option value="tersedia">🟢 Hanya Aset Tersedia</option>
                <option value="dipinjam">🟣 Hanya Sedang Dipinjam</option>
              </select>

              <button
                className={`d-btn d-btn-secondary ${activeFilterCount > 0 ? "d-btn-filter-active" : ""}`}
                onClick={() => setShowFilter((v) => !v)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>
                Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="d-btn d-btn-primary" onClick={openTambahAset}>
                + Tambah Aset
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <div className="d-filter-panel" style={{ marginBottom: 16 }}>
              <div className="d-filter-grid">
                <div className="d-filter-item">
                  <label>Kondisi</label>
                  <select name="kondisi" value={filter.kondisi} onChange={(e) => setFilter({ ...filter, kondisi: e.target.value })}>
                    <option value="">Semua</option>
                    {opsi.kondisi.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="d-filter-item">
                  <label>Status BMN</label>
                  <select name="status_bmn" value={filter.status_bmn} onChange={(e) => setFilter({ ...filter, status_bmn: e.target.value })}>
                    <option value="">Semua</option>
                    {opsi.status_bmn.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="d-filter-item">
                  <label>Satuan Kerja</label>
                  <select name="nama_satker" value={filter.nama_satker} onChange={(e) => setFilter({ ...filter, nama_satker: e.target.value })}>
                    <option value="">Semua</option>
                    {opsi.nama_satker.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="d-filter-footer">
                <button className="d-btn d-btn-secondary d-btn-sm" onClick={() => setFilter(FILTER_AWAL)}>Reset Semua Filter</button>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {hasActiveFilter && (
            <div className="d-filter-chips" style={{ marginBottom: 14 }}>
              {search && (
                <span className="d-chip">"{search}"<button onClick={() => setSearch("")}>✕</button></span>
              )}
              {Object.entries(filter).map(([k, v]) =>
                v ? (
                  <span key={k} className="d-chip">
                    {FILTER_LABELS[k] || k}: {v}
                    <button onClick={() => setFilter((f) => ({ ...f, [k]: "" }))}>✕</button>
                  </span>
                ) : null
              )}
              <button className="d-chip-reset" onClick={() => { setFilter(FILTER_AWAL); setSearch(""); }}>Reset</button>
            </div>
          )}

          {/* Tabel Aset */}
          <div className="d-table-wrapper">
            <table className="d-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>No</th>
                  <th>Nama Barang</th>
                  <th>Kodefikasi BMN</th>
                  <th>Satuan Kerja</th>
                  <th>Kondisi Fisik</th>
                  <th>Status Peminjaman</th>
                  <th style={{ textAlign: "right" }}>Nilai Perolehan</th>
                  <th style={{ textAlign: "center", width: 90 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingAset ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                      <div className="d-loading"><div className="d-spinner" /><span>Memuat data aset...</span></div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                      Belum ada data inventaris aset yang tercatat. Silakan tambah data baru atau impor dari berkas BMN.
                    </td>
                  </tr>
                ) : (
                  rows.map((aset, idx) => (
                    <tr key={aset.id}>
                      <td style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                        {(pagination.page - 1) * pagination.limit + idx + 1}
                      </td>
                      <td>
                        <strong style={{ display: "block", color: "#0f172a" }}>{aset.nama_barang}</strong>
                        {aset.merk && <span style={{ fontSize: 12, color: "#64748b" }}>{aset.merk} {aset.tipe ? `(${aset.tipe})` : ""}</span>}
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#0369a1", background: "#f0f9ff", padding: "2px 6px", borderRadius: 4 }}>
                          {aset.kode_barang}
                        </span>
                        {aset.nup && <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b" }}>NUP {aset.nup}</span>}
                      </td>
                      <td style={{ fontSize: 12.5, color: "#334155" }}>{aset.nama_satker || "—"}</td>
                      <td>
                        <span className={`badge-kondisi kondisi-${slugBadge(aset.kondisi)}`}>
                          {aset.kondisi || "Baik"}
                        </span>
                      </td>
                      <td>
                        {renderAsetLoanStatus(aset)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontSize: 12.5 }}>
                        {formatRupiah(aset.nilai_perolehan)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => openEditAset(aset)} className="d-btn-icon" title="Edit Data Aset">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteAset(aset)} className="d-btn-icon d-btn-icon-danger" title="Hapus Aset">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-pagination" style={{ marginTop: 14 }}>
              <div className="d-pagination-info">
                Menampilkan {((pagination.page - 1) * pagination.limit) + 1} – {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} aset
              </div>
              <div className="d-pagination-nav">
                <button
                  className="d-pagination-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => loadDataAset(pagination.page - 1)}
                >
                  Sebelumnya
                </button>
                <span style={{ fontSize: 13, padding: "0 8px" }}>
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="d-pagination-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadDataAset(pagination.page + 1)}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: KELOLA PEMINJAMAN ASET                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "peminjaman" && (
        <div className="d-panel">
          <div className="d-toolbar" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <div className="d-search-box" style={{ maxWidth: 360 }}>
                <svg className="d-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  className="d-search-input"
                  placeholder="Cari nama pegawai, NIP, atau nama barang..."
                  value={searchPinjam}
                  onChange={(e) => setSearchPinjam(e.target.value)}
                />
              </div>

              <select
                className="d-select"
                value={statusPinjamFilter}
                onChange={(e) => setStatusPinjamFilter(e.target.value)}
                style={{ fontSize: 13, padding: "8px 12px" }}
              >
                <option value="">Semua Status Peminjaman</option>
                <option value="MENUNGGU">🟡 Menunggu Persetujuan</option>
                <option value="DISETUJUI">🔵 Disetujui (Belum Diambil)</option>
                <option value="DIPINJAM">🟣 Sedang Dipinjam (Aktif)</option>
                <option value="MENUNGGU_PENGEMBALIAN">🟡 Pengajuan Pengembalian Masuk</option>
                <option value="DIKEMBALIKAN">🟢 Selesai Dikembalikan</option>
                <option value="DITOLAK">🔴 Ditolak</option>
              </select>
            </div>
          </div>

          <div className="d-table-wrapper">
            <table className="d-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>ID</th>
                  <th>Pegawai Peminjam</th>
                  <th>Aset Dipinjam</th>
                  <th>Tanggal Pinjam</th>
                  <th>Rencana Kembali</th>
                  <th>Keperluan / Catatan</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center", width: 140 }}>Aksi Kelola</th>
                </tr>
              </thead>
              <tbody>
                {loadingPinjam ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                      <div className="d-loading"><div className="d-spinner" /><span>Memuat data peminjaman...</span></div>
                    </td>
                  </tr>
                ) : peminjamanList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                      Tidak ada data permohonan peminjaman yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  peminjamanList.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>#{item.id}</td>
                      <td>
                        <strong>{item.nama_pegawai}</strong>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>NIP: {item.nip}</div>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 13 }}>
                        {item.nama_aset || "—"}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{formatTanggal(item.tanggal_pinjam)}</td>
                      <td style={{ fontSize: 12.5 }}>{formatTanggal(item.tanggal_rencana_kembali) || "—"}</td>
                      <td style={{ fontSize: 12.5, color: "#475569", maxWidth: 180 }}>
                        {item.keterangan || "—"}
                      </td>
                      <td>
                        <span className={`badge-pinjam-${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          {item.status === "MENUNGGU" && (
                            <>
                              <button
                                onClick={() => handleSetujuiPinjam(item)}
                                disabled={actionLoading === `setujui-${item.id}`}
                                className="d-btn d-btn-sm"
                                style={{ background: "#16a34a", color: "#fff", border: "none", fontSize: 11.5 }}
                                title="Setujui permohonan peminjaman ini"
                              >
                                ✓ Setujui
                              </button>
                              <button
                                onClick={() => { setModalTolak(item); setAlasanTolak(""); }}
                                className="d-btn d-btn-sm"
                                style={{ background: "#dc2626", color: "#fff", border: "none", fontSize: 11.5 }}
                                title="Tolak permohonan"
                              >
                                ✕ Tolak
                              </button>
                            </>
                          )}

                          {item.status === "DISETUJUI" && (
                            <button
                              onClick={() => handleSerahkanBarang(item)}
                              disabled={actionLoading === `serahkan-${item.id}`}
                              className="d-btn d-btn-sm"
                              style={{ background: "#7c3aed", color: "#fff", border: "none", fontSize: 11.5 }}
                              title="Konfirmasi bahwa barang telah diserahkan ke pegawai"
                            >
                              📦 Serahkan
                            </button>
                          )}

                          {item.status === "DIPINJAM" && (
                            <button
                              onClick={() => openModalPengembalian(item)}
                              className="d-btn d-btn-sm"
                              style={{ background: "#0284c7", color: "#fff", border: "none", fontSize: 11.5 }}
                              title="Proses pengembalian aset ini"
                            >
                              🔄 Kembalikan
                            </button>
                          )}

                          <button
                            onClick={() => api.get(`/peminjaman/${item.id}`).then((r) => setModalDetail(r.data.data))}
                            className="d-btn d-btn-secondary d-btn-sm"
                            style={{ fontSize: 11 }}
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: KELOLA PENGEMBALIAN ASET                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pengembalian" && (
        <div className="d-panel">
          <div style={{ display: "flex", gap: 10, marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
            <button
              onClick={() => setSubTabPengembalian("aktif")}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: subTabPengembalian === "aktif" ? "#0284c7" : "#f1f5f9",
                color: subTabPengembalian === "aktif" ? "#fff" : "#475569", border: "none",
              }}
            >
              Sedang Dipinjam ({aktifDipinjam.length})
            </button>
            <button
              onClick={() => setSubTabPengembalian("riwayat")}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: subTabPengembalian === "riwayat" ? "#0284c7" : "#f1f5f9",
                color: subTabPengembalian === "riwayat" ? "#fff" : "#475569", border: "none",
              }}
            >
              Histori Selesai Dikembalikan
            </button>
          </div>

          {subTabPengembalian === "aktif" ? (
            <div>
              <div style={{ marginBottom: 14, color: "#64748b", fontSize: 13 }}>
                Daftar semua aset yang saat ini sedang dipinjam oleh pegawai. Klik <strong>"🔄 Proses Pengembalian"</strong> untuk memeriksa kondisi barang dan menyelesaikan peminjaman.
              </div>

              <div className="d-table-wrapper">
                <table className="d-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>ID</th>
                      <th>Pegawai Peminjam</th>
                      <th>Aset yang Dipinjam</th>
                      <th>Tanggal Pinjam</th>
                      <th>Rencana Kembali</th>
                      <th>Status Pengembalian</th>
                      <th>Tenggat Waktu</th>
                      <th style={{ textAlign: "center", width: 170 }}>Aksi Pengembalian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAktif ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                          <div className="d-loading"><div className="d-spinner" /><span>Memuat data aset yang sedang dipinjam...</span></div>
                        </td>
                      </tr>
                    ) : aktifDipinjam.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                          Tidak ada aset yang sedang dipinjam saat ini. Semua aset berada di inventaris.
                        </td>
                      </tr>
                    ) : (
                      aktifDipinjam.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            background: item.status === "MENUNGGU_PENGEMBALIAN" ? "#fefce8" : undefined,
                          }}
                        >
                          <td style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>#{item.id}</td>
                          <td>
                            <strong>{item.nama_pegawai}</strong>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>NIP: {item.nip}</div>
                          </td>
                          <td>
                            <strong>{item.nama_aset}</strong>
                            {item.kode_aset && <div style={{ fontSize: 11, color: "#64748b" }}>{item.kode_aset}</div>}
                          </td>
                          <td style={{ fontSize: 12.5 }}>{formatTanggal(item.tanggal_pinjam)}</td>
                          <td style={{ fontSize: 12.5 }}>{formatTanggal(item.tanggal_rencana_kembali) || "—"}</td>
                          <td>
                            {item.status === "MENUNGGU_PENGEMBALIAN" ? (
                              <div>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "3px 10px",
                                    borderRadius: 12,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    background: "#fef08a",
                                    color: "#854d0e",
                                    border: "1px solid #fde047",
                                  }}
                                >
                                  🟡 Diajukan Pegawai
                                </span>
                                <div style={{ fontSize: 11, color: "#713f12", marginTop: 3 }}>
                                  Kondisi: <strong>{item.kondisi_laporan || "Baik"}</strong>
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  background: "#ede9fe",
                                  color: "#6d28d9",
                                  border: "1px solid #ddd6fe",
                                }}
                              >
                                🟣 Sedang Dipinjam
                              </span>
                            )}
                          </td>
                          <td>
                            {item.hari_terlambat > 0 ? (
                              <span className="deadline-tag-danger">
                                ⚠️ Terlambat {item.hari_terlambat} Hari
                              </span>
                            ) : item.sisa_hari !== null && item.sisa_hari >= 0 ? (
                              <span className={item.sisa_hari <= 2 ? "deadline-tag-warn" : "deadline-tag-ok"}>
                                Sisa {item.sisa_hari} Hari
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {item.status === "MENUNGGU_PENGEMBALIAN" ? (
                              <button
                                onClick={() => openModalPengembalian(item)}
                                className="d-btn d-btn-sm"
                                style={{
                                  background: "#16a34a",
                                  color: "#fff",
                                  border: "none",
                                  fontWeight: 700,
                                  padding: "7px 12px",
                                  fontSize: 12,
                                  borderRadius: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                                title="Periksa fisik barang dan selesaikan pengembalian"
                              >
                                ✓ Periksa & Submit Selesai
                              </button>
                            ) : (
                              <button
                                onClick={() => openModalPengembalian(item)}
                                className="d-btn d-btn-sm"
                                style={{
                                  background: "#0284c7",
                                  color: "#fff",
                                  border: "none",
                                  fontWeight: 700,
                                  padding: "6px 12px",
                                  fontSize: 12,
                                  borderRadius: 8,
                                }}
                                title="Selesaikan pengembalian aset ini"
                              >
                                🔄 Selesaikan Pengembalian
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div className="d-table-wrapper">
                <table className="d-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>ID</th>
                      <th>Pegawai</th>
                      <th>Aset Dikembalikan</th>
                      <th>Tgl Pinjam</th>
                      <th>Tgl Kembali Real</th>
                      <th>Status Akhir</th>
                      <th>Catatan Pengembalian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRiwayatKembali ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                          <div className="d-loading"><div className="d-spinner" /><span>Memuat riwayat pengembalian...</span></div>
                        </td>
                      </tr>
                    ) : riwayatPengembalian.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                          Belum ada riwayat aset yang selesai dikembalikan.
                        </td>
                      </tr>
                    ) : (
                      riwayatPengembalian.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>#{item.id}</td>
                          <td>
                            <strong>{item.nama_pegawai}</strong>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>NIP: {item.nip}</div>
                          </td>
                          <td>{item.nama_aset}</td>
                          <td style={{ fontSize: 12.5 }}>{formatTanggal(item.tanggal_pinjam)}</td>
                          <td style={{ fontSize: 12.5, fontWeight: 600, color: "#16a34a" }}>
                            {formatTanggal(item.tanggal_kembali)}
                          </td>
                          <td>
                            <span className="badge-pinjam-dikembalikan">
                              ✓ Selesai Kembali
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "#475569" }}>
                            {item.keterangan || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: PROSES & SELESAIKAN PENGEMBALIAN ASET                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {modalKembali && (
        <div className="d-modal-overlay" onClick={() => setModalKembali(null)}>
          <div className="d-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>
                  Konfirmasi & Selesaikan Pengembalian #{modalKembali.id}
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Peminjam: <strong>{modalKembali.nama_pegawai}</strong> (NIP: {modalKembali.nip})
                </span>
              </div>
              <button onClick={() => setModalKembali(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {modalKembali.status === "MENUNGGU_PENGEMBALIAN" && (
              <div
                style={{
                  background: "#fefce8",
                  border: "1px solid #fde047",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 16,
                  fontSize: 12.5,
                  color: "#854d0e",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠️</span>
                  <span>Pengajuan Pengembalian Masuk dari Pegawai</span>
                </div>
                <div>
                  Pegawai telah mengajukan pengembalian pada tanggal:{" "}
                  <strong>{formatTanggal(modalKembali.tanggal_kembali)}</strong>
                </div>
                {modalKembali.keterangan && (
                  <div style={{ marginTop: 4, fontStyle: "italic", color: "#713f12" }}>
                    "Catatan: {modalKembali.keterangan}"
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 12, color: "#a16207" }}>
                  Silakan periksa fisik barang, sesuaikan status kondisi jika perlu, lalu klik <strong>Submit Selesai</strong> di bawah.
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmPengembalian}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Tanggal Pengembalian Real
                </label>
                <input
                  type="date"
                  className="d-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={tglKembaliInput}
                  onChange={(e) => setTglKembaliInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Pemeriksaan Kondisi Barang Saat Kembali:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {modalKembali.detail?.map((d) => (
                    <div key={d.aset_id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                        {d.nama_barang} <span style={{ color: "#64748b", fontWeight: 400 }}>({d.kode_barang})</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Kondisi Fisik:</span>
                        {["Baik", "Rusak Ringan", "Rusak Berat"].map((kond) => (
                          <label key={kond} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                            <input
                              type="radio"
                              name={`kondisi-${d.aset_id}`}
                              checked={kondisiKembaliMap[d.aset_id] === kond}
                              onChange={() => setKondisiKembaliMap({ ...kondisiKembaliMap, [d.aset_id]: kond })}
                            />
                            {kond}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Catatan / Keterangan Petugas BMN
                </label>
                <textarea
                  className="d-input"
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
                  placeholder="Kelengkapan unit, aksesoris, catatan fisik saat diterima kembali..."
                  value={catatanKembali}
                  onChange={(e) => setCatatanKembali(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="d-btn d-btn-secondary" onClick={() => setModalKembali(null)}>
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingKembali}
                  className="d-btn d-btn-primary"
                  style={{ background: "#16a34a", fontWeight: 700 }}
                >
                  {submittingKembali ? "Menyimpan & Menyelesaikan..." : "✓ Konfirmasi & Submit Selesai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: TOLAK PEMINJAMAN                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {modalTolak && (
        <div className="d-modal-overlay" onClick={() => setModalTolak(null)}>
          <div className="d-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "#dc2626" }}>Tolak Permohonan Peminjaman</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px 0" }}>
              Anda akan menolak permohonan peminjaman dari <strong>{modalTolak.nama_pegawai}</strong>. Masukkan alasan penolakan untuk arsip dinas.
            </p>
            <form onSubmit={handleKonfirmasiTolak}>
              <textarea
                className="d-input"
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit" }}
                placeholder="Contoh: Aset sedang disiapkan untuk kalibrasi rutin..."
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                required
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="d-btn d-btn-secondary" onClick={() => setModalTolak(null)}>Batal</button>
                <button type="submit" className="d-btn" style={{ background: "#dc2626", color: "#fff", border: "none" }}>Konfirmasi Tolak</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DETAIL PEMINJAMAN                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {modalDetail && (
        <div className="d-modal-overlay" onClick={() => setModalDetail(null)}>
          <div className="d-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Rincian Peminjaman #{modalDetail.id}</h3>
              <button onClick={() => setModalDetail(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>PEGAWAI</span><strong>{modalDetail.nama_pegawai}</strong></div>
              <div><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>NIP</span>{modalDetail.nip}</div>
              <div><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>TGL PINJAM</span>{formatTanggal(modalDetail.tanggal_pinjam)}</div>
              <div><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>RENCANA KEMBALI</span>{formatTanggal(modalDetail.tanggal_rencana_kembali) || "—"}</div>
              {modalDetail.tanggal_kembali && (
                <div><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>TGL KEMBALI REAL</span><strong style={{ color: "#16a34a" }}>{formatTanggal(modalDetail.tanggal_kembali)}</strong></div>
              )}
              <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#64748b", fontSize: 11, display: "block" }}>STATUS</span><span className={`badge-pinjam-${modalDetail.status?.toLowerCase()}`}>{modalDetail.status}</span></div>
            </div>

            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#334155" }}>Daftar Aset Terkait:</h4>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px", maxHeight: 140, overflowY: "auto", marginBottom: 16 }}>
              {modalDetail.detail?.map((d) => (
                <div key={d.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12.5 }}>
                  <strong>{d.nama_barang}</strong> ({d.kode_barang}) - Kondisi awal: {d.kondisi_saat_pinjam} {d.kondisi_saat_kembali && `| Saat kembali: ${d.kondisi_saat_kembali}`}
                </div>
              ))}
            </div>

            <div style={{ textAlign: "right" }}>
              <button className="d-btn d-btn-secondary" onClick={() => setModalDetail(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: TAMBAH / EDIT ASET                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showModalAset && (
        <div className="d-modal-overlay" onClick={() => setShowModalAset(false)}>
          <div className="d-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>
                {editingId ? "Edit Data Aset Inventaris" : "Tambah Data Aset Baru"}
              </h3>
              <button onClick={() => setShowModalAset(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {formAsetError && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {formAsetError}
              </div>
            )}

            <form onSubmit={handleSubmitAset}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Nama Barang *</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.nama_barang}
                    onChange={(e) => setFormAset({ ...formAset, nama_barang: e.target.value })}
                    placeholder="Contoh: Barometer Digital"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Satuan Kerja</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.nama_satker}
                    onChange={(e) => setFormAset({ ...formAset, nama_satker: e.target.value })}
                    placeholder="Contoh: Stasiun Klimatologi"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Kodefikasi BMN *</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.kode_barang}
                    onChange={(e) => setFormAset({ ...formAset, kode_barang: e.target.value })}
                    placeholder="3.05.01.04.001"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>NUP *</label>
                  <input
                    type="number"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.nup}
                    onChange={(e) => setFormAset({ ...formAset, nup: e.target.value })}
                    placeholder="1"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Merk</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.merk}
                    onChange={(e) => setFormAset({ ...formAset, merk: e.target.value })}
                    placeholder="Merk pabrikan"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Tipe</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.tipe}
                    onChange={(e) => setFormAset({ ...formAset, tipe: e.target.value })}
                    placeholder="Tipe spesifikasi"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Kondisi Fisik</label>
                  <select
                    className="d-select"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.kondisi}
                    onChange={(e) => setFormAset({ ...formAset, kondisi: e.target.value })}
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Status BMN</label>
                  <input
                    type="text"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.status_bmn}
                    onChange={(e) => setFormAset({ ...formAset, status_bmn: e.target.value })}
                    placeholder="Digunakan"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Tanggal Perolehan</label>
                  <input
                    type="date"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.tanggal_perolehan}
                    onChange={(e) => setFormAset({ ...formAset, tanggal_perolehan: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Nilai Perolehan (Rp)</label>
                  <input
                    type="number"
                    className="d-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formAset.nilai_perolehan}
                    onChange={(e) => setFormAset({ ...formAset, nilai_perolehan: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="d-btn d-btn-secondary" onClick={() => setShowModalAset(false)}>
                  Batal
                </button>
                <button type="submit" disabled={savingAset} className="d-btn d-btn-primary">
                  {savingAset ? "Menyimpan..." : "Simpan Aset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
