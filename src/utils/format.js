export const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatTanggal = (value) =>
  value ? new Date(value).toLocaleDateString("id-ID") : "-";

export const slugBadge = (value) =>
  String(value || "default").toLowerCase().replace(/\s+/g, "-");
