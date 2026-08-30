/* ============================================================
   PenX Hub — Profile, Editor, Settings, My Hosts, FAQ
   ============================================================ */
import { useRef, useState } from "react";
import { BOTS } from "../data";
import { takenHandles, useApp, validHandle, withNotif } from "../store";
import { Avatar, Confirm, Empty, Field, LayerScreen } from "../ui";
import { HostModal } from "./Games";
import { CompCard } from "./Home";
import { readImage } from "./Teams";

const copyText = async (text: string, toast: (m: string, i?: string) => void) => {
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard", "fa-copy"); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Copied to clipboard", "fa-copy"); } catch { toast(text, "fa-copy"); }
    document.body.removeChild(ta);
  }
};

/* ---------------- Profile page ---------------- */
export function ProfileScreen() {
  const { db, user, set, pushLayer, toast, closeAll, notify } = useApp();
  const [confirm, setConfirm] = useState<"logout" | "delete" | null>(null);
  if (!user) return null;
  const hosted = db.comps.filter(c => c.hostId === user.id).length;
  const friends = BOTS.length;

  const logout = () => {
    set(d => ({ ...d, session: null }));
    closeAll();
    toast("Signed out — see you on the pitch", "fa-right-from-bracket");
  };
  const deleteAccount = () => {
    set(d => withNotif({
      ...d,
      accounts: d.accounts.filter(a => a.id !== user.id),
      comps: d.comps.filter(c => c.hostId !== user.id).map(c => ({ ...c, joined: c.joined.filter(j => !d.teams.some(t => t.id === j.teamId)) })),
      teams: [], session: null,
    }, "system", "An account was deleted"));
    closeAll();
    toast("Account deleted", "fa-trash-can");
  };

  const row = (icon: string, label: string, sub: string, fn: () => void, tone = "var(--forest)") => (
    <button className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--forest)_5%,transparent)]" onClick={fn}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone} 13%, transparent)` }}>
        <i className={`fa-solid ${icon}`} style={{ color: tone }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.84rem] font-extrabold">{label}</span>
        <span className="block text-[0.64rem] font-bold text-[var(--mut)]">{sub}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-[0.65rem] text-[var(--mut)]" />
    </button>
  );

  return (
    <div className="mx-auto max-w-md px-4 pb-32">
      <div className="sticky-bar -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <h1 className="font-display text-[1.05rem] uppercase tracking-wide">Profile</h1>
          <button className="btn btn-ghost !px-3.5 !py-2 text-[0.68rem]" onClick={() => pushLayer({ kind: "editor" })}><i className="fa-solid fa-pen" />Edit</button>
        </div>
      </div>

      <div className="stagger mt-4 space-y-4">
        {/* hero */}
        <div className="pitch gold-stripes relative overflow-hidden rounded-2xl p-5 text-white">
          <div className="flex items-center gap-4">
            <Avatar photo={user.photo} name={`${user.firstName} ${user.lastName}`} country={user.country} size={84} ring />
            <div className="min-w-0">
              <h2 className="font-display truncate text-[1.25rem] uppercase leading-tight">{user.firstName} {user.lastName}</h2>
              <p className="text-[0.72rem] font-bold text-white/75">@{user.handle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-bolt" />{user.points} XP</span>
                <span className="chip bg-white/10 text-white"><i className="fa-solid fa-envelope" />{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-2">
          {[["Teams", db.teams.length, "fa-shield-halved"], ["Hosted", hosted, "fa-trophy"], ["Friends", friends, "fa-user-group"]].map(([l, v, i]) => (
            <div key={String(l)} className="card px-2 py-3.5 text-center">
              <i className={`fa-solid ${String(i)} mb-1 text-[var(--gold)]`} />
              <div className="font-display text-[1.2rem]">{v}</div>
              <div className="text-[0.58rem] font-extrabold uppercase tracking-wide text-[var(--mut)]">{l}</div>
            </div>
          ))}
        </div>

        {/* referral card */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#f0c95c,#d9a421)] px-4 py-3 text-[#241a02]">
            <span className="font-display text-[0.8rem] uppercase"><i className="fa-solid fa-gift mr-1.5" />Referral Card</span>
            <span className="chip bg-[#241a02]/10">Everyone gets one</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">Your referral code</div>
              <div className="font-display truncate text-[1rem]">{user.referral}</div>
            </div>
            <button className="btn btn-forest !px-4 !py-2.5 text-[0.7rem]" onClick={() => copyText(`Join me on PenX Hub with code ${user.referral} — compete, challenge, and rise! ⚽`, toast)}>
              <i className="fa-solid fa-copy" />Copy
            </button>
          </div>
        </div>

        {/* rows */}
        <div className="card divide-y divide-[var(--line)]">
          {row("fa-bullhorn", "My Hosts", "Manage competitions you host", () => pushLayer({ kind: "myhosts" }))}
          {row("fa-shield-halved", "My Teams", `${db.teams.length} team${db.teams.length === 1 ? "" : "s"} across games`, () => pushLayer({ kind: "myteams" }))}
          {row("fa-gear", "Settings", "Profile, theme & privacy", () => pushLayer({ kind: "settings" }))}
          {row("fa-circle-question", "FAQ", "How PenX Hub works", () => pushLayer({ kind: "faq" }), "#0e5b63")}
        </div>

        <div className="card divide-y divide-[var(--line)]">
          {row("fa-right-from-bracket", "Logout", "Sign out of this device", () => setConfirm("logout"), "#8f5a1d")}
          {row("fa-trash-can", "Delete Account", "Removes profile, teams & hosts", () => setConfirm("delete"), "#c0392b")}
        </div>
      </div>

      {confirm === "logout" && <Confirm title="Logout" text="You'll return to the sign-in screen. Your data stays safe on this device." confirmLabel="Logout" onYes={logout} onClose={() => setConfirm(null)} />}
      {confirm === "delete" && <Confirm title="Delete Account" text="This permanently removes your account, teams and hosted competitions from this device. This cannot be undone." confirmLabel="Delete forever" danger onYes={deleteAccount} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ---------------- Profile editor ---------------- */
export function EditorScreen() {
  const { db, user, set, toast, notify, closeTop } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState(user?.firstName ?? "");
  const [last, setLast] = useState(user?.lastName ?? "");
  const [handle, setHandle] = useState(user?.handle ?? "");
  const [dob, setDob] = useState(user?.dob ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  if (!user) return null;
  const taken = takenHandles(db);
  const original = user.handle;
  const handleChanged = handle.toLowerCase() !== original;
  const handleOk = validHandle(handle.toLowerCase());
  const suggestion = `${first.toLowerCase().replace(/[^a-z]/g, "")}_${last.toLowerCase().replace(/[^a-z]/g, "")}`.slice(0, 15) || "manager";

  const save = () => {
    if (!first.trim() || !last.trim()) return toast("First and last name are required", "fa-triangle-exclamation");
    if (handleChanged) { toast("Your @handle can't be changed after signup", "fa-lock"); setHandle(original); return; }
    let d2 = { ...db };
    set(d => {
      d2 = withNotif({
        ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, firstName: first.trim(), lastName: last.trim(), dob, phone, location } : a),
      }, "profile", "You updated your profile details");
      return d2;
    });
    notify("system", "Profile saved.");
    toast("Profile saved", "fa-floppy-disk");
    closeTop();
  };

  return (
    <LayerScreen title="Edit Profile" sub="@handles are permanent — names are flexible">
      <div className="stagger space-y-4">
        <div className="card flex items-center gap-4 p-4">
          <Avatar photo={user.photo} name={`${first} ${last}`} country={user.country} size={72} ring />
          <div className="flex-1">
            <p className="text-[0.7rem] font-bold text-[var(--mut)]">Your photo appears in posts, chats, the drawer and everywhere your avatar shows.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              try {
                const img = await readImage(f, 220);
                set(d => withNotif({ ...d, accounts: d.accounts.map(a => (a.id === user.id ? { ...a, photo: img } : a)) }, "profile", "You changed your profile photo"));
                toast("Photo updated everywhere", "fa-camera");
              } catch { toast("Could not read image", "fa-triangle-exclamation"); }
              e.target.value = "";
            }} />
            <button className="btn btn-forest mt-2.5 !px-4 !py-2 text-[0.7rem]" onClick={() => fileRef.current?.click()}><i className="fa-solid fa-camera" />Change Photo</button>
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <Field label="@handle (username)" hint="Handles are permanent — they can't be changed after signup. No spaces allowed.">
            <div className="relative">
              <i className={`fa-solid ${handleChanged ? (handleOk && !taken.has(handle.toLowerCase()) ? "fa-circle-check text-[#16a34a]" : "fa-circle-xmark text-[#e11d48]") : "fa-lock text-[var(--mut)]"} absolute right-4 top-1/2 -translate-y-1/2`} />
              <input className="input !pr-11" value={handle} onChange={e => setHandle(e.target.value.replace(/\s/g, ""))} />
            </div>
            {handleChanged && (
              <span className={`mt-1 block text-[0.68rem] font-bold ${handleOk ? (taken.has(handle.toLowerCase()) ? "text-[#e11d48]" : "text-[#16a34a]") : "text-[#e11d48]"}`}>
                {!handleOk ? "3–15 characters: a–z, 0–9, underscore — no spaces" : taken.has(handle.toLowerCase()) ? "Already taken" : "Available — but handles are locked after signup"}
                {!handleOk && <button className="ml-2 font-extrabold text-[var(--forest)] underline" onClick={() => setHandle(suggestion)}>Try @{suggestion}</button>}
              </span>
            )}
          </Field>
          <div className="flex gap-3">
            <Field label="First name *"><input className="input" value={first} onChange={e => setFirst(e.target.value)} /></Field>
            <Field label="Last name *"><input className="input" value={last} onChange={e => setLast(e.target.value)} /></Field>
          </div>
          <Field label="Date of birth"><input type="date" className="input" value={dob} onChange={e => setDob(e.target.value)} /></Field>
          <Field label="Phone"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 …" /></Field>
          <Field label="Location"><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" /></Field>
        </div>
        <button className="btn btn-forest w-full !py-3.5" onClick={save}><i className="fa-solid fa-floppy-disk" />Save Changes</button>
      </div>
    </LayerScreen>
  );
}

/* ---------------- Settings ---------------- */
export function SettingsScreen() {
  const { db, set, pushLayer, toast } = useApp();
  const themes: { id: "light" | "dark" | "system"; label: string; sub: string; icon: string }[] = [
    { id: "light", label: "Dark Mode = Off", sub: "Forest light theme", icon: "fa-sun" },
    { id: "dark", label: "Dark Mode = On", sub: "Midnight pitch theme", icon: "fa-moon" },
    { id: "system", label: "Follow System", sub: "Matches your device", icon: "fa-circle-half-stroke" },
  ];
  return (
    <LayerScreen title="Settings" sub="Profile & appearance">
      <div className="space-y-4">
        <div className="card divide-y divide-[var(--line)]">
          <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => pushLayer({ kind: "editor" })}>
            <i className="fa-solid fa-user-pen w-5 text-[var(--forest)]" />
            <span className="flex-1 text-[0.84rem] font-extrabold">Edit Profile</span>
            <i className="fa-solid fa-chevron-right text-[0.65rem] text-[var(--mut)]" />
          </button>
        </div>
        <div>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Theme</h3>
          <div className="card divide-y divide-[var(--line)]">
            {themes.map(t => (
              <button key={t.id} className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => { set(d => ({ ...d, theme: t.id })); toast(`Theme: ${t.label}`, "fa-circle-half-stroke"); }}>
                <i className={`fa-solid ${t.icon} w-5 text-[var(--forest)]`} />
                <span className="flex-1">
                  <span className="block text-[0.82rem] font-extrabold">{t.label}</span>
                  <span className="block text-[0.62rem] font-bold text-[var(--mut)]">{t.sub}</span>
                </span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${db.theme === t.id ? "border-[var(--forest)] bg-[var(--forest)]" : "border-[var(--line)]"}`}>
                  {db.theme === t.id && <i className="fa-solid fa-check text-[0.55rem] text-white" />}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="card px-4 py-3.5 text-[0.68rem] font-bold text-[var(--mut)]">
          <i className="fa-solid fa-database text-[var(--forest)]" /> All data (profile, photo, teams, hosted competitions, theme) is stored locally on this device.
        </div>
      </div>
    </LayerScreen>
  );
}

/* ---------------- My Hosts ---------------- */
export function MyHostsScreen() {
  const { db, user, pushLayer } = useApp();
  const [hosting, setHosting] = useState(false);
  const mine = db.comps.filter(c => c.hostId === user?.id);
  return (
    <LayerScreen title="My Hosts" sub="Competitions you manage">
      {mine.length === 0 ? (
        <Empty icon="fa-bullhorn" title="You host nothing yet" sub="Host a league or tournament and manage it from here.">
          <button className="btn btn-gold" onClick={() => setHosting(true)}><i className="fa-solid fa-bullhorn" />Host League / Tournament</button>
        </Empty>
      ) : (
        <div className="space-y-3">
          {mine.map(c => (
            <div key={c.id} className="relative">
              <CompCard comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />
              {c.requests.length > 0 && <span className="chip absolute right-3 top-3 bg-[#e11d48] text-white">{c.requests.length} pending</span>}
            </div>
          ))}
          <button className="btn btn-ghost w-full" onClick={() => setHosting(true)}><i className="fa-solid fa-plus" />Host another</button>
        </div>
      )}
      {hosting && <HostModal onClose={() => setHosting(false)} onHosted={id => { setHosting(false); pushLayer({ kind: "comp", compId: id }); }} onNeedTeam={() => setHosting(false)} />}
    </LayerScreen>
  );
}

/* ---------------- FAQ ---------------- */
const FAQS: [string, string][] = [
  ["How do I join a competition?", "Games → pick a game → open a competition → scroll to Participate. You need a team for that game first (one team per game)."],
  ["Why is my Join button disabled?", "A team can be in only ONE league or competition at a time. Finish or leave the current one — the label shows “In A League” while busy."],
  ["How are fixtures generated?", "Auto mode builds every fixture from the confirmed teams: leagues get matchdays (round-robin), tournaments get groups of 4 or straight knockout rounds depending on size."],
  ["What do the serial numbers mean?", "Every competition gets a unique Co(MM)(YYYY)##### serial — search it in the Games search bar or global search to jump straight to it."],
  ["How do private competitions work?", "Users tap Request To Join. The host gets a notification and accepts or rejects each request from Host Tools."],
  ["How are disputes handled?", "In Screenshot results mode, teams upload proof under the fixture. Screenshots are reviewed for accuracy and disputes are forwarded to the host, whose decision is final."],
  ["Can I change my @handle?", "No — handles are permanent. You can change your first/last name, photo and details anytime from Profile → Edit."],
];
export function FAQScreen() {
  const [open, setOpen] = useState(0);
  return (
    <LayerScreen title="FAQ" sub="How PenX Hub works">
      <div className="space-y-2.5">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="card overflow-hidden">
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="font-display text-[0.85rem] text-[var(--gold)]">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[0.8rem] font-extrabold">{q}</span>
              <i className={`fa-solid fa-chevron-${open === i ? "up" : "down"} text-[0.65rem] text-[var(--mut)]`} />
            </button>
            {open === i && <p className="fade-up border-t border-[var(--line)] px-4 py-3 text-[0.76rem] font-semibold leading-relaxed text-[var(--mut)]">{a}</p>}
          </div>
        ))}
      </div>
    </LayerScreen>
  );
}
