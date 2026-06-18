"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AssetRow = {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  satuan: string;
  status: string;
  id_lokasi_saat_ini: string | null;
  lokasi_nama?: string;
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [statsData, setStatsData] = useState({ unit: 0, lokasi: 0, kantor: 0, terdistribusi: 0, mutasi: 0 });

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [
        { data: allInv },
        { count: totalCount },
        { count: terdistribusiCount },
        { count: mutasiCount },
        { data: lokasiRaw },
      ] = await Promise.all([
        supabase.from("inventaris").select("kode_barang,nama_barang,jumlah,satuan,status,id_lokasi_saat_ini").order("created_at", { ascending: false }).limit(10),
        supabase.from("inventaris").select("*", { count: "exact", head: true }),
        supabase.from("inventaris").select("*", { count: "exact", head: true }).eq("status", "Didistribusikan"),
        supabase.from("log_distribusi").select("*", { count: "exact", head: true }).gte("tanggal_distribusi", startOfMonth),
        supabase.from("lokasi").select("id_lokasi,nama_lokasi"),
      ]);

      const lokasiMap = new Map((lokasiRaw || []).map((l: any) => [l.id_lokasi, l.nama_lokasi]));
      const gorCount = (lokasiRaw || []).filter((l: any) => {
        const nm = l.nama_lokasi?.toLowerCase() || "";
        return nm.includes("gor") || nm.includes("stadion") || nm.includes("sport center");
      }).length;
      const kantorCount = (lokasiRaw || []).filter((l: any) => l.nama_lokasi?.toLowerCase().includes("kantor pusat")).length;

      if (allInv) {
        setAssetRows(
          allInv.slice(0, 6).map((item: any) => ({
            kode_barang: item.kode_barang || "-",
            nama_barang: item.nama_barang || "Tanpa Nama",
            jumlah: item.jumlah || 1,
            satuan: item.satuan || "unit",
            status: item.status || "Tersedia",
            id_lokasi_saat_ini: item.id_lokasi_saat_ini,
            lokasi_nama: lokasiMap.get(item.id_lokasi_saat_ini) || "Kantor Pusat",
          }))
        );

        setStatsData({
          unit: totalCount || 0,
          lokasi: gorCount || lokasiRaw?.length || 0,
          kantor: kantorCount || 0,
          terdistribusi: terdistribusiCount || 0,
          mutasi: mutasiCount || 0,
        });
      }
      setLoadingAssets(false);
    }
    fetchData();
  }, []);

  const stats = [
    { n: statsData.unit.toLocaleString("id-ID"), l: "Unit Aset" },
    { n: String(statsData.lokasi), l: "Lokasi GOR" },
    { n: String(statsData.kantor), l: "Kantor" },
    { n: statsData.terdistribusi.toLocaleString("id-ID"), l: "Terdistribusi" },
    { n: String(statsData.mutasi), l: "Mutasi Bulan Ini" },
  ];

  const features = [
    { icon:"layers", title:"Data Terpusat", desc:"Seluruh aset dan inventaris tercatat dalam satu sistem yang mudah diakses kapan saja." },
    { icon:"clock", title:"Real-time", desc:"Status distribusi dan mutasi aset diperbarui secara langsung di semua lokasi." },
    { icon:"shield", title:"Terverifikasi", desc:"Data diverifikasi berjenjang untuk memastikan akurasi dan validitas setiap pencatatan." },
    { icon:"grid", title:"Multi Lokasi", desc:"Pantau 12 lokasi GOR dan fasilitas olahraga sekaligus dari satu dashboard." },
  ];

  const categories = [
    "Peralatan Olahraga","Kendaraan Dinas","Furniture & Mebel",
    "Elektronik","Alat Kebersihan","Peralatan Medis",
    "Bangunan & Gedung","Alat Tulis Kantor","Perlengkapan Lapangan",
    "Sarana Air Bersih","Peralatan Dapur","Lain-lain",
  ];



  const Icon = ({ name }: { name: string }) => {
    const icons: Record<string, React.ReactNode> = {
      layers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
      clock:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      grid:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    };
    return <>{icons[name]}</>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { font-family:'Inter',sans-serif; color:#111; background:#fff; -webkit-font-smoothing:antialiased; }
        a { text-decoration:none; color:inherit; }
        :root {
          --ink:#0f0a1e; --ink2:#3d3557; --sub:#6b6585; --line:#e8e4f0;
          --bg:#f7f5fb; --pu:#5b2fc9; --pu2:#7c3aed; --pu3:#a78bfa; --pud:#ede9fe;
        }

        nav {
          position:sticky; top:0; z-index:100;
          background:rgba(255,255,255,0.93); backdrop-filter:blur(14px);
          border-bottom:1px solid var(--line);
          padding:0 40px; height:60px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .nb { display:flex; align-items:center; gap:10px; }
        .ni {
          width:32px; height:32px; border-radius:8px; background:var(--ink);
          display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0;
        }
        .nn { font-size:15px; font-weight:600; color:var(--ink); }
        .nt { font-size:10px; color:var(--sub); letter-spacing:.06em; }
        .nl { display:flex; align-items:center; gap:28px; }
        .nl a { font-size:13px; color:var(--ink2); transition:color .15s; }
        .nl a:hover { color:var(--pu); }
        .nc { display:flex; gap:10px; align-items:center; }
        .bto {
          font-size:13px; font-weight:500; color:var(--pu);
          border:1px solid var(--pu); border-radius:8px; padding:7px 16px;
          background:transparent; cursor:pointer; font-family:'Inter',sans-serif;
          transition:background .15s;
        }
        .bto:hover { background:var(--pud); }
        .bts {
          font-size:13px; font-weight:500; color:white;
          border:none; border-radius:8px; padding:8px 18px;
          background:var(--pu); cursor:pointer; font-family:'Inter',sans-serif;
          transition:background .15s, transform .15s;
        }
        .bts:hover { background:var(--pu2); transform:translateY(-1px); }
        .hbtn { display:none; background:none; border:none; cursor:pointer; color:var(--ink); }
        .mmenu {
          display:none; position:absolute; top:60px; left:0; right:0;
          background:white; border-bottom:1px solid var(--line);
          padding:16px 24px; flex-direction:column; gap:14px;
        }
        .mmenu.open { display:flex; }
        .mmenu a { font-size:14px; color:var(--ink2); }

        .hero {
          background:linear-gradient(155deg,#0f0a1e 0%,#1e1248 40%,#2e1a8a 72%,#4c27c4 100%);
          padding:96px 40px 88px; text-align:center; position:relative; overflow:hidden;
        }
        .hero::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:radial-gradient(ellipse 65% 55% at 50% 38%,rgba(139,92,246,.22) 0%,transparent 70%);
        }
        .hero::after {
          content:''; position:absolute; inset:0; pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
          background-size:48px 48px;
        }
        .hi { position:relative; z-index:2; max-width:660px; margin:0 auto; }
        .hew {
          display:inline-flex; align-items:center; gap:7px;
          background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
          border-radius:20px; padding:5px 14px;
          font-size:12px; color:rgba(255,255,255,.7); letter-spacing:.04em; margin-bottom:24px;
        }
        .hew-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:bl 2s ease-in-out infinite; }
        @keyframes bl { 0%,100%{opacity:1} 50%{opacity:.3} }
        .hero h1 {
          font-size:clamp(30px,4.5vw,50px); font-weight:700; color:white;
          line-height:1.15; letter-spacing:-.5px; margin-bottom:18px;
        }
        .hero h1 em { font-style:normal; color:var(--pu3); }
        .hero p { font-size:15px; color:rgba(255,255,255,.58); line-height:1.75; max-width:460px; margin:0 auto 36px; }
        .hact { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .hbm {
          background:white; color:var(--ink); border:none; border-radius:10px;
          padding:12px 28px; font-size:14px; font-weight:600;
          font-family:'Inter',sans-serif; cursor:pointer;
          box-shadow:0 4px 20px rgba(0,0,0,.2); transition:transform .15s,box-shadow .15s;
        }
        .hbm:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.25); }
        .hbg {
          background:rgba(255,255,255,.08); color:white;
          border:1px solid rgba(255,255,255,.15); border-radius:10px;
          padding:12px 28px; font-size:14px; font-weight:500;
          font-family:'Inter',sans-serif; cursor:pointer; transition:background .15s;
        }
        .hbg:hover { background:rgba(255,255,255,.14); }

        .sb { background:white; border-bottom:1px solid var(--line); display:flex; justify-content:center; }
        .si { max-width:980px; width:100%; display:grid; grid-template-columns:repeat(5,1fr); }
        .sc { padding:28px 20px; text-align:center; border-right:1px solid var(--line); }
        .sc:last-child { border-right:none; }
        .sn { font-size:28px; font-weight:700; color:var(--ink); letter-spacing:-.5px; }
        .sl { font-size:12px; color:var(--sub); margin-top:3px; }

        .sec { padding:72px 40px; }
        .sec-in { max-width:980px; margin:0 auto; }
        .ey { font-size:11px; font-weight:600; color:var(--pu); letter-spacing:.1em; text-transform:uppercase; margin-bottom:10px; }
        .st { font-size:clamp(20px,2.8vw,28px); font-weight:700; color:var(--ink); letter-spacing:-.3px; margin-bottom:10px; }
        .ss { font-size:14px; color:var(--sub); line-height:1.7; max-width:500px; }
        .sh { margin-bottom:44px; }
        .shr { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:40px; }
        .sa { font-size:13px; font-weight:500; color:var(--pu); display:flex; align-items:center; gap:4px; }
        .sa:hover { opacity:.75; }

        .fg { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:18px; }
        .fc {
          background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:24px;
          transition:box-shadow .2s,transform .2s;
        }
        .fc:hover { box-shadow:0 8px 32px rgba(91,47,201,.1); transform:translateY(-3px); }
        .fic {
          width:42px; height:42px; border-radius:10px;
          background:var(--pud); color:var(--pu);
          display:flex; align-items:center; justify-content:center; margin-bottom:14px;
        }
        .ft { font-size:14px; font-weight:600; color:var(--ink); margin-bottom:6px; }
        .fd { font-size:13px; color:var(--sub); line-height:1.6; }

        .cats { background:var(--bg); }
        .cg { display:flex; flex-wrap:wrap; gap:9px; }
        .cp {
          background:white; border:1px solid var(--line); border-radius:8px;
          padding:8px 15px; font-size:13px; color:var(--ink2); cursor:pointer; transition:all .15s;
        }
        .cp:hover { background:var(--pud); border-color:var(--pu3); color:var(--pu); }

        .tc { background:white; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
        table { width:100%; border-collapse:collapse; }
        thead th {
          background:var(--bg); padding:11px 18px;
          font-size:11px; font-weight:600; color:var(--sub);
          letter-spacing:.07em; text-transform:uppercase;
          text-align:left; border-bottom:1px solid var(--line);
        }
        tbody tr { border-bottom:1px solid var(--line); transition:background .12s; }
        tbody tr:last-child { border-bottom:none; }
        tbody tr:hover { background:var(--bg); }
        tbody td { padding:13px 18px; font-size:13px; color:var(--ink2); }
        .tdn { font-weight:500; color:var(--ink); }
        .badge {
          display:inline-flex; align-items:center; gap:5px;
          border-radius:6px; padding:3px 9px; font-size:11px; font-weight:500;
        }
        .bg { background:#dcfce7; color:#15803d; }
        .bp { background:var(--pud); color:var(--pu); }

        .cta {
          background:var(--ink); padding:72px 40px; text-align:center;
          position:relative; overflow:hidden;
        }
        .cta::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(circle 300px at 50% 50%,rgba(91,47,201,.28) 0%,transparent 70%);
          pointer-events:none;
        }
        .ctai { position:relative; z-index:2; max-width:480px; margin:0 auto; }
        .ctat { font-size:26px; font-weight:700; color:white; letter-spacing:-.3px; margin-bottom:12px; }
        .ctas { font-size:14px; color:rgba(255,255,255,.5); line-height:1.7; margin-bottom:30px; }
        .ctab {
          background:white; color:var(--ink); border:none; border-radius:10px;
          padding:12px 30px; font-size:14px; font-weight:600;
          font-family:'Inter',sans-serif; cursor:pointer;
          box-shadow:0 4px 20px rgba(0,0,0,.25); transition:transform .15s,box-shadow .15s;
          display:inline-flex; align-items:center; gap:8px;
        }
        .ctab:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.3); }

        footer {
          background:#0a0618; border-top:1px solid rgba(255,255,255,.06);
          padding:48px 40px 28px; font-size:12px; color:rgba(255,255,255,.4);
        }
        .fi { max-width:980px; margin:0 auto; display:grid; grid-template-columns:1fr auto; gap:40px; align-items:start; }
        .fbn { font-size:14px; font-weight:600; color:white; margin-bottom:8px; }
        .fbd { font-size:12px; line-height:1.75; max-width:300px; }
        .fl { display:flex; flex-direction:column; gap:10px; text-align:right; }
        .fl a { color:rgba(255,255,255,.4); font-size:12px; transition:color .15s; }
        .fl a:hover { color:white; }
        .fb {
          max-width:980px; margin:28px auto 0;
          padding-top:20px; border-top:1px solid rgba(255,255,255,.06);
          display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;
        }

        @media(max-width:768px){
          nav { padding:0 20px; }
          .nl,.nc { display:none; }
          .hbtn { display:flex; }
          .si { grid-template-columns:repeat(2,1fr); }
          .sc:nth-child(even) { border-right:none; }
          .sec { padding:56px 20px; }
          .fi { grid-template-columns:1fr; }
          .fl { text-align:left; }
          .fb { flex-direction:column; align-items:flex-start; }
          table thead { display:none; }
          tbody tr { display:block; padding:10px 0; }
          tbody td { display:block; padding:3px 18px; }
        }
      `}</style>

      <nav>
        <div className="nb">
          <div className="ni">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div><div className="nn">Inventaris</div><div className="nt">Dinpora Bojonegoro</div></div>
        </div>

        <div className="nl">
          <a href="#fitur">Fitur</a>
          <a href="#kategori">Kategori Aset</a>
          <a href="#aset">Data Terbaru</a>
        </div>

        <div className="nc">
          <a href="https://bojonegorokab.go.id/" target="_blank" rel="noreferrer">
            <button className="bto">Portal Resmi</button>
          </a>
          <a href="/login"><button className="bts">Masuk</button></a>
        </div>

        <button className="hbtn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
        <div className={`mmenu${menuOpen ? " open" : ""}`}>
          <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
          <a href="#kategori" onClick={() => setMenuOpen(false)}>Kategori Aset</a>
          <a href="#aset" onClick={() => setMenuOpen(false)}>Data Terbaru</a>
          <a href="/login"><button className="bts" style={{width:"100%",marginTop:4}}>Masuk</button></a>
        </div>
      </nav>

      <section className="hero">
        <div className="hi">
          <div className="hew"><span className="hew-dot"/>Sistem aktif · Dinpora Kabupaten Bojonegoro</div>
          <h1>Inventaris Aset<br/><em>Daerah Terpadu</em></h1>
          <p>Satu platform untuk mencatat, memantau, dan mendistribusikan seluruh aset dan inventaris Dinas Kepemudaan dan Olahraga Kabupaten Bojonegoro.</p>
          <div className="hact">
            <a href="/login"><button className="hbm">Masuk ke Sistem</button></a>
            <a href="#fitur"><button className="hbg">Pelajari Fitur</button></a>
          </div>
        </div>
      </section>

      <div className="sb">
        <div className="si">
          {stats.map((s,i) => (
            <div className="sc" key={i}><div className="sn">{s.n}</div><div className="sl">{s.l}</div></div>
          ))}
        </div>
      </div>

      <section className="sec" id="fitur">
        <div className="sec-in">
          <div className="sh">
            <p className="ey">Keunggulan</p>
            <h2 className="st">Dirancang untuk pengelola aset daerah</h2>
            <p className="ss">Platform yang memudahkan pencatatan, distribusi, dan pelaporan aset secara transparan dan akuntabel.</p>
          </div>
          <div className="fg">
            {features.map((f,i) => (
              <div className="fc" key={i}>
                <div className="fic"><Icon name={f.icon}/></div>
                <div className="ft">{f.title}</div>
                <div className="fd">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec cats" id="kategori">
        <div className="sec-in">
          <div className="sh">
            <p className="ey">Kategori Aset</p>
            <h2 className="st">Jelajahi berdasarkan jenis barang</h2>
          </div>
          <div className="cg">
            {categories.map((c,i) => (
              <div className="cp" key={i}>{c}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="aset">
        <div className="sec-in">
          <div className="shr">
            <div>
              <p className="ey">Data Terbaru</p>
              <h2 className="st">Aset tercatat terakhir</h2>
            </div>
            <a href="/login" className="sa">
              Lihat Semua
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
          <div className="tc">
            <table>
              <thead><tr><th>Kode Barang</th><th>Nama Barang</th><th>Lokasi</th><th>Jumlah</th><th>Status</th></tr></thead>
              <tbody>
                {loadingAssets ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--sub)"}}>Memuat data...</td></tr>
                ) : assetRows.length === 0 ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--sub)"}}>Belum ada data aset</td></tr>
                ) : assetRows.map((item,i) => (
                  <tr key={i}>
                    <td style={{fontFamily:"monospace",fontSize:11,color:"var(--pu)"}}>{item.kode_barang}</td>
                    <td className="tdn">{item.nama_barang}</td>
                    <td>{item.lokasi_nama}</td>
                    <td>{item.jumlah} {item.satuan}</td>
                    <td><span className={`badge ${item.status==="Tersedia di Pusat"?"bg":"bp"}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="ctai">
          <h2 className="ctat">Siap mengelola inventaris?</h2>
          <p className="ctas">Masuk ke dashboard untuk mencatat mutasi, memperbarui data aset, dan mencetak laporan distribusi.</p>
          <a href="/login">
            <button className="ctab">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Masuk ke Sistem
            </button>
          </a>
        </div>
      </section>

      <footer>
        <div className="fi">
          <div>
            <div className="fbn">Inventaris Dinpora Bojonegoro</div>
            <p className="fbd">Sistem inventaris terpadu untuk pengelolaan aset dan distribusi barang di lingkungan Dinas Kepemudaan dan Olahraga Kabupaten Bojonegoro.</p>
          </div>
          <div className="fl">
            <a href="#fitur">Fitur</a><a href="#kategori">Kategori</a><a href="#aset">Data Aset</a>
            <a href="https://bojonegorokab.go.id/" target="_blank" rel="noreferrer">Portal Resmi</a>
            <a href="/login">Masuk</a>
          </div>
        </div>
        <div className="fb">
          <span>© 2025 Dinas Kepemudaan dan Olahraga — Kabupaten Bojonegoro</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </>
  );
}
