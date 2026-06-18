"use client";

import Modal from "@/components/Modal";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

type LogRow = {
  id?: string;
  created_at?: string;
  tanggal_distribusi?: string;
  nibar: string;
  nama_barang: string;
  nama_dari_lokasi: string;
  nama_ke_lokasi: string;
  pic_penerima?: string;
  status?: string;
};

type RawLogRow = {
  id?: string;
  created_at?: string;
  tanggal_distribusi?: string;
  nibar: string;
  dari_lokasi?: string;
  ke_lokasi?: string;
  pic_penerima?: string;
  status?: string;
};
type InventoryNameRow = { nibar: string; nama_barang: string };
type LocationRow = { id_lokasi: string; nama_lokasi: string };

function shortNibar(value?: string) {
  if (!value) return "-";
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

export default function RiwayatPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [filters, setFilters] = useState({ tanggal: "", lokasi: "", barang: "", pic: "" });

  const fetchRiwayat = useCallback(async () => {
    setLoading(true);
    const { data: logData, error: logErr } = await supabase.from("log_distribusi").select("*");
    if (logErr) console.error("Error fetching logs:", logErr);

    const { data: invData } = await supabase.from("inventaris").select("nibar,nama_barang");
    const { data: locData } = await supabase.from("lokasi").select("id_lokasi,nama_lokasi");

    if (logData && invData && locData) {
      const mappedLogs = (logData as RawLogRow[]).map((log) => {
        const item = (invData as InventoryNameRow[]).find((i) => i.nibar === log.nibar);
        const dari = (locData as LocationRow[]).find((l) => l.id_lokasi === log.dari_lokasi);
        const ke = (locData as LocationRow[]).find((l) => l.id_lokasi === log.ke_lokasi);

        return {
          ...log,
          nama_barang: item ? item.nama_barang : "Barang tidak ditemukan",
          nama_dari_lokasi: dari ? dari.nama_lokasi : "-",
          nama_ke_lokasi: ke ? ke.nama_lokasi : "-",
          status: log.status || "Dikirim",
        };
      });

      mappedLogs.sort((a: LogRow, b: LogRow) => {
        if (!a.tanggal_distribusi || !b.tanggal_distribusi) return 0;
        return new Date(b.tanggal_distribusi).getTime() - new Date(a.tanggal_distribusi).getTime();
      });

      setLogs(mappedLogs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const tanggalMatch = !filters.tanggal || log.tanggal_distribusi === filters.tanggal;
      const lokasiMatch =
        !filters.lokasi ||
        log.nama_ke_lokasi.toLowerCase().includes(filters.lokasi.toLowerCase()) ||
        log.nama_dari_lokasi.toLowerCase().includes(filters.lokasi.toLowerCase());
      const barangMatch =
        !filters.barang ||
        log.nama_barang.toLowerCase().includes(filters.barang.toLowerCase()) ||
        log.nibar.toLowerCase().includes(filters.barang.toLowerCase());
      const picMatch = !filters.pic || (log.pic_penerima || "").toLowerCase().includes(filters.pic.toLowerCase());
      return tanggalMatch && lokasiMatch && barangMatch && picMatch;
    });
  }, [logs, filters]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Riwayat Mutasi</h1>
          <p className="page-description">Lihat seluruh riwayat distribusi barang dari kantor pusat ke lokasi tujuan.</p>
        </div>
      </header>

      <section className="card card-pad animate-fade-in">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <input type="date" value={filters.tanggal} onChange={(e) => setFilters({ ...filters, tanggal: e.target.value })} className="input pl-10" />
          </div>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7h10v8H3V7Z" />
              <path d="M13 10h4l4 4v1h-8v-5Z" />
            </svg>
            <input placeholder="Filter lokasi" value={filters.lokasi} onChange={(e) => setFilters({ ...filters, lokasi: e.target.value })} className="input pl-10" />
          </div>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
              <path d="M4 12v4.5L12 21l8-4.5V12" />
            </svg>
            <input placeholder="Nama barang atau NIBAR" value={filters.barang} onChange={(e) => setFilters({ ...filters, barang: e.target.value })} className="input pl-10" />
          </div>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input placeholder="PIC penerima" value={filters.pic} onChange={(e) => setFilters({ ...filters, pic: e.target.value })} className="input pl-10" />
          </div>
        </div>
      </section>

      <section className="card table-card animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Tanggal</th>
                <th style={{ width: "16%" }}>NIBAR</th>
                <th>Nama Barang</th>
                <th style={{ width: "15%" }}>Dari Lokasi</th>
                <th style={{ width: "15%" }}>Tujuan</th>
                <th style={{ width: "14%" }}>PIC</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}><div className="empty-state">Memuat data riwayat...</div></td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}><div className="empty-state">Belum ada riwayat mutasi</div></td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr key={log.id || `${log.created_at}-${log.nibar}`} onClick={() => setSelected(log)} className="cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                    <td>{log.tanggal_distribusi ? new Date(log.tanggal_distribusi).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                    <td title={log.nibar} className="font-semibold text-[#7C3AED]">{shortNibar(log.nibar)}</td>
                    <td className="font-semibold text-[var(--color-text-primary)]">{log.nama_barang}</td>
                    <td>{log.nama_dari_lokasi}</td>
                    <td>{log.nama_ke_lokasi}</td>
                    <td>{log.pic_penerima || "-"}</td>
                    <td>
                      <span className={`badge ${log.status === "Dibatalkan" ? "badge-danger" : log.status === "Diproses" ? "badge-warning" : "badge-success"}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Detail Mutasi">
        {selected && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Data Barang</div>
              <p className="mt-2 font-semibold">{selected.nama_barang}</p>
              <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{selected.nibar}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Data Penerima</div>
              <p className="mt-2 font-semibold">{selected.pic_penerima || "-"}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selected.nama_ke_lokasi}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Data Pengirim</div>
              <p className="mt-2 font-semibold">{selected.nama_dari_lokasi}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Tanggal</div>
              <p className="mt-2 font-semibold">{selected.tanggal_distribusi ? new Date(selected.tanggal_distribusi).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] p-4 md:col-span-2 transition-colors hover:border-[rgba(124,58,237,0.2)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Riwayat Status</div>
              <div className="mt-3 flex items-center gap-3">
                <span className={`badge ${selected.status === "Dibatalkan" ? "badge-danger" : selected.status === "Diproses" ? "badge-warning" : "badge-success"}`}>
                  {selected.status}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">Distribusi tercatat di sistem</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
