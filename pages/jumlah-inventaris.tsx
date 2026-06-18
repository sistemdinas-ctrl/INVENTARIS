// pages/jumlah-inventaris.tsx
import Image from "next/image";

export default function JumlahInventaris() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* -------- Sidebar -------- */}
      <aside className="w-64 bg-white shadow-lg hidden lg:block">
        <div className="flex flex-col h-full p-4">
          {/* Logo & App name */}
          <div className="flex items-center mb-8 gap-2">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} />
            <span className="text-xl font-semibold text-[#2563EB]">
              Sistem Inventaris Daerah
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 flex-1">
            {[
              { label: "Dashboard", icon: "🏠" },
              { label: "Data Inventaris", icon: "📦" },
              { label: "Jumlah Inventaris", icon: "📊", active: true },
              { label: "Distribusi Barang", icon: "🗂️" },
              { label: "Riwayat Mutasi", icon: "⏳" },
              { label: "Pengaturan", icon: "⚙️" },
            ].map((item) => (
              <a
                key={item.label}
                href="#"
                className={`
                  flex items-center gap-3 p-3 rounded-xl
                  ${
                    item.active
                      ? "bg-[#2563EB] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* -------- Main Content -------- */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <nav className="text-sm text-gray-600">
              <span>Dashboard</span>
              <span className="mx-1">▸</span>
              <span>Inventaris</span>
              <span className="mx-1">▸</span>
              <span className="font-semibold text-[#2563EB]">
                Jumlah Inventaris
              </span>
            </nav>
            <input
              type="text"
              placeholder="Search …"
              className="ml-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative">
              <span className="text-2xl">🔔</span>
              {/* badge */}
              <span className="absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-[#EF4444]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">John Doe</span>
              <Image src="/avatar.png" alt="User" width={32} height={32} className="rounded-full" />
            </div>
          </div>
        </header>

        <section className="p-6">
          {/* ---- Summary Cards ---- */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Total Jenis Barang",
                value: "124",
                change: "+5%",
                icon: "📚",
                bg: "#2563EB",
              },
              {
                title: "Total Unit Barang",
                value: "3 452",
                change: "+2.1%",
                icon: "🧮",
                bg: "#3B82F6",
              },
              {
                title: "Barang Masuk Bulan Ini",
                value: "214",
                change: "+8.9%",
                icon: "⬆️",
                bg: "#10B981",
              },
              {
                title: "Barang Keluar Bulan Ini",
                value: "187",
                change: "-1.4%",
                icon: "⬇️",
                bg: "#F59E0B",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl bg-white p-5 shadow-sm flex items-center gap-4"
                style={{ borderLeft: `4px solid ${card.bg}` }}
              >
                <div className="text-3xl">{card.icon}</div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.change} dari bulan lalu</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Search & Filter Toolbar ---- */}
          <div className="mt-6 flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl shadow-sm">
            <input
              type="text"
              placeholder="Cari Barang …"
              className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2563EB]"
            />
            <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2563EB]">
              <option>Kategori</option>
            </select>
            <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2563EB]">
              <option>Tahun</option>
            </select>
            <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2563EB]">
              <option>Lokasi</option>
            </select>
            <button className="flex items-center gap-1 rounded-md bg-[#10B981] px-4 py-2 text-sm font-medium text-white hover:bg-[#059669]">
              Import Excel
            </button>
            <button className="flex items-center gap-1 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]">
              Export Excel
            </button>
            <button className="flex items-center gap-1 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]">
              Print PDF
            </button>
          </div>

          {/* ---- Inventory Table ---- */}
          <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full table-auto border-separate border-spacing-0">
              <thead className="bg-[#F8FAFC] text-left">
                <tr className="sticky top-0">
                  {[
                    "No",
                    "Kode Barang",
                    "Nama Barang",
                    "Kategori",
                    "Lokasi",
                    "Total Masuk",
                    "Total Keluar",
                    "Stok Tersedia",
                    "Status",
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Example rows – replace with real data mapping */}
                {[...Array(10)].map((_, i) => {
                  const totalMasuk = 80 + i * 17;
                  const totalKeluar = 24 + i * 11;
                  const stokTersedia = Math.max(totalMasuk - totalKeluar, 0);

                  return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-sm text-gray-700"> {i + 1} </td>
                    <td className="px-4 py-2 text-sm text-gray-700">BK-{1000 + i} </td>
                    <td className="px-4 py-2 text-sm text-gray-700">Barang {i + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">Kategori A</td>
                    <td className="px-4 py-2 text-sm text-gray-700">Lokasi X</td>
                    <td className="px-4 py-2 text-sm text-gray-700"> {totalMasuk} </td>
                    <td className="px-4 py-2 text-sm text-gray-700"> {totalKeluar} </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {stokTersedia} pcs
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`
                          inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${
                            i % 3 === 0
                              ? "bg-[#10B981]/10 text-[#10B981]"
                              : i % 3 === 1
                              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                              : "bg-[#EF4444]/10 text-[#EF4444]"
                          }
                        `}
                      >
                        {i % 3 === 0 ? "Aman" : i % 3 === 1 ? "Menipis" : "Habis"}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">« Prev</button>
            <button className="rounded-md bg-[#2563EB] px-3 py-1 text-sm text-white">1</button>
            <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">2</button>
            <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">Next »</button>
          </div>

          {/* ---- Analytics Section ---- */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Placeholder charts – replace with real chart components (e.g., Recharts, Chart.js) */}
            {[
              { title: "Barang Masuk vs Keluar", bg: "#E0F2FE" },
              { title: "Distribusi per Kategori", bg: "#FEF3C7" },
              { title: "Top 10 Barang Terbanyak", bg: "#FEE2E2" },
            ].map((chart) => (
              <div key={chart.title} className="rounded-xl bg-white p-4 shadow-sm">
                <h4 className="mb-2 text-sm font-medium text-gray-700">{chart.title}</h4>
                <div className="h-48 bg-[#F5F5F5] rounded-md flex items-center justify-center text-gray-400">
                  Chart placeholder
                </div>
              </div>
            ))}
          </div>

          {/* ---- Empty State (if no data) ---- */}
          {/* Uncomment when table is empty */}
          {/* <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <p className="text-lg font-medium text-gray-600">Tidak ada data inventaris</p>
            <p className="text-sm text-gray-500">Silakan tambahkan data inventaris terlebih dahulu.</p>
          </div> */}
        </section>
      </main>
    </div>
  );
}
