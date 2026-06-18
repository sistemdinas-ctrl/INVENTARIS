"use client";

import { ReactNode, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 backdrop-blur-sm p-4">
      <div className="card w-full max-w-3xl overflow-hidden animate-scale-in shadow-[0_24px_64px_rgba(124,58,237,0.15)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} className="button button-secondary min-h-9 px-3" type="button" aria-label="Tutup modal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
