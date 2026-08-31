/* ============================================================
   PenX Hub — Home, Search, Notifications, Leaderboard, Fixtures
   ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Competition, Notif } from "../data";
import { BOTS, GAMES, buildFixtures, compStatus, computeXP, countryName, fmtClock, fmtDay, gameById, matchdayLabel, timeAgo, worldRank } from "../data";
import { identityOf, useApp } from "../store";
import { Avatar, Empty, FlagBadge, LayerScreen, Logo, Modal, Seg, StatusChip, TeamLogo } from "../ui";

/* ---------------- shared competition card ---------------- */
export function CompCard({ comp, onOpen }: { comp: Competition; onOpen: () => void }) {
  const game = gameById(comp.gameId);
  const status = compStatus(comp);
  return (
    <button onClick={onOpen} className="card group w-full overflow-hidden text-left transition-transform active:scale-[0.98]">
      <div className="pitch relative flex h-20 items-center justify-between px-4" style={{ backgroundImage: `linear-gradient(rgb(11 61 34 / .55), rgb(6 40 23 / .8)), url(${game?.banner ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="min-w-0">
          <div className="font-display truncate text-[0.95rem] uppercase text-white">{comp.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.66rem] font-bold text-white/75">
            <i className="fa-solid fa-hashtag text-[var(--gold)]" />{comp.serial}
            <span className="opacity-60">·</span>{game?.name}
          </div>
        </div>
        <span className="chip bg-[var(--gold)] text-[#241a02]">{comp.type}</span>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 text-[0.72rem] font-bold text-[var(--mut)]">
          <i className="fa-solid fa-shield-halved text-[var(--forest)]" />
          <span>{comp.joined.length}/{comp.capacity} teams</span>
          <span className="opacity-50">·</span>
          <i className="fa-regular fa-calendar" />
          <span>{fmtDay(new Date(comp.startDate + "T12:00").getTime())}</span>
          {comp.access === "Private" && <span className="chip !px-2 !py-0.5 bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[#7a5a06] dark:text-[var(--gold)]"><i className="fa-solid fa-lock text-[0.55rem]" />Private</span>}
        </div>
        <StatusChip status={status} />
      </div>
    </button>
  );
}

/* ---------------- promo slider ---------------- */
const SLIDES = [
  { key: "Compete", icon: "fa-trophy", title: "COMPETE", body: "Host or join leagues & tournaments across mobile, PC and console.", cta: "Open Games", tab: "games" as const },
  { key: "Community", icon: "fa-users", title: "COMMUNITY", body: "Chat with managers, share moments and react with stickers.", cta: "See Updates", tab: "updates" as const },
  { key: "Refer", icon: "fa-user-plus", title: "REFER & RISE", body: "Invite your squad — every referral earns +10 XP on PenX Hub.", cta: "Copy my code", tab: null },
];
function PromoSlider() {
  const { goTab, user, toast } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const lastTouch = useRef(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (Date.now() - lastTouch.current < 6500) return;
      const next = (idx + 1) % SLIDES.length;
      setIdx(next);
      const el = ref.current;
      if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(t);
  }, [idx]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    lastTouch.current = Date.now();
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  const copyRef = () => {
    const code = user?.referral ?? "";
    navigator.clipboard?.writeText(code).then(() => toast("Referral code copied", "fa-copy")).catch(() => toast(code, "fa-copy"));
  };
  return (
    <div className="relative">
      <div ref={ref} onScroll={onScroll} onPointerDown={() => (lastTouch.current = Date.now())}
        className="no-scrollbar snap-x snap-mandatory overflow-x-auto rounded-2xl">
        <div className="flex">
          {SLIDES.map((s, i) => (
            <div key={s.key} className={`w-full shrink-0 snap-start ${i === 2 ? "bg-[linear-gradient(135deg,#f0c95c,#d9a421_55%,#a97c0e)]" : "pitch"}`}>
              <div className={`gold-stripes relative flex min-h-[148px] flex-col justify-between rounded-2xl p-5 ${i === 2 ? "text-[#241a02]" : "text-white"}`}>
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 2 ? "bg-[#241a02]/10" : "bg-white/10"}`}>
                    <i className={`fa-solid ${s.icon} text-lg ${i === 2 ? "" : "text-[var(--gold)]"}`} />
                  </span>
                  <span className="font-display text-[0.62rem] uppercase tracking-[0.3em] opacity-60">PenX Hub</span>
                </div>
                <div>
                  <div className="font-display text-[1.28rem] uppercase leading-tight">{s.title}</div>
                  <p className={`mt-1 max-w-[250px] text-[0.74rem] font-semibold ${i === 2 ? "text-[#241a02]/75" : "text-white/75"}`}>{s.body}</p>
                  <button onClick={() => (s.tab ? goTab(s.tab) : copyRef())}
                    className={`btn mt-3 !px-4 !py-2 text-[0.74rem] ${i === 2 ? "bg-[#0b3d22] text-white" : "btn-gold"}`}>
                    {s.cta}<i className={`fa-solid ${i === 2 ? "fa-copy" : "fa-arrow-right"}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button key={s.key} aria-label={`Slide ${i + 1}`} onClick={() => { setIdx(i); const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); }}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-[var(--forest)]" : "w-1.5 bg-[var(--line)]"}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Home screen ---------------- */
export function HomeScreen() {
  const { db, user, pushLayer, goTab, unread } = useApp();
  const [compTab, setCompTab] = useState<"all" | "Upcoming" | "Ongoing" | "Completed">("all");
  const [policy, setPolicy] = useState(false);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const myTeamIds = db.teams.map(t => t.id);
  const myActive = db.comps.filter(c => c.joined.some(j => myTeamIds.includes(j.teamId)) && compStatus(c) !== "Completed");
  const nextFixture = useMemo(() => {
    for (const c of myActive) {
      const fx = buildFixtures(c).find(f => !f.played && (myTeamIds.includes(f.homeId ?? "") || myTeamIds.includes(f.awayId ?? "")));
      if (fx) return { comp: c, fx };
    }
    return null;
  }, [db.comps, db.teams]);

  const xp = user ? computeXP(db, user.id) : 0;
  const comps = db.comps.filter(c => compTab === "all" || compStatus(c) === compTab).slice(0, 5);

  return (
    <div className="mx-auto max-w-md px-4 pb-32">
      {/* sticky brand header */}
      <div className="sticky-bar -mx-4 px-4">
        <div className="mx-auto flex max-w-md items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-[1.05rem] uppercase tracking-wide">PenX <span className="text-[var(--forest)]">Hub</span></span>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="icon-btn" aria-label="Search" onClick={() => pushLayer({ kind: "search" })}><i className="fa-solid fa-magnifying-glass" /></button>
            <button className="icon-btn relative" aria-label="Notifications" onClick={() => pushLayer({ kind: "notifs" })}>
              <i className="fa-solid fa-bell" />
              {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#e11d48] ring-2 ring-[var(--card)]" />}
            </button>
          </div>
        </div>
      </div>

      {/* greeting scoreboard */}
      <div className="stagger mt-4 space-y-4">
        <div className="pitch gold-stripes relative overflow-hidden rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-[var(--gold)]">{greet} ⚡</p>
              <h1 className="font-display mt-1 truncate text-[1.5rem] uppercase leading-none">{user?.firstName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-white/80">
                <button className="underline decoration-white/30 underline-offset-2" onClick={() => user && pushLayer({ kind: "user", userId: user.id })}>@{user?.handle}</button>
                <span className="flex items-center gap-1.5"><FlagBadge country={user?.country ?? ""} size={18} />{countryName(user?.country ?? "")}</span>
              </div>
            </div>
            <Avatar photo={user?.photo ?? null} name={`${user?.firstName} ${user?.lastName}`} country={user?.country} size={62} ring />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-bolt" />{xp} XP</span>
            {user && <span className="chip bg-white/10 text-white"><i className="fa-solid fa-earth-africa" />World #{worldRank(db, user.id)}</span>}
            <span className="chip bg-white/10 text-white"><i className="fa-solid fa-ranking-star" />Season 26</span>
          </div>
        </div>

        <PromoSlider />

        {/* upcoming fixture — only after joining a competition */}
        {nextFixture && (
          <button onClick={() => pushLayer({ kind: "fixtures" })} className="card w-full overflow-hidden text-left transition-transform active:scale-[0.98]">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Upcoming Fixture</span>
              <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]"><i className="fa-solid fa-stopwatch" />{fmtDay(nextFixture.fx.date)} · {fmtClock(nextFixture.fx.date)}</span>
            </div>
            <div className="px-4 pb-1 pt-1 text-[0.78rem] font-bold text-[var(--forest)]">{nextFixture.comp.name}</div>
            <div className="flex items-center justify-between gap-2 px-4 pb-4">
              <FixtureSide name={nextFixture.fx.homeName} logo={nextFixture.fx.homeLogo} country={nextFixture.fx.homeCountry} mine={myTeamIds.includes(nextFixture.fx.homeId ?? "")} right />
              <span className="font-display px-1 text-[0.8rem] text-[var(--gold)]">VS</span>
              <FixtureSide name={nextFixture.fx.awayName} logo={nextFixture.fx.awayLogo} country={nextFixture.fx.awayCountry} mine={myTeamIds.includes(nextFixture.fx.awayId ?? "")} />
            </div>
            <div className="border-t border-dashed border-[var(--line)] px-4 py-2 text-center text-[0.66rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">
              Tap for all my fixtures <i className="fa-solid fa-chevron-right" />
            </div>
          </button>
        )}

        {/* quick actions */}
        <div>
          <h2 className="font-display mb-3 text-[0.85rem] uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Join", icon: "fa-user-plus", bg: "linear-gradient(135deg,#2f8f55,#0b3d22)", fn: () => goTab("games") },
              { label: "Community", icon: "fa-users", bg: "linear-gradient(135deg,#178a99,#0e5b63)", fn: () => goTab("updates") },
              { label: "My Teams", icon: "fa-shield-halved", bg: "linear-gradient(135deg,#e9c25a,#a97c0e)", fn: () => pushLayer({ kind: "myteams" }) },
              { label: "Board", icon: "fa-ranking-star", bg: "linear-gradient(135deg,#7d55b8,#5b3a8f)", fn: () => pushLayer({ kind: "leaderboard" }) },
            ].map(a => (
              <button key={a.label} onClick={a.fn} className="group flex flex-col items-center gap-1.5">
                <span className="ring-gold flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform group-active:scale-90" style={{ background: a.bg }}>
                  <i className={`fa-solid ${a.icon} text-xl`} />
                </span>
                <span className="text-[0.64rem] font-extrabold uppercase tracking-wide text-[var(--mut)]">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* competitions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[0.85rem] uppercase tracking-wider">Competitions</h2>
            <button onClick={() => goTab("games")} className="text-[0.7rem] font-extrabold uppercase tracking-wide text-[var(--forest)]">More <i className="fa-solid fa-arrow-right" /></button>
          </div>
          <div className="mb-3"><Seg small options={[{ id: "all", label: "All" }, { id: "Upcoming", label: "Upcoming" }, { id: "Ongoing", label: "Ongoing" }, { id: "Completed", label: "Completed" }]} value={compTab} onChange={setCompTab} /></div>
          {comps.length === 0 ? (
            <Empty icon="fa-trophy" title="Nothing here yet" sub="No competitions in this view right now." />
          ) : (
            <div className="space-y-3">{comps.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
          )}
        </div>

        {/* footer */}
        <div className="pitch rounded-2xl p-5 text-center text-white">
          <div className="flex justify-center"><Logo size={46} /></div>
          <p className="font-display mt-2 text-[0.9rem] uppercase">Compete, challenge, and rise.</p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[0.7rem] font-semibold text-white/70">PenX Hub is the community-driven hosting platform for grassroots esports — leagues, tournaments, rankings and rivalries.</p>
          <div className="mt-3 space-y-1 text-[0.72rem] font-bold text-white/85">
            <div><i className="fa-solid fa-envelope text-[var(--gold)]" /> support@penxhub.gg</div>
            <div><i className="fa-solid fa-globe text-[var(--gold)]" /> penxhub.gg</div>
          </div>
          <button onClick={() => setPolicy(true)} className="mt-3 text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--gold)] underline underline-offset-4">Privacy & Policy</button>
          <div className="mt-4 flex justify-center gap-4 text-lg text-white/85">
            {["fa-x-twitter", "fa-instagram", "fa-discord", "fa-youtube", "fa-tiktok"].map(s => (
              <a key={s} href="#" onClick={e => e.preventDefault()} aria-label={s}><i className={`fa-brands ${s} transition-transform hover:scale-110`} /></a>
            ))}
          </div>
          <p className="mt-4 text-[0.62rem] font-bold text-white/50">© 2026 PenX Hub. All rights reserved.</p>
        </div>
      </div>

      {policy && (
        <Modal title="Privacy & Policy" onClose={() => setPolicy(false)}>
          <div className="space-y-3 text-[0.8rem] font-semibold text-[var(--mut)]">
            <p><strong className="text-[var(--ink)]">1 · Your data.</strong> Profile, teams and competitions are stored locally on your device. Nothing leaves your phone.</p>
            <p><strong className="text-[var(--ink)]">2 · Fair play.</strong> Result manipulation, account sharing or abusive conduct leads to removal from competitions.</p>
            <p><strong className="text-[var(--ink)]">3 · Prizes.</strong> Prize-based competitions are under maintenance and can't be hosted yet.</p>
            <p><strong className="text-[var(--ink)]">4 · Disputes.</strong> In Input-Result competitions both teams type the score; mismatches are forwarded to the host, whose decision is final.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FixtureSide({ name, logo, country, mine, right = false }: { name: string; logo: string; country: string; mine: boolean; right?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <TeamLogo logo={logo || null} color="#1d7544" name={name} size={38} />
      <div className="min-w-0">
        <div className={`truncate text-[0.76rem] font-extrabold ${mine ? "text-[var(--forest)]" : ""}`}>{name}{mine && <i className="fa-solid fa-star text-[0.55rem] text-[var(--gold)] ml-1" />}</div>
        <div className="flex items-center gap-1 text-[0.62rem] font-bold text-[var(--mut)]"><FlagBadge country={country} size={13} />{countryName(country)}</div>
      </div>
    </div>
  );
}

/* ---------------- My Fixtures screen ---------------- */
export function MyFixturesScreen() {
  const { db, pushLayer } = useApp();
  const myTeamIds = db.teams.map(t => t.id);
  const mine = db.comps.filter(c => c.joined.some(j => myTeamIds.includes(j.teamId)) && compStatus(c) !== "Completed");
  return (
    <LayerScreen title="My Fixtures" sub="All upcoming matches of my teams">
      {mine.length === 0 && <Empty icon="fa-calendar-xmark" title="No fixtures" sub="Join a competition to see your matchdays here." />}
      <div className="space-y-5">
        {mine.map(c => {
          const groups = new Map<number, ReturnType<typeof buildFixtures>>();
          buildFixtures(c).filter(f => myTeamIds.includes(f.homeId ?? "") || myTeamIds.includes(f.awayId ?? "")).forEach(f => {
            groups.set(f.matchday, [...(groups.get(f.matchday) ?? []), f]);
          });
          return (
            <div key={c.id} className="card overflow-hidden">
              <button onClick={() => pushLayer({ kind: "explore", compId: c.id })} className="pitch flex w-full items-center justify-between px-4 py-3 text-left">
                <div>
                  <div className="font-display text-[0.82rem] uppercase text-white">{c.name}</div>
                  <div className="text-[0.62rem] font-bold text-white/70"><i className="fa-solid fa-hashtag text-[var(--gold)]" /> {c.serial} · {c.type}</div>
                </div>
                <span className="text-[0.68rem] font-extrabold uppercase text-[var(--gold)]">Stats <i className="fa-solid fa-chevron-right" /></span>
              </button>
              {[...groups.entries()].sort((a, b) => a[0] - b[0]).map(([md, fxs]) => (
                <div key={md} className="border-t border-[var(--line)] px-4 py-3">
                  <div className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[var(--mut)]">{matchdayLabel(c.frequency)} {md}</div>
                  {fxs.map(f => (
                    <div key={f.id} className="mb-2 flex items-center justify-between gap-2 last:mb-0">
                      <FixtureSide name={f.homeName} logo={f.homeLogo} country={f.homeCountry} mine={myTeamIds.includes(f.homeId ?? "")} right />
                      <span className="font-display text-[0.68rem] text-[var(--gold)]">{f.played ? `${f.hs}–${f.as}` : fmtDay(f.date)}</span>
                      <FixtureSide name={f.awayName} logo={f.awayLogo} country={f.awayCountry} mine={myTeamIds.includes(f.awayId ?? "")} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </LayerScreen>
  );
}

/* ---------------- Search screen (grouped: Users · Competitions · Games) ---------------- */
export function SearchScreen() {
  const { db, pushLayer } = useApp();
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const users = ql ? [...BOTS.map(b => ({ id: b.id, name: b.name, handle: b.handle, country: b.country, photo: null as string | null })), ...db.accounts.filter(a => a.id !== db.session).map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, handle: a.handle, country: a.country, photo: a.photo }))].filter(u => u.name.toLowerCase().includes(ql) || u.handle.toLowerCase().includes(ql)).slice(0, 6) : [];
  const comps = ql ? db.comps.filter(c => c.name.toLowerCase().includes(ql) || c.serial.toLowerCase().includes(ql)).slice(0, 6) : [];
  const games = ql ? GAMES.filter(g => g.name.toLowerCase().includes(ql)).slice(0, 6) : [];
  const noResults = ql && users.length === 0 && comps.length === 0 && games.length === 0;
  return (
    <LayerScreen title="Search" sub="Grouped by users · competitions · games">
      <div className="relative mb-4">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Try a name, @handle or Co-serial…" className="input !pl-11" />
      </div>
      {!ql && (
        <div className="card flex flex-col items-center px-6 py-8 text-center">
          <i className="fa-solid fa-magnifying-glass text-2xl text-[var(--forest)]" />
          <p className="mt-3 text-[0.8rem] font-bold text-[var(--mut)]">Search users, usernames, competitions, games — or paste a serial like <span className="text-[var(--forest)]">{db.comps[0]?.serial}</span></p>
        </div>
      )}
      <div className="space-y-5">
        {users.length > 0 && (
          <section>
            <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-user mr-1.5 text-[var(--forest)]" />Users</h3>
            <div className="card divide-y divide-[var(--line)]">
              {users.map(u => (
                <button key={u.id} className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => pushLayer({ kind: "user", userId: u.id })}>
                  <Avatar photo={u.photo} name={u.name} country={u.country} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.82rem] font-extrabold">{u.name}</div>
                    <div className="text-[0.68rem] font-bold text-[var(--mut)]">@{u.handle} · {computeXP(db, u.id)} XP</div>
                  </div>
                  <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]">View</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {comps.length > 0 && (
          <section>
            <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-trophy mr-1.5 text-[var(--gold)]" />Competitions</h3>
            <div className="space-y-3">{comps.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
          </section>
        )}
        {games.length > 0 && (
          <section>
            <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-gamepad mr-1.5 text-[var(--forest)]" />Games</h3>
            <div className="card divide-y divide-[var(--line)]">
              {games.map(g => (
                <button key={g.id} className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => pushLayer({ kind: "game", gameId: g.id })}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: g.accent }}><i className="fa-solid fa-futbol" /></span>
                  <div className="flex-1">
                    <div className="text-[0.82rem] font-extrabold">{g.name}</div>
                    <div className="text-[0.68rem] font-bold text-[var(--mut)]">{g.platform} · {g.category}</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[var(--mut)]" />
                </button>
              ))}
            </div>
          </section>
        )}
        {noResults && <Empty icon="fa-circle-question" title="No results" sub={`Nothing matches "${q}". Try a serial, team or username.`} />}
      </div>
    </LayerScreen>
  );
}

/* ---------------- Notifications screen (CLEAR + swipe-to-delete) ---------------- */
const NOTIF_ICON: Record<Notif["kind"], string> = {
  join: "fa-user-plus", host: "fa-trophy", profile: "fa-user-pen", login: "fa-right-to-bracket",
  request: "fa-envelope-open-text", system: "fa-bullhorn", friend: "fa-user-group", friendly: "fa-gamepad", result: "fa-futbol",
};
function NotifRow({ n, onDelete }: { n: Notif; onDelete: () => void }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null }>({ x: 0, y: 0, horizontal: null });
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-end bg-[linear-gradient(90deg,#c0392b,#7b1e12)] px-5 text-white">
        <i className="fa-solid fa-trash-can" />
      </div>
      <div
        className="relative flex items-start gap-3 bg-[var(--card)] px-4 py-3.5 transition-transform"
        style={{ transform: `translateX(${dx}px)`, transitionDuration: dx === 0 ? "200ms" : "0ms" }}
        onPointerDown={e => { start.current = { x: e.clientX, y: e.clientY, horizontal: null }; }}
        onPointerMove={e => {
          const sx = e.clientX - start.current.x, sy = e.clientY - start.current.y;
          if (start.current.horizontal === null && (Math.abs(sx) > 8 || Math.abs(sy) > 8)) start.current.horizontal = Math.abs(sx) > Math.abs(sy);
          if (start.current.horizontal) setDx(Math.max(0, sx));
        }}
        onPointerUp={() => { if (dx > 90) onDelete(); else setDx(0); start.current.horizontal = null; }}
        onPointerLeave={() => { setDx(0); start.current.horizontal = null; }}
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--forest)_12%,transparent)]">
          <i className={`fa-solid ${NOTIF_ICON[n.kind]} text-[var(--forest)]`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8rem] font-bold leading-snug">{n.text}</p>
          <p className="mt-0.5 text-[0.64rem] font-extrabold uppercase tracking-wide text-[var(--mut)]">{timeAgo(n.time)}</p>
        </div>
      </div>
    </div>
  );
}
export function NotifScreen() {
  const { db, set } = useApp();
  useEffect(() => {
    set(d => ({ ...d, notifs: d.notifs.map(n => ({ ...n, read: true })) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <LayerScreen title="Notifications" sub="Joins, hosting, friends & results"
      right={db.notifs.length > 0 ? (
        <button className="btn btn-ghost !px-3.5 !py-2 text-[0.66rem]" onClick={() => set(d => ({ ...d, notifs: [] }))}>
          <i className="fa-solid fa-broom" />CLEAR
        </button>
      ) : undefined}>
      {db.notifs.length === 0 ? (
        <Empty icon="fa-bell-slash" title="No notifications" sub="Activity from joins, hosting, friends and results lands here. Swipe a row right to delete it." />
      ) : (
        <>
          <p className="mb-2 text-[0.64rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-hand-pointer mr-1 text-[var(--forest)]" />Swipe a notification right to delete it.</p>
          <div className="card divide-y divide-[var(--line)] overflow-hidden">
            {db.notifs.map(n => (
              <NotifRow key={n.id} n={n} onDelete={() => set(d => ({ ...d, notifs: d.notifs.filter(x => x.id !== n.id) }))} />
            ))}
          </div>
        </>
      )}
    </LayerScreen>
  );
}

/* ---------------- Leaderboard screen (ranked by XP) ---------------- */
export function LeaderboardScreen() {
  const { db, user } = useApp();
  const [scope, setScope] = useState<"world" | "country" | "game">("world");
  const [gameF, setGameF] = useState<string>("dls");

  const allUsers = useMemo(() => [
    ...db.accounts.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, handle: a.handle, country: a.country, photo: a.photo })),
    ...BOTS.map(b => ({ id: b.id, name: b.name, handle: b.handle, country: b.country, photo: null as string | null })),
  ], [db.accounts]);

  /* which games each user competes in (own teams for accounts, owned squads in comps for bots) */
  const gamesOf = (userId: string): Set<string> => {
    const out = new Set<string>();
    db.teams.forEach(t => { if (db.accounts.find(a => a.id === userId)) out.add(t.gameId); });
    db.comps.forEach(c => c.joined.forEach(j => { if (j.ownerId === userId) out.add(c.gameId); }));
    return out;
  };

  const rows = useMemo(() => {
    const ranked = allUsers.map(u => ({ ...u, xp: computeXP(db, u.id) })).sort((a, b) => b.xp - a.xp);
    return ranked.filter(u => {
      if (scope === "country") return u.country === user?.country;
      if (scope === "game") return gamesOf(u.id).has(gameF);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers, db.comps, db.teams, db.friendlies, scope, gameF, user?.country]);

  const medal = ["#d9a421", "#9ca3af", "#b45309"];
  return (
    <LayerScreen title="Leaderboard" sub="Ranked by XP — win 20 · draw 10 · loss 5 · referral 10">
      <div className="mb-3"><Seg options={[{ id: "world", label: "World" }, { id: "country", label: "My Country" }, { id: "game", label: "By Game" }]} value={scope} onChange={setScope} /></div>
      {scope === "game" && (
        <div className="mb-3"><Seg small options={GAMES.map(g => ({ id: g.id, label: g.name }))} value={gameF} onChange={setGameF} /></div>
      )}
      {rows.length === 0 ? (
        <Empty icon="fa-ranking-star" title="No ranked managers" sub="Rankings appear as managers earn XP from matches." />
      ) : (
        <div className="card divide-y divide-[var(--line)]">
          {rows.slice(0, 30).map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.id === user?.id ? "bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]" : ""}`}>
              <span className="font-display w-7 text-center text-[0.95rem]" style={{ color: i < 3 ? medal[i] : "var(--mut)" }}>{i + 1}</span>
              <Avatar photo={r.photo} name={r.name} country={r.country} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.82rem] font-extrabold">{r.name}{r.id === user?.id && <span className="ml-1.5 chip !px-1.5 !py-0.5 bg-[var(--deep)] text-[var(--gold)]">You</span>}</div>
                <div className="text-[0.64rem] font-bold text-[var(--mut)]">@{r.handle}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[0.95rem] text-[var(--forest)]">{r.xp}<span className="text-[0.6rem] text-[var(--mut)]"> XP</span></div>
                <div className="text-[0.6rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-earth-africa" /> #{i + 1}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </LayerScreen>
  );
}

export { identityOf };
