"use client";

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

interface GroupedItem {
  kode_barang: string;
  nama_barang: string;
  total_jumlah: number;
  kategori: string;
  terakhir_update: string;
}

type InventoryCountRow = {
  kode_barang?: string | null;
  nama_barang?: string | null;
  jumlah?: number | string | null;
  created_at?: string | null;
};

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (display === value) return;
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, display]);

  return <>{display.toLocaleString("id-ID")}</>;
}

export default function JumlahInventarisPage() {
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("nama");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("inventaris")
        .select("kode_barang,nama_barang,jumlah,created_at")
        .range(start, start + limit - 1);

      if (error) {
        console.error("Error fetching items:", error);
        break;
      }

      if (data) {
        allData = [...allData, ...data];
        if (data.length < limit) hasMore = false;
        else start += limit;
      } else {
        hasMore = false;
      }
    }

    if (allData.length > 0) {
      const groupMap: Record<string, GroupedItem> = {};

      (allData as InventoryCountRow[]).forEach((item) => {
        const key = `${item.kode_barang}_${item.nama_barang}`;
        if (!groupMap[key]) {
          groupMap[key] = {
            kode_barang: item.kode_barang || "-",
            nama_barang: item.nama_barang || "Tanpa Nama",
            total_jumlah: 0,
            kategori: item.kode_barang || "-",
            terakhir_update: item.created_at || "",
          };
        }
        groupMap[key].total_jumlah += Number(item.jumlah) || 1;
        if (item.created_at && item.created_at > groupMap[key].terakhir_update) groupMap[key].terakhir_update = item.created_at;
      });

      setGroupedItems(Object.values(groupMap));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    const result = groupedItems.filter(
      (item) => item.nama_barang.toLowerCase().includes(query) || item.kode_barang.toLowerCase().includes(query)
    );

    result.sort((a, b) => {
      if (sortBy === "jumlah") return b.total_jumlah - a.total_jumlah;
      if (sortBy === "tanggal") return (b.terakhir_update || "").localeCompare(a.terakhir_update || "");
      return a.nama_barang.localeCompare(b.nama_barang);
    });

    return result;
  }, [groupedItems, search, sortBy]);

  const totalUnit = groupedItems.reduce((sum, item) => sum + item.total_jumlah, 0);
  const totalJenis = groupedItems.length;
  const topCategory = [...groupedItems].sort((a, b) => b.total_jumlah - a.total_jumlah)[0]?.kategori || "-";
  const topName = [...groupedItems].sort((a, b) => b.total_jumlah - a.total_jumlah)[0]?.nama_barang || "-";

  const kpis = [
    { title: "Total Jenis Barang", value: totalJenis, icon: "list", accent: "from-[#EDE9FE] to-[#DDD6FE]" },
    { title: "Total Unit", value: totalUnit, icon: "box", accent: "from-[#E0E7FF] to-[#C7D2FE]" },
    { title: "Kategori Terbanyak", value: topCategory, subtitle: topName, icon: "star", accent: "from-[#FEF3C7] to-[#FDE68A]" },
  ];

  const kpiIcons = [
    <svg key="list" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 5h14" />
      <path d="M5 12h14" />
      <path d="M5 19h14" />
      <path d="M8 3v4" />
      <path d="M16 10v4" />
      <path d="M11 17v4" />
    </svg>,
    <svg key="box" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 12v4.5L12 21l8-4.5V12" />
      <path d="M12 12v9" />
    </svg>,
    <svg key="star" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>,
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Jumlah Inventaris</h1>
          <p className="page-description">Rekapitulasi jumlah setiap barang berdasarkan kode dan nama barang.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {kpis.map((kpi, i) => (
          <div key={kpi.title} className="card kpi-card animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="kpi-accent" />
            <div className="kpi-icon" style={{ background: `linear-gradient(135deg, ${kpi.accent.replace("from-", "").split(" ")[0]}, ${kpi.accent.replace("to-", "").split(" ")[0]})` }}>
              {kpiIcons[i]}
            </div>
            <div className="kpi-label">{kpi.title}</div>
            <div className="kpi-value">
              {loading ? (
                <span className="inline-block h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
              ) : typeof kpi.value === "number" ? (
                <AnimatedNumber value={kpi.value} />
              ) : (
                kpi.value
              )}
            </div>
            {"subtitle" in kpi && kpi.subtitle && typeof kpi.value === "string" && (
              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{kpi.subtitle}</div>
            )}
            <div className="kpi-trend">
              <span className="kpi-trend-dot" style={{ background: ["#7C3AED", "#6366F1", "#D97706"][i] }} />
              {kpi.title === "Total Jenis Barang" && "Jumlah jenis barang tercatat"}
              {kpi.title === "Total Unit" && "Total unit aset tercatat"}
              {kpi.title === "Kategori Terbanyak" && "Barang dengan jumlah terbanyak"}
            </div>
          </div>
        ))}
      </section>

      <section className="card card-pad animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="toolbar">
          <div className="relative flex-1 max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Cari nama atau kode barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select max-w-56" aria-label="Urutkan data">
            <option value="nama">Urutkan Nama</option>
            <option value="jumlah">Urutkan Jumlah</option>
            <option value="tanggal">Urutkan Tanggal</option>
          </select>
        </div>
      </section>

      <section className="card table-card animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Kode Barang</th>
                <th>Nama Barang</th>
                <th style={{ width: "14%" }}>Total Unit</th>
                <th style={{ width: "18%" }}>Kategori</th>
                <th style={{ width: "18%" }}>Terakhir Update</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}><div className="empty-state">Memuat data...</div></td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}><div className="empty-state">Belum ada data inventaris</div></td>
                </tr>
              ) : (
                filtered.map((item, i) => (
                  <tr key={`${item.kode_barang}-${item.nama_barang}`} className="animate-fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                    <td className="font-semibold text-[#7C3AED]">{item.kode_barang}</td>
                    <td className="font-semibold text-[var(--color-text-primary)]">{item.nama_barang}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.total_jumlah}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">unit</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(item.total_jumlah / 100 * 100, 100)}%`,
                            background: "linear-gradient(90deg, #a78bfa, #6d28d9)",
                          }}
                        />
                      </div>
                    </td>
                    <td>{item.kategori}</td>
                    <td>{item.terakhir_update ? new Date(item.terakhir_update).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
