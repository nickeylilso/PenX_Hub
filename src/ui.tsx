/* ============================================================
   PenX Hub — shared UI kit
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LOGO_URL, flagEmoji } from "./data";
import { modalStack, useApp } from "./store";

/* ---------------- Logo (remote PNG, transparent bg, SVG fallback) ---------------- */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const [err, setErr] = useState(false);
  if (err)
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="PenX Hub logo">
        <circle cx="32" cy="32" r="30" fill="#0b3d22" stroke="#d9a421" strokeWidth="3" />
        <path d="M20 44V20h10a8 8 0 0 1 0 16h-5v8z" fill="#fff" />
        <path d="M34 44l8-24h4l8 24h-5l-1.5-5h-7L39 44z" fill="#d9a421" />
      </svg>
    );
  return <img src={LOGO_URL} onError={() => setErr(true)} width={size} height={size} alt="PenX Hub" className={className} style={{ objectFit: "contain" }} />;
}

/* ---------------- round glossy country flag badge ---------------- */
export function FlagBadge({ country, size = 20, style }: { country: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="glossy-flag shrink-0" style={{ width: size, height: size, fontSize: size * 0.62, ...style }}>
      {country ? flagEmoji(country) : "🌍"}
    </span>
  );
}

/* ---------------- avatar with photo/initials + flag bottom-right ---------------- */
const AV_COLORS = ["#1d7544", "#0e5b63", "#8f2f4f", "#5b3a8f", "#8f5a1d", "#274d8f", "#146c3d"];
export function Avatar({ photo, name, country, size = 44, flag = true, ring = false }: { photo: string | null; name: string; country?: string; size?: number; flag?: boolean; ring?: boolean }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "PX";
  const color = AV_COLORS[(name.charCodeAt(0) + name.length) % AV_COLORS.length];
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {photo && !err ? (
        <img src={photo} onError={() => setErr(true)} alt={name} className="h-full w-full rounded-full object-cover" style={ring ? { boxShadow: "0 0 0 3px var(--gold)" } : undefined} />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full font-display text-white" style={{ background: `linear-gradient(135deg, ${color}, #0b3d22)`, fontSize: size * 0.34, boxShadow: ring ? "0 0 0 3px var(--gold)" : undefined }}>
          {initials}
        </span>
      )}
      {flag && country && (
        <FlagBadge country={country} size={Math.max(15, size * 0.38)} style={{ position: "absolute", right: -2, bottom: -2 }} />
      )}
    </span>
  );
}

/* ---------------- team crest (uploaded logo or colored monogram) ---------------- */
export function TeamLogo({ logo, color, name, size = 44 }: { logo: string | null; color: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const useImg = logo && logo.startsWith("data:") && !err;
  return (
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: useImg ? "#fff" : `linear-gradient(135deg, ${color}, #0b3d22)`, border: "2px solid rgb(255 255 255/.55)", boxShadow: "inset 0 2px 4px rgb(255 255 255/.25), 0 3px 8px rgb(0 0 0/.28)" }}>
      {useImg ? <img src={logo!} onError={() => setErr(true)} alt={name} className="h-full w-full object-cover" />
        : <i className="fa-solid fa-futbol text-white" style={{ fontSize: size * 0.42 }} />}
    </span>
  );
}

/* ---------------- bottom-sheet modal (registers in back-button modal stack) ---------------- */
export function Modal({ title, onClose, children, tall = false }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    const entry = { close: () => ref.current() };
    modalStack.push(entry);
    return () => { const i = modalStack.indexOf(entry); if (i >= 0) modalStack.splice(i, 1); };
  }, []);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button aria-label="Close" className="absolute inset-0 bg-[rgb(4_20_12/0.62)] backdrop-blur-[2px]" onClick={onClose} />
      <div className={`sheet-in relative w-full sm:max-w-md ${tall ? "h-[92dvh]" : "max-h-[88dvh]"} flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--line)] bg-[var(--card)] shadow-2xl`}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[var(--line)]" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="font-display text-[1.02rem] uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="icon-btn !h-9 !w-9" aria-label="Close dialog"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- confirm dialog ---------------- */
export function Confirm({ title, text, confirmLabel = "Confirm", danger = false, onYes, onClose }: { title: string; text: string; confirmLabel?: string; danger?: boolean; onYes: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm font-semibold text-[var(--mut)]">{text}</p>
      <div className="mt-5 flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className={`btn flex-1 text-white ${danger ? "" : "btn-forest"}`} style={danger ? { background: "linear-gradient(135deg,#c0392b,#7b1e12)" } : undefined} onClick={() => { onYes(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

/* ---------------- full-screen layer shell with sticky header ---------------- */
export function LayerScreen({ title, sub, right, children, onDark }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; onDark?: boolean }) {
  const { closeTop } = useApp();
  return (
    <div data-layer-scroll className="slide-in fixed inset-0 z-[60] overflow-y-auto no-scrollbar bg-[var(--bg)]">
      <div className={`sticky-bar ${onDark ? "!bg-transparent !border-transparent !backdrop-blur-none" : ""}`}>
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={closeTop} className="icon-btn" aria-label="Go back"><i className="fa-solid fa-arrow-left" /></button>
          <div className="min-w-0 flex-1">
            <div className={`font-display truncate text-[1.02rem] uppercase tracking-wide ${onDark ? "text-white" : ""}`}>{title}</div>
            {sub && <div className={`truncate text-[0.72rem] font-bold ${onDark ? "text-white/70" : "text-[var(--mut)]"}`}>{sub}</div>}
          </div>
          {right}
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</div>
    </div>
  );
}

/* ---------------- empty state ---------------- */
export function Empty({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="card fade-up flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--forest)_12%,transparent)]">
        <i className={`fa-solid ${icon} text-2xl text-[var(--forest)]`} />
      </span>
      <h4 className="font-display mt-4 text-[0.95rem] uppercase tracking-wide">{title}</h4>
      {sub && <p className="mt-1.5 max-w-[240px] text-[0.8rem] font-semibold text-[var(--mut)]">{sub}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ---------------- segmented tabs ---------------- */
export function Seg<T extends string>({ options, value, onChange, small = false }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full font-extrabold transition-all ${small ? "px-3.5 py-1.5 text-[0.72rem]" : "px-4 py-2 text-[0.78rem]"} ${value === o.id ? "bg-[var(--deep)] text-white shadow-md" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- form field ---------------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.68rem] font-semibold text-[var(--mut)]">{hint}</span>}
    </label>
  );
}

/* ---------------- bottom tab bar ---------------- */
const TABS = [
  { id: "home", icon: "fa-house", label: "Home" },
  { id: "games", icon: "fa-gamepad", label: "Games" },
  { id: "updates", icon: "fa-newspaper", label: "Updates" },
  { id: "profile", icon: "fa-user", label: "Profile" },
] as const;
export function TabBar() {
  const { tab, goTab } = useApp();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-md px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] px-2 py-1.5 shadow-xl backdrop-blur-xl">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => goTab(t.id)} className="group flex flex-1 flex-col items-center gap-0.5 py-1" aria-label={t.label}>
                <span className={`flex h-9 w-14 items-center justify-center rounded-full transition-all duration-300 ${active ? "bg-[var(--deep)] text-[var(--gold)] shadow-lg" : "text-[var(--mut)] group-active:scale-90"}`}>
                  <i className={`fa-solid ${t.icon} text-[1rem]`} />
                </span>
                <span className={`text-[0.58rem] font-extrabold uppercase tracking-wide ${active ? "text-[var(--forest)]" : "text-[var(--mut)]"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/* ---------------- toast host ---------------- */
export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[95] flex flex-col items-center gap-2 px-6">
      {toasts.map(t => (
        <div key={t.id} className="toast-in flex max-w-full items-center gap-2.5 rounded-full border border-[var(--line)] bg-[var(--deep)] py-2.5 pl-3.5 pr-5 text-[0.78rem] font-bold text-white shadow-xl">
          <i className={`fa-solid ${t.icon ?? "fa-circle-check"} text-[var(--gold)]`} />
          <span className="truncate">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- status chip ---------------- */
export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    Upcoming: "bg-[var(--gold-soft)] text-[#7a5a06]",
    Ongoing: "bg-[color-mix(in_srgb,#16a34a_18%,transparent)] text-[#15803d] dark:text-[#4ade80]",
    Completed: "bg-[color-mix(in_srgb,var(--mut)_16%,transparent)] text-[var(--mut)]",
  };
  const dot: Record<string, string> = { Upcoming: "#d9a421", Ongoing: "#22c55e", Completed: "#94a3b8" };
  return (
    <span className={`chip ${map[status] ?? ""}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Ongoing" ? "live-dot" : ""}`} style={{ background: dot[status] ?? "#94a3b8" }} />
      {status}
    </span>
  );
}
