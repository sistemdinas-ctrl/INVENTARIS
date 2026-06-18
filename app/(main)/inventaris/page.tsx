"use client";

import Modal from "@/components/Modal";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

interface Item {
  nibar: string;
  kode_barang: string;
  nama_barang: string;
  spesifikasi: string;
  merek_tipe: string;
  nomor_polisi: string;
  jumlah: number;
  satuan: string;
  harga_satuan_perolehan: number;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  keterangan: string;
  status: string;
  id_lokasi_saat_ini: string | null;
}

type LocationIdRow = { id_lokasi?: string | null };

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function shortNibar(value?: string) {
  if (!value) return "-";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatExportDate(value?: string) {
  if (!value) return "";
  return value;
}

function exportInventarisToExcel(data: Item[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      nibar: item.nibar,
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      spesifikasi: item.spesifikasi || "",
      merek_tipe: item.merek_tipe || "",
      nomor_polisi: item.nomor_polisi || "",
      jumlah: item.jumlah || 1,
      satuan: item.satuan || "unit",
      harga_satuan_perolehan: item.harga_satuan_perolehan || 0,
      nilai_perolehan: item.nilai_perolehan || 0,
      tanggal_perolehan: formatExportDate(item.tanggal_perolehan),
      keterangan: item.keterangan || "",
      status: item.status || "",
      id_lokasi_saat_ini: item.id_lokasi_saat_ini || "",
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Inventaris");
  XLSX.writeFile(workbook, `data-inventaris-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function InventarisPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Item>>({ jumlah: 1, satuan: "unit" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let allData: Item[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("inventaris")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, start + limit - 1);

      if (error) {
        console.error("Error fetching items:", error);
        break;
      }

      if (data) {
        allData = [...allData, ...(data as Item[])];
        if (data.length < limit) {
          hasMore = false;
        } else {
          start += limit;
        }
      } else {
        hasMore = false;
      }
    }
    setItems(allData);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchItems);
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.nibar?.toLowerCase().includes(query) ||
        item.nama_barang?.toLowerCase().includes(query) ||
        item.kode_barang?.toLowerCase().includes(query) ||
        item.merek_tipe?.toLowerCase().includes(query)
    );
  }, [items, search]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const { error } = await supabase.from("inventaris").update(form).eq("nibar", form.nibar);
      if (error) {
        alert(`Error update: ${error.message}`);
        return;
      }
    } else {
      const { data: loc } = await supabase.from("lokasi").select("id_lokasi").eq("nama_lokasi", "KANTOR PUSAT").single();
      const newItem = {
        ...form,
        status: "Tersedia di Pusat",
        id_lokasi_saat_ini: (loc as LocationIdRow | null)?.id_lokasi,
      };
      const { error } = await supabase.from("inventaris").insert([newItem]);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
    }

    setShowModal(false);
    setForm({ jumlah: 1, satuan: "unit" });
    setIsEditing(false);
    fetchItems();
  };

  const handleEdit = (item: Item) => {
    setForm(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (nibar: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus barang ini?")) return;
    const { error } = await supabase.from("inventaris").delete().eq("nibar", nibar);
    if (error) alert(`Error hapus: ${error.message}`);
    else fetchItems();
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      alert("Tidak ada data inventaris untuk diekspor.");
      return;
    }
    exportInventarisToExcel(filtered);
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Data Inventaris</h1>
          <p className="page-description">Kelola seluruh data aset dan inventaris.</p>
        </div>
        <button
          onClick={() => {
            setForm({ jumlah: 1, satuan: "unit" });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="button button-primary"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 8v8M8 12h8" />
          </svg>
          Tambah Barang
        </button>
      </header>

      <section className="card card-pad animate-fade-in">
        <div className="toolbar">
          <div className="toolbar-left flex-1">
            <div className="relative flex-1 max-w-xl">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Cari NIBAR, kode barang, nama barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select className="select w-full max-w-52" aria-label="Filter status">
              <option>Semua Status</option>
              <option>Tersedia di Pusat</option>
              <option>Didistribusikan</option>
            </select>
            <span className="pagination-info">{filtered.length} data</span>
          </div>
          <div className="toolbar-right">
            <button className="button button-secondary" type="button" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3v13M8 12l4 4 4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>
      </section>

      <section className="card table-card animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Kode Barang</th>
                <th style={{ width: "20%" }}>Nama Barang</th>
                <th style={{ width: "16%" }}>Merk/Tipe</th>
                <th style={{ width: "8%" }}>Jumlah</th>
                <th style={{ width: "13%" }}>Harga</th>
                <th style={{ width: "12%" }}>Tanggal</th>
                <th style={{ width: "10%" }}>Status</th>
                <th style={{ width: "8%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">Memuat data inventaris...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">Belum ada data inventaris</p>
                        <button className="button button-primary mt-4" type="button" onClick={() => setShowModal(true)}>
                          Tambah Barang
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, i) => (
                  <tr key={item.nibar} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td>
                      <button className="font-semibold text-[#7C3AED] hover:text-[#6D28D9]" title={item.nibar} onClick={() => setDetail(item)} type="button">
                        {shortNibar(item.nibar)}
                      </button>
                      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.kode_barang}</div>
                    </td>
                    <td className="font-semibold text-[var(--color-text-primary)]">{item.nama_barang}</td>
                    <td>{item.merek_tipe || "-"}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{item.jumlah || 1}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{item.satuan || "unit"}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((item.jumlah || 1) / 50 * 100, 100)}%`,
                            background: "linear-gradient(90deg, #a78bfa, #6d28d9)",
                          }}
                        />
                      </div>
                    </td>
                    <td>{item.harga_satuan_perolehan ? currency.format(item.harga_satuan_perolehan) : "-"}</td>
                    <td>{item.tanggal_perolehan || "-"}</td>
                    <td>
                      <span className={`badge ${item.status === "Tersedia di Pusat" ? "badge-info" : "badge-warning"}`}>{item.status || "-"}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleEdit(item)} className="button button-secondary min-h-9 px-3 text-xs" type="button">Edit</button>
                        <button onClick={() => handleDelete(item.nibar)} className="button button-danger min-h-9 px-3 text-xs" type="button">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card-pad animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="pagination-info">
            Menampilkan {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} dari {filtered.length} data
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="button button-secondary min-h-9 px-4"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
              Sebelumnya
            </button>
            <span className="pagination-info">
              Halaman {page} dari {totalPages}
            </span>
            <button
              className="button button-secondary min-h-9 px-4"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Berikutnya
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/35 backdrop-blur-sm">
          <button className="flex-1" aria-label="Tutup detail" onClick={() => setDetail(null)} type="button" />
          <aside className="h-full w-full max-w-[500px] overflow-y-auto bg-white shadow-2xl animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-white/95 backdrop-blur-sm px-6 py-4">
              <h2 className="section-title">Detail Barang</h2>
              <button className="button button-secondary min-h-9 px-3" onClick={() => setDetail(null)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-5 p-6">
              {[
                ["NIBAR", detail.nibar],
                ["Kode Barang", detail.kode_barang],
                ["Nama Barang", detail.nama_barang],
                ["Merk", detail.merek_tipe],
                ["Spesifikasi", detail.spesifikasi],
                ["Harga", detail.harga_satuan_perolehan ? currency.format(detail.harga_satuan_perolehan) : "-"],
                ["Tanggal Perolehan", detail.tanggal_perolehan],
                ["Lokasi", detail.id_lokasi_saat_ini || "-"],
                ["Status", detail.status],
                ["Riwayat Distribusi", detail.keterangan || "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</div>
                  <div className="mt-2 break-words font-medium">{value || "-"}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Barang" : "Tambah Barang Baru"}>
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block font-medium">NIBAR *</span>
            <input required disabled={isEditing} value={form.nibar || ""} onChange={(e) => setForm({ ...form, nibar: e.target.value })} className="input disabled:bg-gray-50 disabled:text-gray-400" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Kode Barang *</span>
            <input required value={form.kode_barang || ""} onChange={(e) => setForm({ ...form, kode_barang: e.target.value })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Nama Barang *</span>
            <input required value={form.nama_barang || ""} onChange={(e) => setForm({ ...form, nama_barang: e.target.value })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Merek / Tipe</span>
            <input value={form.merek_tipe || ""} onChange={(e) => setForm({ ...form, merek_tipe: e.target.value })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Nomor Polisi</span>
            <input value={form.nomor_polisi || ""} onChange={(e) => setForm({ ...form, nomor_polisi: e.target.value })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Jumlah *</span>
            <input type="number" required min="1" value={form.jumlah || ""} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Satuan *</span>
            <input required value={form.satuan || ""} onChange={(e) => setForm({ ...form, satuan: e.target.value })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Harga Satuan</span>
            <input type="number" value={form.harga_satuan_perolehan || ""} onChange={(e) => setForm({ ...form, harga_satuan_perolehan: Number(e.target.value) })} className="input" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Tanggal Perolehan *</span>
            <input type="date" required value={form.tanggal_perolehan || ""} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} className="input" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block font-medium">Spesifikasi</span>
            <textarea rows={3} value={form.spesifikasi || ""} onChange={(e) => setForm({ ...form, spesifikasi: e.target.value })} className="textarea" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block font-medium">Keterangan</span>
            <textarea rows={3} value={form.keterangan || ""} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="textarea" />
          </label>
          <div className="flex justify-end gap-3 md:col-span-2">
            <button type="button" onClick={() => setShowModal(false)} className="button button-secondary">Batal</button>
            <button type="submit" className="button button-primary">{isEditing ? "Simpan Perubahan" : "Simpan Barang"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
