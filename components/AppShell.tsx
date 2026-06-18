"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useState } from "react";

type IconName = "dashboard" | "inventory" | "count" | "distribution" | "history" | "logout" | "upload";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Data Inventaris", href: "/inventaris", icon: "inventory" },
  { name: "Jumlah Inventaris", href: "/jumlah", icon: "count" },
  { name: "Distribusi Barang", href: "/distribusi", icon: "distribution" },
  { name: "Riwayat Mutasi", href: "/riwayat", icon: "history" },
  { name: "Impor Inventaris", href: "/inventaris/import", icon: "upload" },
] satisfies Array<{ name: string; href: string; icon: IconName }>;

function SidebarIcon({ name }: { name: IconName }) {
  return (
    <span aria-hidden className="nav-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {name === "dashboard" && (
          <>
            <path d="M4 13h6V4H4v9Z" />
            <path d="M14 20h6v-9h-6v9Z" />
            <path d="M4 20h6v-3H4v3Z" />
            <path d="M14 7h6V4h-6v3Z" />
          </>
        )}
        {name === "inventory" && (
          <>
            <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
            <path d="M4 12v4.5L12 21l8-4.5V12" />
            <path d="M12 12v9" />
          </>
        )}
        {name === "count" && (
          <>
            <path d="M5 5h14" />
            <path d="M5 12h14" />
            <path d="M5 19h14" />
            <path d="M8 3v4" />
            <path d="M16 10v4" />
            <path d="M11 17v4" />
          </>
        )}
        {name === "distribution" && (
          <>
            <path d="M3 7h10v8H3V7Z" />
            <path d="M13 10h4l4 4v1h-8v-5Z" />
            <path d="M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path d="M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          </>
        )}
        {name === "history" && (
          <>
            <path d="M4 12a8 8 0 1 0 2.3-5.6" />
            <path d="M4 4v5h5" />
            <path d="M12 8v5l3 2" />
          </>
        )}
        {name === "logout" && (
          <>
            <path d="M10 5H5v14h5" />
            <path d="M14 16l4-4-4-4" />
            <path d="M18 12H9" />
          </>
        )}
        {name === "upload" && (
          <>
            <path d="M12 8v8" />
            <path d="M8 12h8" />
            <path d="M16 12h4" />
            <path d="M12 4v4" />
          </>
        )}
      </svg>
    </span>
  );
}

function BrandIcon() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" />
        <path d="M4 13.5 12 18l8-4.5" />
        <path d="M4 17.5 12 22l8-4.5" />
      </svg>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const showSidebarText = !collapsed || open;
  const shellStyle = {
    "--sidebar-width": collapsed ? "88px" : "260px",
    "--sidebar-pad-x": collapsed ? "12px" : "16px",
    "--main-offset": collapsed ? "120px" : "292px",
  } as CSSProperties;

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`} style={shellStyle}>
      <div className="mobile-topbar">
        <button
          className="button button-secondary min-h-9 px-3 text-sm"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <strong className="text-lg font-bold" style={{ color: "#6d28d9" }}>Inventaris</strong>
      </div>

      {open && <button className="mobile-backdrop" aria-label="Tutup menu" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="flex min-w-0 items-center gap-3">
            <BrandIcon />
            {showSidebarText && (
              <div className="sidebar-brand-text">
                <div className="font-bold text-[15px] tracking-tight text-white">Inventaris</div>
                <div className="text-xs text-white/50">Asset Management System</div>
              </div>
            )}
          </div>

          <button
            className="sidebar-toggle"
            type="button"
            aria-label={collapsed ? "Lebarkan sidebar" : "Kecilkan sidebar"}
            onClick={() => setCollapsed((current) => !current)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <>
                  <path d="m9 6 6 6-6 6" />
                  <path d="M4 4v16" />
                </>
              ) : (
                <>
                  <path d="m15 6-6 6 6 6" />
                  <path d="M20 4v16" />
                </>
              )}
            </svg>
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1.5">
          {navigation.map((item, index) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`nav-link animate-fade-in ${active ? "nav-link-active" : ""}`}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <SidebarIcon name={item.icon} />
                {showSidebarText && <span className="nav-label">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <button
            className="nav-link w-full text-red-400 hover:bg-white/10 hover:text-red-300"
            type="button"
            onClick={() => {
              document.cookie = "sb-logged-in=; path=/; max-age=0";
              window.location.href = "/login";
            }}
          >
            <SidebarIcon name="logout" />
            {showSidebarText && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-frame">{children}</div>
      </main>
    </div>
  );
}
