"use client";

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Item {
  nibar: string;
  nama_barang: string;
  status?: string;
}

interface Lokasi {
  id_lokasi: string;
  nama_lokasi: string;
}

function shortNibar(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

export default function DistribusiPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [pusatId, setPusatId] = useState("");
  const [targetLokasi, setTargetLokasi] = useState("");
  const [bidang, setBidang] = useState("");
  const [pic, setPic] = useState("");
  const [tanggalDistribusi, setTanggalDistribusi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    const { data: inv } = await supabase.from("inventaris").select("nibar,nama_barang,status").eq("status", "Tersedia di Pusat");
    const { data: loc } = await supabase.from("lokasi").select("id_lokasi,nama_lokasi");

    setItems((inv as Item[]) || []);
    const locations = (loc as Lokasi[]) || [];
    const pusat = locations.find((l) => l.nama_lokasi === "KANTOR PUSAT");
    if (pusat) setPusatId(pusat.id_lokasi);
    setLokasiList(locations.filter((l) => l.nama_lokasi !== "KANTOR PUSAT"));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();
    return items.filter((item) => item.nibar.toLowerCase().includes(query) || item.nama_barang.toLowerCase().includes(query));
  }, [items, search]);

  const selectedItems = items.filter((item) => selected.has(item.nibar));
  const selectedLokasiObj = lokasiList.find((l) => l.id_lokasi === targetLokasi);
  const isDinpora = selectedLokasiObj?.nama_lokasi.toLowerCase().includes("dinpora");
  const valid = selected.size > 0 && tanggalDistribusi && targetLokasi && pic && (!isDinpora || bidang);

  const toggleSelect = (nibar: string) => {
    const next = new Set(selected);
    if (next.has(nibar)) next.delete(nibar);
    else next.add(nibar);
    setSelected(next);
  };

  const handleDistribusi = async () => {
    setMessage("");
    if (!valid) {
      setMessage("Lengkapi barang, tanggal, lokasi tujuan, dan PIC penerima.");
      return;
    }

    const finalPic = isDinpora ? `${pic} (${bidang})` : pic;
    const logs = Array.from(selected).map((nibar) => ({
      nibar,
      dari_lokasi: pusatId || null,
      ke_lokasi: targetLokasi,
      pic_penerima: finalPic,
      tanggal_distribusi: tanggalDistribusi,
      keterangan,
    }));

    const { error: updErr } = await supabase
      .from("inventaris")
      .update({ status: "Didistribusikan", id_lokasi_saat_ini: targetLokasi })
      .in("nibar", Array.from(selected));

    if (updErr) {
      setMessage(`Update error: ${updErr.message}`);
      return;
    }

    const { error: logErr } = await supabase.from("log_distribusi").insert(logs);
    if (logErr) {
      setMessage(`Log error: ${logErr.message}`);
      return;
    }

    setMessage("Distribusi berhasil dilakukan");
    setSelected(new Set());
    setTargetLokasi("");
    setBidang("");
    setPic("");
    setTanggalDistribusi("");
    setKeterangan("");
    fetchData();
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Distribusi Barang</h1>
          <p className="page-description">Distribusikan aset dari kantor pusat ke lokasi tujuan.</p>
        </div>
      </header>

      {message && (
        <div
          className={`card card-pad animate-fade-in flex items-center gap-3 ${
            message.includes("berhasil")
              ? "bg-gradient-success border-success/30 text-emerald-800"
              : "bg-gradient-danger border-danger/30 text-red-800"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            {message.includes("berhasil") ? (
              <path d="M22 11.08V12a10 10 0 1 1-6-9.14" />
            ) : (
              <path d="M12 9v4M12 17h.01" />
            )}
            {message.includes("berhasil") && <path d="M22 4 12 14.01l-3-3" />}
          </svg>
          {message}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card card-pad animate-slide-up">
          <div className="toolbar">
            <div>
              <h2 className="section-title">
                <span className="text-gradient-primary">Barang Tersedia</span>
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selected.size} barang dipilih</p>
            </div>
            <div className="relative max-w-sm">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Cari barang tersedia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="mt-6 table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "64px" }}>Pilih</th>
                  <th style={{ width: "28%" }}>NIBAR</th>
                  <th>Nama Barang</th>
                  <th style={{ width: "18%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4}><div className="empty-state">Belum ada barang tersedia untuk distribusi</div></td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.nibar} className="cursor-pointer" onClick={() => toggleSelect(item.nibar)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            selected.has(item.nibar)
                              ? "bg-[#7C3AED] border-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                              : "border-gray-300 hover:border-[#7C3AED]"
                          }`}
                        >
                          {selected.has(item.nibar) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12 5 5L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td title={item.nibar} className="font-semibold text-[#7C3AED]">{shortNibar(item.nibar)}</td>
                      <td className="font-semibold text-[var(--color-text-primary)]">{item.nama_barang}</td>
                      <td><span className="badge badge-success">{item.status || "Tersedia"}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="section-title">
            <span className="text-gradient-primary">Form Distribusi</span>
          </h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block font-medium text-sm">Tanggal Distribusi</span>
              <input type="date" value={tanggalDistribusi} onChange={(e) => setTanggalDistribusi(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-2 block font-medium text-sm">Lokasi Tujuan</span>
              <select value={targetLokasi} onChange={(e) => { setTargetLokasi(e.target.value); setBidang(""); }} className="select">
                <option value="">Pilih Lokasi Tujuan</option>
                {lokasiList.map((lokasi) => (
                  <option key={lokasi.id_lokasi} value={lokasi.id_lokasi}>{lokasi.nama_lokasi}</option>
                ))}
              </select>
            </label>
            {isDinpora && (
              <label className="block">
                <span className="mb-2 block font-medium text-sm">Bidang</span>
                <select value={bidang} onChange={(e) => setBidang(e.target.value)} className="select">
                  <option value="">Pilih Bidang</option>
                  <option value="Bidang Sekretariat">Bidang Sekretariat</option>
                  <option value="Bidang Olahraga">Bidang Olahraga</option>
                  <option value="Bidang Pemuda">Bidang Pemuda</option>
                  <option value="Bidang Kepramukaan">Bidang Kepramukaan</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-2 block font-medium text-sm">PIC Penerima</span>
              <input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC penerima" className="input" />
            </label>
            <label className="block">
              <span className="mb-2 block font-medium text-sm">Keterangan</span>
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={4} className="textarea" />
            </label>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="font-semibold flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 7h10v8H3V7Z" />
                  <path d="M13 10h4l4 4v1h-8v-5Z" />
                </svg>
                Ringkasan Pilihan
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">{selected.size} barang dipilih</div>
              {selectedItems.length > 0 && (
                <div className="mt-3 flex max-h-28 flex-col gap-2 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <span key={item.nibar} className="badge badge-info w-fit">{item.nama_barang}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleDistribusi}
              disabled={!valid}
              className="button button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              {selected.size > 0 ? (
                <>Distribusikan {selected.size} Barang</>
              ) : (
                "Distribusikan Barang"
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
