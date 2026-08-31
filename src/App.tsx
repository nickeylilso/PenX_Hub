/* ============================================================
   PenX Hub — app shell: splash, landing, auth, tabs, layers
   ============================================================ */
import { useEffect, useState } from "react";
import type { Layer } from "./store";
import { StoreProvider, takenHandles, useApp, validHandle, withNotif } from "./store";
import type { Account } from "./data";
import { BOTS, COUNTRIES, uid } from "./data";
import { Field, Logo, TabBar, ToastHost } from "./ui";
import { HomeScreen, LeaderboardScreen, MyFixturesScreen, NotifScreen, SearchScreen } from "./screens/Home";
import { GameScreen, GamesScreen } from "./screens/Games";
import { CompExploreScreen, CompInfoScreen } from "./screens/Competition";
import { MyTeamsScreen, TeamDetailScreen } from "./screens/Teams";
import { ChatScreen, MenuDrawer, UpdatesScreen } from "./screens/Updates";
import { EditorScreen, FAQScreen, FriendsScreen, MyHostsScreen, ProfileScreen, SettingsScreen, UserDetailsScreen } from "./screens/Profile";

/* ---------------- splash ---------------- */
function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div className={`pitch fixed inset-0 z-[99] flex flex-col items-center justify-center transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}>
      <div className="gold-stripes absolute inset-0" />
      <div className="pulse-soft relative"><Logo size={104} /></div>
      <h1 className="font-display relative mt-5 text-[1.6rem] uppercase tracking-wide text-white">PenX <span className="text-[var(--gold)]">Hub</span></h1>
      <p className="relative mt-1 text-[0.66rem] font-extrabold uppercase tracking-[0.34em] text-white/60">Compete · Challenge · Rise</p>
      <div className="relative mt-8 w-52">
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="load-bar h-full rounded-full bg-[linear-gradient(90deg,#f0c95c,#d9a421)]" />
        </div>
        <p className="mt-2.5 text-center text-[0.62rem] font-extrabold uppercase tracking-[0.3em] text-white/70">Loading…</p>
      </div>
    </div>
  );
}

/* ---------------- landing + auth ---------------- */
function AuthFlow() {
  const { db, set, toast, notify } = useApp();
  const [mode, setMode] = useState<"landing" | "register" | "login">("landing");
  const [f, setF] = useState({ first: "", last: "", handle: "", country: "NG", email: "", pw: "", pw2: "", agree: false, refCode: "" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const taken = takenHandles(db);
  const hOk = validHandle(f.handle.toLowerCase());
  const hTaken = taken.has(f.handle.toLowerCase());
  const refCode = f.refCode.trim();
  const refOwner = refCode ? db.accounts.find(a => a.referral.toLowerCase() === refCode.toLowerCase()) ?? null : null;
  const refInvalid = refCode.length > 0 && !refOwner;

  const register = () => {
    if (!f.first.trim() || !f.last.trim()) return toast("Enter first and last name", "fa-triangle-exclamation");
    if (!hOk) return toast("Invalid handle — 3–15 chars, no spaces", "fa-triangle-exclamation");
    if (hTaken) return toast("That handle is already taken", "fa-circle-xmark");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast("Enter a valid email", "fa-envelope");
    if (f.pw.length < 6) return toast("Password needs 6+ characters", "fa-key");
    if (f.pw !== f.pw2) return toast("Passwords don't match", "fa-key");
    if (refInvalid) return toast("That referral code doesn't exist — leave blank to skip", "fa-gift");
    if (!f.agree) return toast("Agree to the Privacy & Policies first", "fa-file-shield");
    const acc: Account = {
      id: uid(), firstName: f.first.trim(), lastName: f.last.trim(), handle: f.handle.toLowerCase(),
      country: f.country, email: f.email.trim(), password: f.pw, photo: null,
      dob: "", phone: "", location: "",
      referral: `PENX-${f.handle.toUpperCase().slice(0, 8)}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      friends: [], sent: [], referralCount: 0, notifEnabled: true,
      referredBy: refOwner?.id,
      /* one pending request so the Friends screen is alive from day one */
      incoming: [{ fromId: BOTS[3].id, fromName: BOTS[3].name, fromHandle: BOTS[3].handle, fromCountry: BOTS[3].country, time: Date.now() }],
    };
    set(d => withNotif({
      ...d,
      accounts: [...d.accounts.map(a => (refOwner && a.id === refOwner.id ? { ...a, referralCount: a.referralCount + 1 } : a)), acc],
      session: acc.id, onboarded: true,
    }, "login", `Welcome to PenX Hub, ${acc.firstName}! You're signed in.`));
    if (refOwner) notify("system", `Referral code applied — ${refOwner.firstName} earns +10 XP, and so do you.`);
    toast("Account created — welcome to the pitch!", "fa-trophy");
  };
  const login = () => {
    const acc = db.accounts.find(a => a.email.toLowerCase() === loginEmail.trim().toLowerCase());
    if (!acc || acc.password !== loginPw) return toast("Email or password is incorrect", "fa-circle-xmark");
    set(d => withNotif({ ...d, session: acc.id }, "login", `Logged in — welcome back, ${acc.firstName}!`));
    toast(`Welcome back, ${acc.firstName}!`, "fa-right-to-bracket");
  };

  if (mode === "landing")
    return (
      <div className="pitch relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-8 text-center text-white">
        <div className="gold-stripes absolute inset-0" />
        <div className="fade-up relative">
          <Logo size={112} className="pulse-soft mx-auto" />
          <h1 className="font-display mt-5 text-[2.1rem] uppercase leading-none">PenX <span className="text-[var(--gold)]">Hub</span></h1>
          <p className="mt-2 text-[0.78rem] font-extrabold uppercase tracking-[0.3em] text-[var(--gold)]">Compete, challenge, and rise.</p>
          <p className="mx-auto mt-4 max-w-[280px] text-[0.82rem] font-semibold text-white/75">The community-driven hosting platform for esports leagues & tournaments — mobile, PC and console.</p>
          <button className="btn btn-gold mt-8 w-full max-w-[280px] !py-4 text-[0.95rem]" onClick={() => setMode("register")}>
            <i className="fa-solid fa-futbol" />Start
          </button>
          <button className="mt-4 text-[0.72rem] font-extrabold uppercase tracking-wider text-white/70 underline underline-offset-4" onClick={() => setMode("login")}>
            Already have an account? Login
          </button>
        </div>
      </div>
    );

  if (mode === "login")
    return (
      <div className="pitch relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-10 text-white">
        <div className="gold-stripes absolute inset-0" />
        <div className="card relative w-full max-w-sm self-center !bg-[var(--card)] p-6 text-[var(--ink)]">
          <div className="flex items-center gap-3"><Logo size={42} /><div><h2 className="font-display text-[1.05rem] uppercase">Welcome back</h2><p className="text-[0.66rem] font-bold text-[var(--mut)]">Login to your PenX Hub account</p></div></div>
          <div className="mt-5 space-y-4">
            <Field label="Email"><input className="input" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@club.gg" /></Field>
            <Field label="Password"><input type="password" className="input" value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="••••••••" /></Field>
            <button className="btn btn-forest w-full !py-3.5" onClick={login}><i className="fa-solid fa-right-to-bracket" />Login</button>
            <button className="w-full text-center text-[0.7rem] font-extrabold uppercase tracking-wider text-[var(--forest)]" onClick={() => setMode("register")}>Create a new account</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8">
      <div className="fade-up">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h2 className="font-display text-[1.1rem] uppercase leading-none">Create Account</h2>
            <p className="text-[0.66rem] font-bold text-[var(--mut)]">Compete, challenge, and rise.</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex gap-3">
            <Field label="First name *"><input className="input" value={f.first} onChange={e => setF({ ...f, first: e.target.value })} placeholder="Ada" /></Field>
            <Field label="Last name *"><input className="input" value={f.last} onChange={e => setF({ ...f, last: e.target.value })} placeholder="Okafor" /></Field>
          </div>
          <Field label="@handle" hint="Choose carefully — you can change your names later, but your @handle is permanent. No spaces.">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-[var(--mut)]">@</span>
              <input className="input !pl-9 !pr-11" value={f.handle} onChange={e => setF({ ...f, handle: e.target.value.replace(/\s/g, "") })} placeholder="ada_plays" />
              {f.handle && <i className={`fa-solid ${hOk && !hTaken ? "fa-circle-check text-[#16a34a]" : "fa-circle-xmark text-[#e11d48]"} absolute right-4 top-1/2 -translate-y-1/2`} />}
            </div>
            {f.handle && <span className={`mt-1 block text-[0.68rem] font-bold ${hOk && !hTaken ? "text-[#16a34a]" : "text-[#e11d48]"}`}>{!hOk ? "3–15 characters: a–z, 0–9, underscore" : hTaken ? "Already taken — try another" : "Available!"}</span>}
          </Field>
          <Field label="Country">
            <select className="input" value={f.country} onChange={e => setF({ ...f, country: e.target.value })}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Email"><input className="input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@club.gg" /></Field>
          <div className="flex gap-3">
            <Field label="Password"><input type="password" className="input" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} placeholder="6+ chars" /></Field>
            <Field label="Confirm"><input type="password" className="input" value={f.pw2} onChange={e => setF({ ...f, pw2: e.target.value })} placeholder="Repeat" /></Field>
          </div>
          <Field label="Referral code (optional)" hint={refInvalid ? "Code not found — leave blank to skip." : refOwner ? `You were referred by ${refOwner.firstName} — both of you earn +10 XP!` : "Got a code from a friend? You both earn +10 XP."}>
            <div className="relative">
              <i className={`fa-solid fa-gift absolute left-4 top-1/2 -translate-y-1/2 ${refInvalid ? "text-[#e11d48]" : "text-[var(--gold)]"}`} />
              <input className={`input !pl-11 ${refInvalid ? "!border-[#e11d48]" : ""}`} value={f.refCode} onChange={e => setF({ ...f, refCode: e.target.value })} placeholder="PENX-XXXXXX-0000" />
            </div>
          </Field>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#146c3d]" checked={f.agree} onChange={e => setF({ ...f, agree: e.target.checked })} />
            <span className="text-[0.72rem] font-semibold text-[var(--mut)]">I agree to the <strong className="text-[var(--forest)]">Privacy and Policies</strong> and the PenX Fair-Play code.</span>
          </label>
          <button className="btn btn-forest w-full !py-4" onClick={register}><i className="fa-solid fa-user-plus" />Create Account</button>
          <button className="w-full text-center text-[0.7rem] font-extrabold uppercase tracking-wider text-[var(--forest)]" onClick={() => setMode("login")}>Already have an account? Login</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- layer router ---------------- */
function LayerView({ layer }: { layer: Layer }) {
  switch (layer.kind) {
    case "game": return <GameScreen gameId={layer.gameId} />;
    case "comp": return <CompInfoScreen compId={layer.compId} />;
    case "explore": return <CompExploreScreen compId={layer.compId} />;
    case "team": return <TeamDetailScreen teamId={layer.teamId} />;
    case "user": return <UserDetailsScreen userId={layer.userId} />;
    case "friends": return <FriendsScreen />;
    case "chat": return <ChatScreen chatId={layer.chatId} />;
    case "myteams": return <MyTeamsScreen />;
    case "notifs": return <NotifScreen />;
    case "search": return <SearchScreen />;
    case "leaderboard": return <LeaderboardScreen />;
    case "fixtures": return <MyFixturesScreen />;
    case "editor": return <EditorScreen />;
    case "settings": return <SettingsScreen />;
    case "myhosts": return <MyHostsScreen />;
    case "faq": return <FAQScreen />;
    case "drawer": return <MenuDrawer />;
    default: return null;
  }
}

function Shell() {
  const { db, tab, stack } = useApp();
  if (!db.session) return null;
  return (
    <div className="min-h-dvh">
      {tab === "home" && <HomeScreen />}
      {tab === "games" && <GamesScreen />}
      {tab === "updates" && <UpdatesScreen />}
      {tab === "profile" && <ProfileScreen />}
      {stack.map((l, i) => <LayerView key={`${i}-${l.kind}`} layer={l} />)}
      <TabBar />
    </div>
  );
}

function Root() {
  const { db } = useApp();
  const [splash, setSplash] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), 1500);
    const t2 = window.setTimeout(() => setSplash(false), 2050);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  const authed = db.onboarded && !!db.session;
  return (
    <>
      {authed ? <Shell /> : <AuthFlow />}
      <ToastHost />
      {splash && <Splash leaving={leaving} />}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
