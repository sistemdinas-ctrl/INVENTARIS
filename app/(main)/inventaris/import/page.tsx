"use client";

import { supabase } from "@/lib/supabase";
import { FormEvent, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type ImportRow = {
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
  status: "Tersedia di Pusat" | "Didistribusikan";
  id_lokasi_saat_ini: string | null;
};

type ParsedRow = {
  excelRow: number;
  item: ImportRow;
};

type ImportError = {
  row: number;
  message: string;
  detail?: string;
};

type DuplicateCheckRow = {
  nibar?: string | null;
};

type PreviewRow = {
  excelRow: number;
  nibar: string;
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  status: string;
};

type DebugInfo = {
  headers: string[];
  sampleRow: Record<string, unknown>;
};

type ColumnMap = {
  [key: string]: number;
};

const requiredColumns = [
  "nibar",
  "kode_barang",
  "nama_barang",
  "spesifikasi",
  "merek_tipe",
  "nomor_polisi",
  "jumlah",
  "satuan",
  "harga_satuan_perolehan",
  "nilai_perolehan",
  "tanggal_perolehan",
  "keterangan",
  "status",
];

const defaultColumns: ColumnMap = {
  nibar: 0,
  kode_barang: 1,
  nama_barang: 2,
  spesifikasi: 3,
  merek_tipe: 4,
  nomor_polisi: 5,
  jumlah: 6,
  satuan: 7,
  harga_satuan_perolehan: 8,
  nilai_perolehan: 9,
  tanggal_perolehan: 10,
  keterangan: 11,
  status: 12,
};

const columnAliases: Record<string, string[]> = {
  nibar: ["nibar", "no_nibar", "nomor_nibar", "nomor inventaris barang", "nomor_inventaris_barang"],
  kode_barang: ["kode_barang", "kode barang", "kode"],
  nama_barang: ["nama_barang", "nama barang", "nama"],
  spesifikasi: ["spesifikasi", "specification", "deskripsi"],
  merek_tipe: ["merek_tipe", "merek tipe", "merk_tipe", "merk tipe", "merek", "merk"],
  nomor_polisi: ["nomor_polisi", "nomor polisi", "nopol", "no_polisi"],
  jumlah: ["jumlah", "qty", "quantity"],
  satuan: ["satuan", "unit"],
  harga_satuan_perolehan: ["harga_satuan_perolehan", "harga satuan perolehan", "harga satuan", "harga"],
  nilai_perolehan: ["nilai_perolehan", "nilai perolehan", "total_nilai", "total nilai"],
  tanggal_perolehan: ["tanggal_perolehan", "tanggal perolehan", "tgl_perolehan", "tgl perolehan"],
  keterangan: ["keterangan", "keterangan_barang", "catatan"],
  status: ["status", "status_barang"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const monthNames: Record<string, string> = {
  januari: "01", jan: "01", februari: "02", feb: "02", maret: "03", mar: "03",
  april: "04", apr: "04", mei: "05", juni: "06", jun: "06",
  juli: "07", jul: "07", agustus: "08", agust: "08",
  september: "09", sep: "09", oktober: "10", okt: "10",
  november: "11", nov: "11", desember: "12", des: "12",
};

function formatDateParts(day: number, month: number, year: number) {
  if (month < 1 || month > 12) return "";
  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!valid) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function excelSerialToDate(serial: number) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcDate = new Date(excelEpoch + Math.floor(serial) * msPerDay);
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
}

function toDateValue(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number") return excelSerialToDate(value);

  const text = toText(value);
  if (!text) return "";

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return formatDateParts(Number(slash[1]), Number(slash[2]), Number(slash[3]));

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) return formatDateParts(Number(dash[1]), Number(dash[2]), Number(dash[3]));

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return formatDateParts(Number(iso[3]), Number(iso[2]), Number(iso[1]));

  const words = text.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (words) {
    const month = monthNames[String(words[2]).toLowerCase()];
    if (month) return formatDateParts(Number(words[1]), Number(month), Number(words[3]));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function normalizeStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["didistribusikan", "terdistribusi", "tersedia di lokasi", "tersedia dilokasi"].includes(normalized)) return "Didistribusikan";
  return "Tersedia di Pusat";
}

function buildColumnMap(headers: unknown[]) {
  const map: ColumnMap = {};
  headers.forEach((header, index) => { map[normalizeHeader(header)] = index; });

  const merged: ColumnMap = {};
  Object.keys(defaultColumns).forEach((key) => {
    const fallbackIndex = defaultColumns[key];
    const aliases = columnAliases[key] ?? [key];
    const matchedIndex = aliases.map((alias) => map[normalizeHeader(alias)]).find((index) => index !== undefined);
    merged[key] = matchedIndex ?? fallbackIndex;
  });

  return merged;
}

function parseExcelRows(rows: unknown[][], columns: ColumnMap): { parsed: ParsedRow[]; errors: ImportError[] } {
  const parsed: ParsedRow[] = [];
  const errors: ImportError[] = [];
  const seenNibar = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    const excelRow = index + 2;
    const item: ImportRow = {
      nibar: toText(row[columns.nibar]),
      kode_barang: toText(row[columns.kode_barang]),
      nama_barang: toText(row[columns.nama_barang]),
      spesifikasi: toText(row[columns.spesifikasi]),
      merek_tipe: toText(row[columns.merek_tipe]),
      nomor_polisi: toText(row[columns.nomor_polisi]),
      jumlah: toNumber(row[columns.jumlah], 1),
      satuan: toText(row[columns.satuan]) || "unit",
      harga_satuan_perolehan: toNumber(row[columns.harga_satuan_perolehan]),
      nilai_perolehan: toNumber(row[columns.nilai_perolehan]),
      tanggal_perolehan: toDateValue(row[columns.tanggal_perolehan]),
      keterangan: toText(row[columns.keterangan]),
      status: normalizeStatus(toText(row[columns.status]) || "Tersedia di Pusat"),
      id_lokasi_saat_ini: null,
    };

    const rowErrors: string[] = [];
    if (!item.nibar) rowErrors.push("NIBAR wajib diisi");
    else if (seenNibar.has(item.nibar)) rowErrors.push("NIBAR duplikat di dalam file Excel");
    else seenNibar.add(item.nibar);
    if (!item.kode_barang) rowErrors.push("Kode barang wajib diisi");
    if (!item.nama_barang) rowErrors.push("Nama barang wajib diisi");
    if (item.jumlah < 1) rowErrors.push("Jumlah minimal 1");
    if (!item.satuan) rowErrors.push("Satuan wajib diisi");
    if (!item.status) rowErrors.push("Status wajib diisi");
    if (!item.tanggal_perolehan) rowErrors.push("Tanggal perolehan tidak valid. Gunakan format 17/06/2026 atau 17-06-2026");

    if (rowErrors.length > 0) {
      errors.push({ row: excelRow, message: rowErrors.join("; ") });
      return;
    }

    parsed.push({ excelRow, item });
  });

  return { parsed, errors };
}

export default function ImportInventarisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(0);
  const [insertErrors, setInsertErrors] = useState<ImportError[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [message, setMessage] = useState("");

  const canImport = useMemo(() => parsedRows.length > 0 && validationErrors.length === 0 && !loading, [parsedRows.length, validationErrors.length, loading]);
  const totalRows = parsedRows.length + validationErrors.length;
  const progressPercent = totalRows > 0 ? Math.min((progress / totalRows) * 100, 100) : 0;

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setParsedRows([]);
    setValidationErrors([]);
    setInsertErrors([]);
    setDebugInfo(null);
    setLoading(false);
    setProgress(0);
    setSuccess(0);
    setMessage("");
  };

  const handleFileUpload = async (event: FormEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];
    if (!selected) return;

    resetState();
    setFile(selected);
    setLoading(true);
    setMessage("Membaca file Excel...");

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as unknown[][];

      if (rows.length < 2) {
        setMessage("File Excel harus berisi header dan minimal 1 baris data.");
        setLoading(false);
        return;
      }

      const columns = buildColumnMap(rows[0]);
      const { parsed, errors } = parseExcelRows(rows, columns);

      const debugHeaders = rows[0].map((header) => toText(header));
      const debugSampleRow: Record<string, unknown> = {};
      Object.entries(columns).forEach(([key, columnIndex]) => {
        debugSampleRow[key] = rows[1]?.[columnIndex] ?? null;
      });
      setDebugInfo({ headers: debugHeaders, sampleRow: debugSampleRow });

      const previewRows: PreviewRow[] = parsed.slice(0, 20).map(({ excelRow, item }) => ({
        excelRow,
        nibar: item.nibar,
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        jumlah: item.jumlah,
        status: item.status,
      }));

      setPreview(previewRows);
      setParsedRows(parsed);
      setValidationErrors(errors);
      setMessage(`File siap diimpor: ${parsed.length} baris valid, ${errors.length} baris bermasalah.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membaca file Excel.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultLocationId = async () => {
    const { data, error } = await supabase
      .from("lokasi")
      .select("id_lokasi")
      .eq("nama_lokasi", "KANTOR PUSAT")
      .single();

    if (error) throw new Error(`Gagal mengambil lokasi default: ${error.message}`);
    return (data as { id_lokasi: string | null } | null)?.id_lokasi ?? null;
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { nibar: "NIBAR-CONTOH-001", kode_barang: "BRG-001", nama_barang: "Laptop", spesifikasi: "Core i5, RAM 8GB, SSD 256GB", merek_tipe: "Lenovo ThinkPad", nomor_polisi: "-", jumlah: 1, satuan: "unit", harga_satuan_perolehan: 8500000, nilai_perolehan: 8500000, tanggal_perolehan: "17/06/2026", keterangan: "Barang tersedia di kantor pusat", status: "Tersedia di Pusat" },
      { nibar: "NIBAR-CONTOH-002", kode_barang: "BRG-002", nama_barang: "Printer", spesifikasi: "LaserJet, hitam putih", merek_tipe: "HP LaserJet", nomor_polisi: "-", jumlah: 2, satuan: "unit", harga_satuan_perolehan: 3200000, nilai_perolehan: 6400000, tanggal_perolehan: "17/06/2026", keterangan: "Contoh data kedua", status: "Didistribusikan" },
    ], { skipHeader: true });

    XLSX.utils.sheet_add_aoa(worksheet, [
      ["nibar", "kode_barang", "nama_barang", "spesifikasi", "merek_tipe", "nomor_polisi", "jumlah", "satuan", "harga_satuan_perolehan", "nilai_perolehan", "tanggal_perolehan", "keterangan", "status"],
    ], { origin: "A1" });

    XLSX.utils.sheet_add_aoa(worksheet, [
      ["NIBAR-CONTOH-001", "BRG-001", "Laptop", "Core i5, RAM 8GB, SSD 256GB", "Lenovo ThinkPad", "-", 1, "unit", 8500000, 8500000, "17/06/2026", "Barang tersedia di kantor pusat", "Tersedia di Pusat"],
      ["NIBAR-CONTOH-002", "BRG-002", "Printer", "LaserJet, hitam putih", "HP LaserJet", "-", 2, "unit", 3200000, 6400000, "17/06/2026", "Contoh data kedua", "Didistribusikan"],
    ], { origin: "A2" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format Import");
    XLSX.writeFile(workbook, "template-import-inventaris.xlsx");
  };

  const handleImport = async () => {
    if (!canImport) return;

    setLoading(true);
    setInsertErrors([]);
    setProgress(0);
    setSuccess(0);
    setMessage("Menyiapkan data untuk diimpor...");

    try {
      const locationId = await fetchDefaultLocationId();
      const itemsWithLocation = parsedRows.map(({ item }) => ({ ...item, id_lokasi_saat_ini: locationId }));

      const batchSize = 25;
      for (let i = 0; i < itemsWithLocation.length; i += batchSize) {
        const batch = itemsWithLocation.slice(i, i + batchSize);
        const { error } = await supabase.from("inventaris").insert(batch);

        if (error) {
          setInsertErrors((current) => [
            ...current,
            { row: parsedRows[i]?.excelRow ?? 0, message: `Batch ${Math.floor(i / batchSize) + 1} gagal diproses: ${error.message}`, detail: error.details ?? error.hint ?? "" },
          ]);

          for (let j = 0; j < batch.length; j++) {
            const { error: singleError } = await supabase.from("inventaris").insert([batch[j]]);
            if (singleError) {
              setInsertErrors((current) => [...current, { row: parsedRows[i + j].excelRow, message: singleError.message, detail: singleError.details ?? singleError.hint ?? "" }]);
            } else {
              setSuccess((current) => current + 1);
            }
          }
        } else {
          setSuccess((current) => current + batch.length);
        }

        setProgress(i + batch.length);
        setMessage(`Mengimpor... ${i + batch.length} / ${itemsWithLocation.length} baris.`);
      }

      const failed = insertErrors.length;
      const expected = itemsWithLocation.length;
      if (success === expected && failed === 0) {
        setMessage(`Selesai. Semua data berhasil masuk: ${success} dari ${expected} baris.`);
      } else {
        setMessage(`Selesai. Berhasil: ${success} dari ${expected} baris. Gagal: ${failed}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengimpor data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Impor Data Inventaris dari Excel</h1>
          <p className="page-description">
            Unggah file Excel berisi data inventaris. Sistem membaca kolom berdasarkan nama header dan menyimpan data secara bertahap agar aman untuk ribuan baris.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.3fr]">
        <div className="card card-pad animate-slide-up">
          <div className="rounded-2xl border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.04)] p-5">
            <h2 className="section-title flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              1. Download Template
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Gunakan template ini agar format Excel sesuai dengan sistem.
            </p>
            <button
              onClick={downloadTemplate}
              className="button button-primary mt-4 w-full"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v13M8 12l4 4 4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Download Template Excel
            </button>
          </div>

          <div className="mt-5">
            <h2 className="section-title flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              2. Pilih File Excel
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Format yang didukung: .xlsx. Baris pertama harus berisi header kolom.
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white/60 p-6 transition-all hover:border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.03)]">
              <div className="text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" className="mx-auto mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm font-medium text-[#7C3AED]">Klik untuk memilih file Excel</span>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">.xlsx only</p>
              </div>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
            {file && (
              <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3 text-sm animate-fade-in">
                <div className="flex items-center gap-2 font-medium text-[var(--color-text-primary)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {file.name}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card card-pad animate-slide-up" style={{ animationDelay: "0.08s" }}>
          <h2 className="section-title flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            3. Format Kolom Excel
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Kolom dapat menggunakan huruf besar/kecil dan spasi. Contoh <strong>Nama Barang</strong> tetap terbaca sebagai <strong>nama_barang</strong>.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {requiredColumns.map((column) => (
              <div key={column} className="rounded-2xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm transition-colors hover:border-[rgba(124,58,237,0.2)]">
                <span className="font-medium text-[var(--color-text-primary)]">{column}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.06)] p-4 text-sm text-[var(--color-text-secondary)]">
            Kolom wajib: <strong>nibar</strong>, <strong>kode_barang</strong>, <strong>nama_barang</strong>, <strong>jumlah</strong>, <strong>satuan</strong>, dan <strong>status</strong>.<br />
            Format tanggal: <strong>17/06/2026</strong>, <strong>17-06-2026</strong>, atau <strong>17 Juni 2026</strong>.<br />
            NIBAR duplikat dengan data yang sudah ada akan dilewati.
          </div>
        </div>
      </section>

      <section className="card card-pad animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              4. Preview Data
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Menampilkan 20 baris pertama dari data yang valid.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="button button-secondary"
              type="button"
              onClick={resetState}
              disabled={loading || (!file && preview.length === 0)}
            >
              Reset
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={!canImport}
              onClick={handleImport}
            >
              {loading ? "Memproses..." : `Mulai Import (${parsedRows.length} data)`}
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-5 animate-fade-in">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {progress} / {totalRows} baris diproses
            </p>
          </div>
        )}

        {message && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm animate-fade-in flex items-center gap-3 ${
              message.includes("Selesai")
                ? "border-success/30 bg-gradient-success text-emerald-800"
                : message.includes("Gagal")
                  ? "border-danger/30 bg-gradient-danger text-red-800"
                  : "border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)] text-blue-800"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              {message.includes("Selesai") ? (
                <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              ) : message.includes("Gagal") ? (
                <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
              ) : (
                <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
              )}
            </svg>
            {message}
          </div>
        )}

        {debugInfo && (
          <details className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 transition-colors hover:border-[rgba(124,58,237,0.2)]">
            <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">Lihat header dan baris pertama yang terbaca dari Excel</summary>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">Header terbaca</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {debugInfo.headers.map((header, index) => (
                    <span key={`${header}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                      {index + 1}. {header || "(kosong)"}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">Baris pertama terbaca</div>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(debugInfo.sampleRow).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-[var(--color-border)] bg-white p-2">
                      <div className="text-xs text-[var(--color-text-secondary)]">{key}</div>
                      <div className="break-all font-medium">{String(value ?? "")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 transition-all hover:border-[rgba(16,185,129,0.3)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)]">
            <div className="text-sm text-[var(--color-text-secondary)]">Baris Valid</div>
            <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{parsedRows.length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 transition-all hover:border-[rgba(239,68,68,0.3)] hover:shadow-[0_4px_12px_rgba(239,68,68,0.08)]">
            <div className="text-sm text-[var(--color-text-secondary)]">Baris Error</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{validationErrors.length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 transition-all hover:border-[rgba(16,185,129,0.3)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)]">
            <div className="text-sm text-[var(--color-text-secondary)]">Berhasil Import</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{success}</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 transition-all hover:border-[rgba(239,68,68,0.3)] hover:shadow-[0_4px_12px_rgba(239,68,68,0.08)]">
            <div className="text-sm text-[var(--color-text-secondary)]">Gagal Import</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{insertErrors.length}</div>
          </div>
        </div>
      </section>

      <section className="card table-card animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Baris</th>
                <th style={{ width: "22%" }}>NIBAR</th>
                <th style={{ width: "15%" }}>Kode Barang</th>
                <th style={{ width: "24%" }}>Nama Barang</th>
                <th style={{ width: "10%" }}>Jumlah</th>
                <th style={{ width: "16%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <p className="font-semibold text-[var(--color-text-primary)]">Belum ada data preview</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">Download template atau pilih file Excel untuk melihat preview.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                preview.map((row, i) => (
                  <tr key={row.excelRow} className="animate-fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                    <td>{row.excelRow}</td>
                    <td className="font-medium text-[#7C3AED]">{row.nibar}</td>
                    <td>{row.kode_barang}</td>
                    <td className="font-medium text-[var(--color-text-primary)]">{row.nama_barang}</td>
                    <td>{row.jumlah}</td>
                    <td><span className={`badge ${row.status === "Tersedia di Pusat" ? "badge-success" : "badge-info"}`}>{row.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(validationErrors.length > 0 || insertErrors.length > 0) && (
        <section className="card card-pad animate-fade-in">
          <h2 className="section-title">Baris Bermasalah</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Perbaiki data berikut lalu upload ulang file Excel.
          </p>
          <div className="mt-4 table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>Baris</th>
                  <th style={{ width: "35%" }}>Pesan</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {[...validationErrors, ...insertErrors].map((error, index) => (
                  <tr key={`${error.row}-${index}`}>
                    <td>{error.row}</td>
                    <td className="text-red-600">{error.message}</td>
                    <td className="break-all text-xs text-[var(--color-text-secondary)]">{error.detail || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
