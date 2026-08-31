/* ============================================================
   PenX Hub — Profile, Editor, Settings, My Hosts, FAQ,
   User Details (any user) & Find Friends
   ============================================================ */
import { useMemo, useRef, useState } from "react";
import { BOTS, compStatus, computeXP, countryName, gameById, threadForUser, timeAgo, worldRank } from "../data";
import { identityOf, takenHandles, useApp, validHandle, withNotif } from "../store";
import { Avatar, Confirm, Empty, Field, FlagBadge, LayerScreen, StatusChip, TeamLogo } from "../ui";
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
  const { db, user, set, pushLayer, toast, closeAll } = useApp();
  const [confirm, setConfirm] = useState<"logout" | "delete" | null>(null);
  if (!user) return null;
  const hosted = db.comps.filter(c => c.hostId === user.id).length;
  const xp = computeXP(db, user.id);
  const rank = worldRank(db, user.id);

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
        <div className="mx-auto flex max-w-md items-center justify-between py-3">
          <h1 className="font-display text-[1.05rem] uppercase tracking-wide">Profile</h1>
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
                <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-bolt" />{xp} XP</span>
                <span className="chip bg-white/10 text-white"><i className="fa-solid fa-earth-africa" />World #{rank}</span>
              </div>
              <p className="mt-2 truncate text-[0.62rem] font-bold text-white/60"><i className="fa-solid fa-envelope" /> {user.email}</p>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-2">
          {[["Teams", db.teams.length, "fa-shield-halved"], ["Hosted", hosted, "fa-trophy"], ["Friends", user.friends.length, "fa-user-group"]].map(([l, v, i]) => (
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
            <span className="chip bg-[#241a02]/10">+10 XP per referral</span>
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
          {row("fa-user-plus", "Find Friends", "Search, add & manage requests", () => pushLayer({ kind: "friends" }), "#8f5a1d")}
          {row("fa-gear", "Settings", "Profile, theme & notifications", () => pushLayer({ kind: "settings" }))}
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

/* ============================================================
   USER DETAILS — any user (account or bot): rank, Add/Chat, teams
   ============================================================ */
export function UserDetailsScreen({ userId }: { userId: string }) {
  const { db, user, set, toast, notify, pushLayer } = useApp();
  const id = identityOf(db, userId);
  const teams = useMemo(() => {
    if (!id) return [];
    if (!id.isBot) return db.teams.map(t => ({ name: t.name, logo: t.logo ?? t.color, game: gameById(t.gameId)?.name ?? "", comp: null as { name: string; status: string } | null, teamId: t.id }));
    const out: { name: string; logo: string; game: string; comp: { name: string; status: string } | null; teamId: string | null }[] = [];
    db.comps.forEach(c => c.joined.forEach(j => {
      if (j.ownerId === userId) out.push({ name: j.name, logo: j.logo || "#1d7544", game: gameById(c.gameId)?.name ?? "", comp: { name: c.name, status: compStatus(c) }, teamId: null });
    }));
    return out;
  }, [db, userId, id]);
  if (!id || !user) return null;
  const isMe = id.id === user.id;
  const xp = computeXP(db, id.id);
  const rank = worldRank(db, id.id);
  const isFriend = user.friends.includes(id.id);
  const requested = user.sent.includes(id.id);
  const hasIncoming = user.incoming.some(r => r.fromId === id.id);

  const addFriend = () => {
    set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: [...a.sent.filter(x => x !== id.id), id.id] } : a) }));
    toast(`Friend request sent to ${id.name}`, "fa-user-plus");
    notify("friend", `You sent a friend request to ${id.name}`);
    if (id.isBot) window.setTimeout(() => {
      set(d => withNotif({
        ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: a.sent.filter(x => x !== id.id), friends: a.friends.includes(id.id) ? a.friends : [...a.friends, id.id] } : a),
      }, "friend", `${id.name} accepted your friend request`));
    }, 1600);
  };
  const acceptIncoming = () => {
    set(d => withNotif({
      ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, incoming: a.incoming.filter(r => r.fromId !== id.id), friends: [...a.friends, id.id] } : a),
    }, "friend", `You and ${id.name} are now friends`));
    toast(`${id.name} added to friends`, "fa-user-group");
  };
  const openChat = () => {
    const chatId = `ch-${id.id}`;
    set(d => d.chats.some(c => c.userId === id.id) ? d : { ...d, chats: [...d.chats, threadForUser({ id: id.id, name: id.name, handle: id.handle, country: id.country, photo: id.photo })] });
    pushLayer({ kind: "chat", chatId });
  };

  return (
    <LayerScreen title={id.name} sub={`@${id.handle}`}>
      <div className="stagger space-y-4">
        <div className="pitch gold-stripes relative overflow-hidden rounded-2xl p-5 text-white">
          <div className="flex items-center gap-4">
            <Avatar photo={id.photo} name={id.name} country={id.country} size={76} ring />
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-[1.15rem] uppercase leading-tight">{id.name}{isMe && <span className="ml-2 chip bg-[var(--gold)] text-[0.55rem] text-[#241a02]">You</span>}</h2>
              <div className="mt-1 flex items-center gap-2 text-[0.7rem] font-bold text-white/80">
                <FlagBadge country={id.country} size={17} />{countryName(id.country)}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-bolt" />{xp} XP</span>
                <span className="chip bg-white/12 text-white"><i className="fa-solid fa-earth-africa" />World #{rank}</span>
                <span className="chip bg-white/12 text-white"><i className="fa-solid fa-shield-halved" />{teams.length} teams</span>
              </div>
            </div>
          </div>
          {!isMe && (
            <div className="relative mt-4 flex gap-2.5">
              {hasIncoming ? (
                <>
                  <button className="btn btn-gold flex-1 !py-2.5 text-[0.76rem]" onClick={acceptIncoming}><i className="fa-solid fa-check" />Accept Request</button>
                  <button className="btn !py-2.5 text-[0.76rem] text-white" style={{ background: "rgb(255 255 255/.14)" }} onClick={openChat}><i className="fa-solid fa-comment" />Chat</button>
                </>
              ) : isFriend ? (
                <>
                  <button className="btn btn-gold flex-1 !py-2.5 text-[0.76rem]" onClick={openChat}><i className="fa-solid fa-comment" />Chat</button>
                  <button className="btn !py-2.5 text-[0.76rem] text-white" style={{ background: "rgb(192 57 43 / .85)" }} onClick={() => {
                    set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, friends: a.friends.filter(x => x !== id.id) } : a) }));
                    toast(`${id.name} removed from friends`, "fa-user-minus");
                  }}><i className="fa-solid fa-user-minus" />Remove</button>
                </>
              ) : requested ? (
                <>
                  <span className="btn flex-1 !py-2.5 text-[0.76rem] text-white/80" style={{ background: "rgb(255 255 255 / .12)" }}><i className="fa-solid fa-hourglass-half" />Request Sent</span>
                  <button className="btn !py-2.5 text-[0.76rem] text-white" style={{ background: "rgb(255 255 255/.14)" }} onClick={openChat}><i className="fa-solid fa-comment" />Chat</button>
                </>
              ) : (
                <>
                  <button className="btn btn-gold flex-1 !py-2.5 text-[0.76rem]" onClick={addFriend}><i className="fa-solid fa-user-plus" />Add Friend</button>
                  <button className="btn !py-2.5 text-[0.76rem] text-white" style={{ background: "rgb(255 255 255/.14)" }} onClick={openChat}><i className="fa-solid fa-comment" />Chat</button>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-shield-halved mr-1.5 text-[var(--forest)]" />{isMe ? "My Teams" : "Teams"}</h3>
          {teams.length === 0 ? (
            <Empty icon="fa-shield-halved" title="No teams yet" sub={isMe ? "Create a team from the Games page to start competing." : "This manager hasn't created a team yet."} />
          ) : (
            <div className="card divide-y divide-[var(--line)]">
              {teams.map((t, i) => (
                <button key={i} className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => t.teamId && pushLayer({ kind: "team", teamId: t.teamId })}>
                  <TeamLogo logo={t.logo.startsWith("data:") ? t.logo : null} color={t.logo.startsWith("data:") ? "#1d7544" : t.logo} name={t.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.8rem] font-extrabold">{t.name}</div>
                    <div className="text-[0.64rem] font-bold text-[var(--mut)]">
                      {t.game}{t.comp ? ` · ${t.comp.name}` : ""}
                    </div>
                  </div>
                  {t.comp && <StatusChip status={t.comp.status} />}
                  {t.teamId && <i className="fa-solid fa-chevron-right text-[0.6rem] text-[var(--mut)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayerScreen>
  );
}

/* ============================================================
   FIND FRIENDS — search · requests · friends
   ============================================================ */
export function FriendsScreen() {
  const { db, user, set, toast, notify, pushLayer } = useApp();
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  if (!user) return null;

  const allUsers = [
    ...BOTS.map(b => ({ id: b.id, name: b.name, handle: b.handle, country: b.country, photo: null as string | null, isBot: true })),
    ...db.accounts.filter(a => a.id !== user.id).map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, handle: a.handle, country: a.country, photo: a.photo, isBot: false })),
  ];
  const isFriend = (id: string) => user.friends.includes(id);
  const isRequested = (id: string) => user.sent.includes(id);
  const requests = user.incoming;
  const friends = allUsers.filter(u => isFriend(u.id));
  const discover = ql ? allUsers.filter(u => (u.name.toLowerCase().includes(ql) || u.handle.toLowerCase().includes(ql)) && !isFriend(u.id)) : allUsers.filter(u => !isFriend(u.id) && !isRequested(u.id)).slice(0, 6);

  const add = (u: { id: string; name: string; isBot: boolean }) => {
    set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: [...a.sent.filter(x => x !== u.id), u.id] } : a) }));
    toast(`Friend request sent to ${u.name}`, "fa-user-plus");
    notify("friend", `You sent a friend request to ${u.name}`);
    if (u.isBot) window.setTimeout(() => {
      set(d => withNotif({
        ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: a.sent.filter(x => x !== u.id), friends: a.friends.includes(u.id) ? a.friends : [...a.friends, u.id] } : a),
      }, "friend", `${u.name} accepted your friend request`));
    }, 1600);
  };
  const accept = (fromId: string, fromName: string) => {
    set(d => withNotif({
      ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, incoming: a.incoming.filter(r => r.fromId !== fromId), friends: [...a.friends, fromId] } : a),
    }, "friend", `You and ${fromName} are now friends`));
    toast(`${fromName} added to friends`, "fa-user-group");
  };
  const reject = (fromId: string, fromName: string) => {
    set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, incoming: a.incoming.filter(r => r.fromId !== fromId) } : a) }));
    toast(`Request from ${fromName} removed`, "fa-xmark");
  };
  const openChat = (u: { id: string; name: string; handle: string; country: string; photo: string | null }) => {
    const chatId = `ch-${u.id}`;
    set(d => d.chats.some(c => c.userId === u.id) ? d : { ...d, chats: [...d.chats, threadForUser({ id: u.id, name: u.name, handle: u.handle, country: u.country, photo: u.photo })] });
    pushLayer({ kind: "chat", chatId });
  };

  const userRow = (u: typeof allUsers[number], action: React.ReactNode) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={() => pushLayer({ kind: "user", userId: u.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar photo={u.photo} name={u.name} country={u.country} size={42} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.82rem] font-extrabold">{u.name}</div>
          <div className="text-[0.66rem] font-bold text-[var(--mut)]">@{u.handle} · {computeXP(db, u.id)} XP</div>
        </div>
      </button>
      {action}
    </div>
  );

  return (
    <LayerScreen title="Find Friends" sub="Search managers, accept requests, build your squad">
      <div className="relative mb-4">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or @handle…" className="input !pl-11" />
      </div>
      <div className="space-y-5">
        {!ql && requests.length > 0 && (
          <section>
            <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-inbox mr-1.5 text-[#e11d48]" />Friend Requests · {requests.length}</h3>
            <div className="card divide-y divide-[var(--line)]">
              {requests.map(r => (
                <div key={r.fromId} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => pushLayer({ kind: "user", userId: r.fromId })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar photo={null} name={r.fromName} country={r.fromCountry} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.82rem] font-extrabold">{r.fromName}</div>
                      <div className="text-[0.66rem] font-bold text-[var(--mut)]">@{r.fromHandle} · {timeAgo(r.time)}</div>
                    </div>
                  </button>
                  <button className="btn btn-forest !px-3 !py-1.5 text-[0.64rem]" onClick={() => accept(r.fromId, r.fromName)}><i className="fa-solid fa-check" />Accept</button>
                  <button className="btn !px-3 !py-1.5 text-[0.64rem] text-white" style={{ background: "#c0392b" }} onClick={() => reject(r.fromId, r.fromName)}>Reject</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!ql && friends.length > 0 && (
          <section>
            <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-user-group mr-1.5 text-[var(--forest)]" />Your Friends · {friends.length}</h3>
            <div className="card divide-y divide-[var(--line)]">
              {friends.map(u => userRow(u, <button className="btn btn-forest !px-3 !py-1.5 text-[0.64rem]" onClick={() => openChat(u)}><i className="fa-solid fa-comment" />Chat</button>))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-earth-africa mr-1.5 text-[var(--gold)]" />{ql ? "Search results" : "Discover managers"}</h3>
          {discover.length === 0 ? (
            <Empty icon="fa-user-slash" title="No managers found" sub={`Nothing matches "${q}".`} />
          ) : (
            <div className="card divide-y divide-[var(--line)]">
              {discover.map(u => userRow(u, isRequested(u.id)
                ? <span className="chip bg-[color-mix(in_srgb,var(--mut)_14%,transparent)] text-[var(--mut)]">Requested</span>
                : <button className="btn btn-ghost !px-3 !py-1.5 text-[0.64rem]" onClick={() => add(u)}><i className="fa-solid fa-user-plus" />Add</button>))}
            </div>
          )}
        </section>
      </div>
    </LayerScreen>
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
    set(d => withNotif({
      ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, firstName: first.trim(), lastName: last.trim(), dob, phone, location } : a),
    }, "profile", "You updated your profile details"));
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

/* ---------------- Settings (now with notification toggle) ---------------- */
export function SettingsScreen() {
  const { db, user, set, pushLayer, toast } = useApp();
  const themes: { id: "light" | "dark" | "system"; label: string; sub: string; icon: string }[] = [
    { id: "light", label: "Dark Mode = Off", sub: "Forest light theme", icon: "fa-sun" },
    { id: "dark", label: "Dark Mode = On", sub: "Midnight pitch theme", icon: "fa-moon" },
    { id: "system", label: "Follow System", sub: "Matches your device", icon: "fa-circle-half-stroke" },
  ];
  const notifOn = user?.notifEnabled !== false;
  return (
    <LayerScreen title="Settings" sub="Profile, notifications & appearance">
      <div className="space-y-4">
        <div className="card divide-y divide-[var(--line)]">
          <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => pushLayer({ kind: "editor" })}>
            <i className="fa-solid fa-user-pen w-5 text-[var(--forest)]" />
            <span className="flex-1 text-[0.84rem] font-extrabold">Edit Profile</span>
            <i className="fa-solid fa-chevron-right text-[0.65rem] text-[var(--mut)]" />
          </button>
        </div>

        {/* notifications toggle */}
        <div>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Notifications</h3>
          <div className="card">
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => {
              const next = !notifOn;
              set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user?.id ? { ...a, notifEnabled: next } : a) }));
              toast(next ? "Notifications on" : "Notifications muted", "fa-bell");
            }}>
              <i className={`fa-solid ${notifOn ? "fa-bell" : "fa-bell-slash"} w-5 ${notifOn ? "text-[var(--forest)]" : "text-[var(--mut)]"}`} />
              <span className="flex-1">
                <span className="block text-[0.82rem] font-extrabold">App notifications</span>
                <span className="block text-[0.62rem] font-bold text-[var(--mut)]">{notifOn ? "Joins, hosting, friends & results ring the bell" : "Muted — nothing lands in your bell"}</span>
              </span>
              <span className={`relative h-6 w-11 rounded-full transition-colors ${notifOn ? "bg-[var(--forest)]" : "bg-[var(--line)]"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${notifOn ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          </div>
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
  ["What is Input Result?", "Both teams type the score under a fixture before 11:59 PM on matchday. Matching scores confirm the match instantly; mismatches are forwarded to the host for review."],
  ["What happens if a result isn't confirmed?", "After 11:59 PM the host is notified that the match wasn't confirmed, and can chat both teams from Host Tools to settle it."],
  ["How does XP work?", "Win 20 · Draw 10 · Loss 5 · Referral 10. Friendlies pay Win 5 · Draw 3 · Loss 2. The leaderboard ranks managers by total XP."],
  ["What do the serial numbers mean?", "Every competition gets a unique Co(MM)(YYYY)##### serial — search it in the Games search bar or global search to jump straight to it."],
  ["How do private competitions work?", "Users tap Request To Join. The host gets a notification and accepts or rejects each request from Host Tools."],
  ["Can I change my @handle?", "No — handles are permanent. You can change your first/last name, photo and details anytime from Settings → Edit Profile."],
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
              <i className={`fa-solid fa-chevron-${open === i ? "up" : "down"} text-[0.65rem] text-[var(--mut)]" `} />
            </button>
            {open === i && <p className="fade-up border-t border-[var(--line)] px-4 py-3 text-[0.76rem] font-semibold leading-relaxed text-[var(--mut)]">{a}</p>}
          </div>
        ))}
      </div>
    </LayerScreen>
  );
}
