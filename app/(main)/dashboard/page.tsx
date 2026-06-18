"use client";

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DashboardData {
  total: number;
  pusat: number;
  terdistribusi: number;
  mutasiBulanIni: number;
}

interface Activity {
  tanggal_distribusi?: string;
  nibar?: string;
  nama_barang?: string;
  lokasi?: string;
  pic_penerima?: string;
}

interface DistributionItem {
  nama_barang: string;
  jumlah: number;
}

interface LocationDistribution {
  id_lokasi: string;
  nama_lokasi: string;
  total: number;
  items: DistributionItem[];
}

type ChartRow = { kategori: string; jumlah: number };
type ActivityLogRow = { tanggal_distribusi?: string; nibar?: string; pic_penerima?: string; ke_lokasi?: string };
type DistributionLogRow = { nibar?: string; ke_lokasi?: string };
type InventoryNameRow = { nibar?: string; nama_barang?: string };
type LocationRow = { id_lokasi?: string; nama_lokasi?: string };

const kpiIcons = [
  <svg key="total" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>,
  <svg key="pusat" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
    <path d="M4 12v4.5L12 21l8-4.5V12" />
  </svg>,
  <svg key="dist" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h10v8H3V7Z" />
    <path d="M13 10h4l4 4v1h-8v-5Z" />
  </svg>,
  <svg key="mutasi" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
    <path d="M4 4v5h5" />
  </svg>,
];

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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ total: 0, pusat: 0, terdistribusi: 0, mutasiBulanIni: 0 });
  const [locationChartData, setLocationChartData] = useState<ChartRow[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locationDistributions, setLocationDistributions] = useState<LocationDistribution[]>([]);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      let pusatRes, terdistribusiRes, mutasiRes;
      try {
        [pusatRes, terdistribusiRes, mutasiRes] = await Promise.all([
          supabase.from("inventaris").select("nibar", { count: "exact", head: true }).eq("status", "Tersedia di Pusat"),
          supabase.from("inventaris").select("nibar", { count: "exact", head: true }).eq("status", "Didistribusikan"),
          supabase.from("log_distribusi").select("nibar", { count: "exact", head: true }).gte("tanggal_distribusi", startOfMonth),
        ]);
      } catch { /* ignore count errors */ }

      let allInvData: any[] = [];
      let start = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        try {
          const { data, error } = await supabase.from("inventaris").select("nibar,nama_barang,jumlah").range(start, start + limit - 1);
          if (error) break;
          if (data) {
            allInvData = [...allInvData, ...data];
            if (data.length < limit) hasMore = false;
            else start += limit;
          } else hasMore = false;
        } catch { break; }
      }

      const totalUnit = allInvData.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0) || 0;

      setData({
        total: totalUnit,
        pusat: pusatRes?.count || 0,
        terdistribusi: terdistribusiRes?.count || 0,
        mutasiBulanIni: mutasiRes?.count || 0,
      });

      const { data: logs } = await supabase
        .from("log_distribusi")
        .select("tanggal_distribusi,nibar,pic_penerima,ke_lokasi")
        .order("tanggal_distribusi", { ascending: false })
        .limit(5);
      const invData = allInvData;
      const { data: locData } = await supabase.from("lokasi").select("id_lokasi,nama_lokasi");

      if (logs) {
        setActivities(
          (logs as ActivityLogRow[]).map((log) => ({
            ...log,
            nama_barang: (invData as InventoryNameRow[] | null)?.find((item) => item.nibar === log.nibar)?.nama_barang || log.nibar,
            lokasi: (locData as LocationRow[] | null)?.find((loc) => loc.id_lokasi === log.ke_lokasi)?.nama_lokasi || "-",
          }))
        );
      }

      const { data: distributionLogs } = await supabase.from("log_distribusi").select("nibar,ke_lokasi");
      const { data: allLocations } = await supabase.from("lokasi").select("id_lokasi,nama_lokasi");
      if (distributionLogs && invData && locData && allLocations) {
        const inventoryNames = new Map(
          (invData as InventoryNameRow[]).map((item) => [item.nibar, item.nama_barang || item.nibar || "Tanpa Nama"])
        );
        const groupedByLocation: Record<string, Record<string, number>> = {};

        (distributionLogs as DistributionLogRow[]).forEach((log) => {
          if (!log.ke_lokasi) return;
          const namaBarang = inventoryNames.get(log.nibar) || log.nibar || "Tanpa Nama";
          groupedByLocation[log.ke_lokasi] = groupedByLocation[log.ke_lokasi] || {};
          groupedByLocation[log.ke_lokasi][namaBarang] = (groupedByLocation[log.ke_lokasi][namaBarang] || 0) + 1;
        });

        const distributions = (allLocations as LocationRow[])
          .filter((location) => location.nama_lokasi !== "KANTOR PUSAT" && location.id_lokasi)
          .map((location) => {
            const id_lokasi = location.id_lokasi!;
            const itemMap = groupedByLocation[id_lokasi] || {};
            const items = Object.entries(itemMap)
              .map(([nama_barang, jumlah]) => ({ nama_barang, jumlah }))
              .sort((a, b) => b.jumlah - a.jumlah || a.nama_barang.localeCompare(b.nama_barang));

            return {
              id_lokasi,
              nama_lokasi: location.nama_lokasi || "Tanpa Lokasi",
              total: items.reduce((sum, item) => sum + item.jumlah, 0),
              items,
            };
          })
          .sort((a, b) => b.total - a.total || a.nama_lokasi.localeCompare(b.nama_lokasi));

        setLocationDistributions(distributions);

        const locChartData = distributions
          .slice()
          .sort((a, b) => b.total - a.total)
          .map((loc) => ({ kategori: loc.nama_lokasi, jumlah: loc.total }));
        setLocationChartData(locChartData);
      }
      setLoading(false);
    }

    fetchStats();
  }, []);

  const kpis = useMemo(
    () => [
      { title: "Total Aset", value: data.total, trend: "Total unit aset" },
      { title: "Barang Kantor Pusat", value: data.pusat, trend: "Siap didistribusikan" },
      { title: "Barang Terdistribusi", value: data.terdistribusi, trend: "Berada di lokasi tujuan" },
      { title: "Mutasi Bulan Ini", value: data.mutasiBulanIni, trend: "Aktivitas distribusi terbaru" },
    ],
    [data]
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard Inventaris</h1>
          <p className="page-description">Ringkasan kondisi aset, stok kantor pusat, dan aktivitas distribusi terbaru.</p>
        </div>
      </header>

      <section className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={kpi.title} className="card kpi-card animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="kpi-accent" />
            <div className="kpi-icon">{kpiIcons[i]}</div>
            <div className="kpi-label">{kpi.title}</div>
            <div className="kpi-value">
              {loading ? (
                <span className="inline-block h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
              ) : (
                <AnimatedNumber value={kpi.value} />
              )}
            </div>
            <div className="kpi-trend">
              <span className="kpi-trend-dot" />
              {kpi.trend}
            </div>
          </div>
        ))}
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div
          className="overflow-hidden rounded-3xl p-8 text-white"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 12px 40px rgba(124,58,237,0.45)",
            transform: "perspective(600px) rotateX(2deg)",
            transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "perspective(600px) rotateX(0deg) translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(124,58,237,0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "perspective(600px) rotateX(2deg)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,58,237,0.45)";
          }}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 7h10v8H3V7Z" /><path d="M13 10h4l4 4v1h-8v-5Z" />
                    <path d="M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">Lakukan distribusi hari ini</p>
                  <h3 className="text-xl font-bold">Distribusi Barang</h3>
                </div>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold">{loading ? "-" : <AnimatedNumber value={data.pusat} />}</span>
                <span className="text-sm text-white/70">barang siap distribusi</span>
              </div>
            </div>
            <a href="/distribusi" className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]">
              Mulai Distribusi
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card card-pad animate-slide-up">
          <h2 className="section-title"><span className="text-gradient-primary">Distribusi per Lokasi</span></h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Jumlah aset yang sudah didistribusikan ke setiap lokasi</p>
          <div className="mt-6" style={{ height: 320, minHeight: 320 }}>
            {locationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} layout="vertical">
                  <CartesianGrid stroke="#f3f0ff" horizontal={false} strokeDasharray="4 4" />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="kategori" type="category" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ border: "1px solid rgba(167,139,250,0.25)", borderRadius: 16, boxShadow: "0 8px 24px rgba(124,58,237,0.12)", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }} cursor={{ fill: "rgba(167,139,250,0.08)" }} />
                  <Bar dataKey="jumlah" fill="url(#barGradient)" radius={[0, 8, 8, 0]} maxBarSize={32} />
                  <defs><linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-[var(--color-text-secondary)]">
                {loading ? "Memuat grafik..." : "Belum ada data distribusi ke lokasi"}
              </div>
            )}
          </div>
        </div>

        <div className="card card-pad animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="section-title"><span className="text-gradient-primary">Aktivitas Terbaru</span></h2>
          <div className="mt-6 flex flex-col gap-3">
            {activities.length === 0 ? (
              <div className="empty-state">{loading ? "Memuat aktivitas..." : "Belum ada riwayat mutasi"}</div>
            ) : (
              activities.map((activity, index) => (
                <div key={`${activity.nibar}-${index}`} className="animate-fade-in rounded-2xl border border-[rgba(229,231,235,0.6)] bg-white/80 p-4 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(124,58,237,0.1)]" style={{ animationDelay: `${index * 0.06}s` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{activity.nama_barang}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Distribusi ke {activity.lokasi}</p>
                    </div>
                    <span className="badge badge-info shrink-0">
                      {activity.tanggal_distribusi ? new Date(activity.tanggal_distribusi).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-text-secondary)]">PIC: {activity.pic_penerima || "-"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="card card-pad animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="section-title"><span className="text-gradient-primary">Lokasi Distribusi Inventaris</span></h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Klik nama lokasi untuk melihat barang yang sudah didistribusikan</p>
          </div>
          <span className="badge badge-info w-fit">{locationDistributions.length} lokasi</span>
        </div>

        {locationDistributions.length === 0 ? (
          <div className="empty-state mt-6">{loading ? "Memuat lokasi distribusi..." : "Belum ada distribusi dilakukan"}</div>
        ) : (
          <div className="lokasi-manual-grid mt-6">
            {(() => {
              const colCount = 4;
              const columns: LocationDistribution[][] = Array.from({ length: colCount }, () => []);
              locationDistributions.forEach((loc, idx) => { columns[idx % colCount].push(loc); });
              return columns.map((colItems, colIdx) => (
                <div key={colIdx} className="lokasi-column">
                  {colItems.map((location, locIdx) => {
                    const isActive = expandedLocation === location.id_lokasi;
                    return (
                      <div key={location.id_lokasi} className={`lokasi-card animate-fade-in ${isActive ? "ring-2 ring-[#7C3AED]/30 border-[#7C3AED]/40" : ""}`} style={{ animationDelay: `${colIdx * 0.04 + locIdx * 0.03}s` }}>
                        <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setExpandedLocation(isActive ? null : location.id_lokasi)}>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--color-text-primary)]">{location.nama_lokasi}</p>
                            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{location.items.length} jenis barang</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="badge badge-success">{location.total} unit</span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-semibold text-[#7C3AED] transition-transform duration-250" style={{ transform: isActive ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </span>
                          </div>
                        </button>
                        {isActive && (
                          <div className="border-t border-[var(--color-border)] animate-fade-in">
                            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2 text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider bg-gray-50/80 border-b border-[var(--color-border)]">
                              <span>nama barang</span><span>jumlah barang</span>
                            </div>
                            {location.items.length === 0 ? (
                              <div className="px-5 py-6 text-sm text-[var(--color-text-secondary)] text-center">Belum ada barang terdistribusi</div>
                            ) : (
                              location.items.map((item) => (
                                <div key={item.nama_barang} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 text-sm items-center border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[rgba(124,58,237,0.02)]">
                                  <span className="text-[var(--color-text-primary)]">{item.nama_barang}</span>
                                  <span className="whitespace-nowrap rounded-md bg-[rgba(124,58,237,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[#7C3AED]">{item.jumlah} unit</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
