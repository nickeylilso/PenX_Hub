/* ============================================================
   PenX Hub — global store, persistence, back-stack, toasts
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Account, Competition, Notif, Post, Team, ThemePref } from "./data";
import { BOTS, initialPoints, seedChats, seedCompetitions, seedPosts, uid } from "./data";

export interface DB {
  v: number;
  accounts: Account[];
  session: string | null;
  teams: Team[];
  comps: Competition[];
  posts: Post[];
  chats: ReturnType<typeof seedChats>;
  notifs: Notif[];
  theme: ThemePref;
  serialSeq: number;
  onboarded: boolean;
}

const KEY = "penxhub_db_v1";

function freshDB(): DB {
  const seq = 1;
  return {
    v: 1, accounts: [], session: null, teams: [],
    comps: seedCompetitions(seq),
    posts: seedPosts(), chats: seedChats(),
    notifs: [], theme: "light", serialSeq: seq + 8, onboarded: false,
  };
}
function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDB();
    const d = JSON.parse(raw) as DB;
    if (!d || d.v !== 1) return freshDB();
    return d;
  } catch { return freshDB(); }
}

/* ---------------- layers & modal stack (back-button aware) ---------------- */
export type Layer =
  | { kind: "game"; gameId: string }
  | { kind: "comp"; compId: string }
  | { kind: "team"; teamId: string }
  | { kind: "myteams" } | { kind: "notifs" } | { kind: "search" } | { kind: "leaderboard" }
  | { kind: "fixtures" } | { kind: "editor" } | { kind: "settings" } | { kind: "myhosts" }
  | { kind: "faq" } | { kind: "chat"; chatId: string } | { kind: "drawer" } | { kind: "explore" };

/** Live stack of open modal close-fns — phone back / Esc closes topmost modal first. */
export const modalStack: { close: () => void }[] = [];

interface Ctx {
  db: DB;
  set: (fn: (d: DB) => DB) => void;
  user: Account | null;
  toast: (msg: string, icon?: string) => void;
  toasts: { id: string; msg: string; icon?: string }[];
  stack: Layer[];
  pushLayer: (l: Layer) => void;
  closeTop: () => void;
  closeAll: () => void;
  tab: "home" | "games" | "updates" | "profile";
  goTab: (t: "home" | "games" | "updates" | "profile") => void;
  notify: (kind: Notif["kind"], text: string) => void;
  unread: number;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("store missing");
  return c;
};

/* db helper mutators (pure) */
export const withNotif = (d: DB, kind: Notif["kind"], text: string): DB => ({
  ...d, notifs: [{ id: uid(), kind, text, time: Date.now(), read: false }, ...d.notifs].slice(0, 60),
});
export const withPoints = (d: DB, delta: number): DB => {
  if (!d.session) return d;
  return { ...d, accounts: d.accounts.map(a => (a.id === d.session ? { ...a, points: a.points + delta } : a)) };
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [toasts, setToasts] = useState<{ id: string; msg: string; icon?: string }[]>([]);
  const [stack, setStack] = useState<Layer[]>([]);
  const [tab, setTab] = useState<"home" | "games" | "updates" | "profile">("home");
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const lastBack = useRef(0);
  const pushedEntries = useRef(0); // history entries we successfully pushed

  /* persist */
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota — ignore */ }
  }, [db]);

  /* theme */
  useEffect(() => {
    const apply = () => {
      const dark = db.theme === "dark" || (db.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [db.theme]);

  const set = useCallback((fn: (d: DB) => DB) => setDb(d => fn(d)), []);
  const toast = useCallback((msg: string, icon?: string) => {
    const id = uid();
    setToasts(t => [...t, { id, msg, icon }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  const notify = useCallback((kind: Notif["kind"], text: string) => {
    setDb(d => withNotif(d, kind, text));
  }, []);

  /* ---------- history-aware layer stack ---------- */
  const pushLayer = useCallback((l: Layer) => {
    setStack(s => [...s, l]);
    try { window.history.pushState({ penx: 1 }, ""); pushedEntries.current++; }
    catch { /* history unavailable — popstate will never fire, closeTop falls back */ }
  }, []);

  const closeTop = useCallback(() => {
    /* programmatic close → let popstate do the actual pop to stay in sync */
    if (pushedEntries.current > 0) {
      try { window.history.back(); return; } catch { /* fall through */ }
    }
    setStack(s => s.slice(0, -1));
  }, []);

  const closeAll = useCallback(() => {
    const n = Math.min(stackRef.current.length, pushedEntries.current);
    pushedEntries.current = 0;
    setStack([]);
    try { for (let i = 0; i < n; i++) window.history.back(); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const onPop = () => {
      pushedEntries.current = Math.max(0, pushedEntries.current - 1);
      if (modalStack.length > 0) {
        modalStack[modalStack.length - 1].close();
        return;
      }
      if (stackRef.current.length > 0) setStack(s => s.slice(0, -1));
      else {
        const now = Date.now();
        if (now - lastBack.current < 2000) {
          toast("Closing PenX Hub…", "fa-door-open");
          try { window.close(); } catch { /* noop */ }
        } else {
          lastBack.current = now;
          toast("Press back again to exit", "fa-rotate-left");
        }
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [toast]);

  /* Escape closes topmost modal, else topmost layer */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modalStack.length > 0) { modalStack[modalStack.length - 1].close(); return; }
      if (stackRef.current.length > 0) closeTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTop]);

  const user = db.accounts.find(a => a.id === db.session) ?? null;
  const unread = db.notifs.filter(n => !n.read).length;
  const goTab = useCallback((t: "home" | "games" | "updates" | "profile") => {
    setStack([]);
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <C.Provider value={{ db, set, user, toast, toasts, stack, pushLayer, closeTop, closeAll, tab, goTab, notify, unread }}>
      {children}
    </C.Provider>
  );
}

/* small shared helpers used by screens */
export const takenHandles = (db: DB) => new Set([...BOTS.map(b => b.handle.toLowerCase()), ...db.accounts.map(a => a.handle.toLowerCase())]);
export const validHandle = (h: string) => /^[a-z0-9_]{3,15}$/.test(h);
