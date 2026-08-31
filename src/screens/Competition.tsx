/* ============================================================
   PenX Hub — Competition screens
   · CompInfoScreen   → description page (Participate / Explore)
   · CompExploreScreen→ Fixtures · Standings/Bracket · Rankings · Teams · Rules
   · FixtureModal     → VS view, Input Result, last-5 form, H2H
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import type { Competition, Fx, InputEntry, StandingRow } from "../data";
import {
  buildFixtures, buildGroups, compStatus, endOfDay, fmtClock, fmtDay, gameById,
  h2hLastFive, lastFive, matchdayLabel, standingsRows, teamBusy, threadForUser, uid,
} from "../data";
import { useApp, withNotif } from "../store";
import type { DB } from "../store";
import { Empty, FlagBadge, LayerScreen, Modal, Seg, StatusChip, TeamLogo } from "../ui";
import { TeamFormModal } from "./Teams";

type TabId = "fixtures" | "table" | "rankings" | "teams" | "rules";

/* ============================================================
   1 · COMPETITION DESCRIPTION PAGE
   ============================================================ */
export function CompInfoScreen({ compId }: { compId: string }) {
  const { db, user, set, toast, notify, pushLayer } = useApp();
  const comp = db.comps.find(c => c.id === compId);
  const [gate, setGate] = useState(false);
  if (!comp || !user) return null;
  const game = gameById(comp.gameId);
  const status = compStatus(comp);
  const myTeam = db.teams.find(t => comp.joined.some(j => j.teamId === t.id));
  const pendingReq = comp.requests.some(r => db.teams.some(t => t.id === r.teamId));
  const isHost = comp.hostId === user.id;
  const fxs = buildFixtures(comp);
  const endTs = fxs.length ? Math.max(...fxs.map(f => f.date)) + 86400000 : new Date(comp.startDate).getTime();

  const participate = () => {
    const team = db.teams.find(t => t.gameId === comp.gameId);
    if (!team) { setGate(true); return; }
    if (teamBusy(team.id, db.comps)) return toast(`"${team.name}" is already In A League`, "fa-lock");
    if (comp.joined.length >= comp.capacity) return toast("This competition is full", "fa-ban");
    if (comp.access === "Private") {
      if (comp.requests.some(r => r.teamId === team.id)) return toast("Request already pending", "fa-clock");
      set(d => ({ ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, requests: [...c.requests, { userId: user.id, teamId: team.id, name: team.name, owner: `${user.firstName} ${user.lastName}`, country: user.country, time: Date.now() }] } : c) }));
      notify("request", `Request sent to join "${comp.name}"`);
      return toast("Request sent to the host", "fa-paper-plane");
    }
    set(d => withNotif({
      ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, joined: [...c.joined, { teamId: team.id, name: team.name, owner: `${user.firstName} ${user.lastName}`, country: user.country, logo: team.logo ?? team.color, ownerId: user.id, ownerHandle: user.handle }] } : c),
    }, "join", `You joined "${comp.name}" with ${team.name}`));
    toast("Joined! Tap Explore to follow the competition", "fa-circle-check");
  };

  return (
    <LayerScreen title={comp.name} sub={`${comp.serial} · ${comp.type}`} onDark>
      {/* banner */}
      <div className="relative -mx-4 -mt-4 mb-4 overflow-hidden">
        <div className="relative px-4 pb-5 pt-16 text-white" style={{ background: `linear-gradient(rgb(6 40 23 / .82), rgb(6 40 23 / .94)), url(${game?.banner}) center/cover` }}>
          <div className="gold-stripes absolute inset-0" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={status} />
              <span className="chip bg-[var(--gold)] text-[#241a02]">{comp.type}</span>
              <span className="chip bg-white/12 text-white">{comp.format}</span>
              {myTeam && <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-star" />My Competition</span>}
            </div>
            <h1 className="font-display mt-3 text-[1.55rem] uppercase leading-tight">{comp.name}</h1>
            <p className="mt-1 text-[0.7rem] font-bold text-white/75">
              <i className="fa-solid fa-hashtag text-[var(--gold)]" /> {comp.serial} · hosted by{" "}
              <button className="underline decoration-[var(--gold)] underline-offset-2" onClick={() => pushLayer({ kind: "user", userId: comp.hostId })}>{comp.hostName} (@{comp.hostHandle})</button>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-28">
        {/* spec strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { i: "fa-shield-halved", l: "Teams", v: `${comp.joined.length}/${comp.capacity}` },
            { i: "fa-rotate", l: "Frequency", v: comp.frequency },
            { i: "fa-flag-checkered", l: "Ends", v: fmtDay(endTs) },
          ].map(s => (
            <div key={s.l} className="card px-2 py-3 text-center">
              <i className={`fa-solid ${s.i} text-[var(--gold)]`} />
              <div className="font-display mt-0.5 text-[0.78rem] leading-tight">{s.v}</div>
              <div className="text-[0.55rem] font-extrabold uppercase tracking-wide text-[var(--mut)]">{s.l}</div>
            </div>
          ))}
        </div>

        {/* description */}
        <div className="card p-4">
          <h3 className="text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">About this competition</h3>
          <p className="mt-2 text-[0.82rem] font-semibold leading-relaxed">{comp.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]"><i className="fa-solid fa-gamepad" />{game?.name} · {game?.platform}</span>
            <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]"><i className="fa-solid fa-user" />1v1</span>
            <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]">
              <i className={`fa-solid ${comp.resultMode === "Input" ? "fa-keyboard" : "fa-pen"}`} />
              {comp.resultMode === "Input" ? "Input match results" : "Host types results"}
            </span>
            <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]"><i className="fa-regular fa-calendar" />{comp.fixtureMode === "Auto" ? "Auto fixtures" : "Manual fixtures"}</span>
            {comp.access === "Private" && <span className="chip bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[#7a5a06] dark:text-[var(--gold)]"><i className="fa-solid fa-lock" />Private</span>}
          </div>
        </div>

        {/* rules preview */}
        <div className="card p-4">
          <h3 className="text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Rules</h3>
          <p className="mt-2 text-[0.76rem] font-semibold leading-relaxed text-[var(--mut)]">{comp.rules}</p>
        </div>

        {/* joined teams preview */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Teams joined · {comp.joined.length}</h3>
            {myTeam && <button className="text-[0.64rem] font-extrabold uppercase text-[var(--forest)]" onClick={() => pushLayer({ kind: "explore", compId: comp.id })}>See all</button>}
          </div>
          {comp.joined.length === 0 ? (
            <p className="px-4 pb-4 text-[0.72rem] font-bold text-[var(--mut)]">No teams yet — be the first to participate.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {comp.joined.slice(0, myTeam ? comp.joined.length : 4).map(j => (
                <TeamRow key={j.teamId} comp={comp} j={j} />
              ))}
            </div>
          )}
        </div>
        {!myTeam && comp.joined.length > 4 && (
          <p className="text-center text-[0.66rem] font-bold text-[var(--mut)]">+ {comp.joined.length - 4} more teams — join to explore them all</p>
        )}
      </div>

      {/* bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-[65]">
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-3 shadow-2xl backdrop-blur-xl" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            {myTeam ? (
              <button className="btn btn-forest flex-1" onClick={() => pushLayer({ kind: "explore", compId: comp.id })}><i className="fa-solid fa-compass" />Explore</button>
            ) : (
              <>
                <button className="btn btn-ghost flex-1" onClick={() => pushLayer({ kind: "explore", compId: comp.id })}><i className="fa-solid fa-compass" />Explore</button>
                <button className="btn btn-gold flex-1" onClick={participate}>
                  <i className={`fa-solid ${pendingReq ? "fa-clock" : comp.access === "Private" ? "fa-paper-plane" : "fa-user-plus"}`} />
                  {pendingReq ? "Requested" : comp.access === "Private" ? "Request To Join" : "Participate"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {gate && <TeamFormModal gameId={comp.gameId} onClose={() => setGate(false)} />}
    </LayerScreen>
  );
}

/* team row used on info + explore Teams tab, with Add / Chat + HOST tag */
function TeamRow({ comp, j, showPts }: { comp: Competition; j: Competition["joined"][number]; showPts?: StandingRow }) {
  const { db, user, set, toast, notify, pushLayer } = useApp();
  if (!user) return null;
  const mine = j.ownerId === user.id || db.teams.some(t => t.id === j.teamId);
  const isFriend = !!j.ownerId && user.friends.includes(j.ownerId);
  const isHostTeam = j.ownerId === comp.hostId;
  const requested = !!j.ownerId && user.sent.includes(j.ownerId);

  const addFriend = () => {
    if (!j.ownerId) return;
    set(d => ({ ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: [...a.sent.filter(x => x !== j.ownerId), j.ownerId!] } : a) }));
    toast(`Friend request sent to ${j.owner}`, "fa-user-plus");
    notify("friend", `You sent a friend request to ${j.owner}`);
    window.setTimeout(() => {
      set(d => withNotif({
        ...d, accounts: d.accounts.map(a => a.id === user.id ? { ...a, sent: a.sent.filter(x => x !== j.ownerId), friends: a.friends.includes(j.ownerId!) ? a.friends : [...a.friends, j.ownerId!] } : a),
      }, "friend", `${j.owner} accepted your friend request`));
    }, 1600);
  };
  const openChat = () => {
    if (!j.ownerId) return;
    const chatId = `ch-${j.ownerId}`;
    set(d => d.chats.some(c => c.userId === j.ownerId) ? d : { ...d, chats: [...d.chats, threadForUser({ id: j.ownerId!, name: j.owner, handle: j.ownerHandle ?? "manager", country: j.country, photo: null })] });
    pushLayer({ kind: "chat", chatId });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => {
        const own = db.teams.find(t => t.id === j.teamId);
        if (own) pushLayer({ kind: "team", teamId: own.id });
        else if (j.ownerId) pushLayer({ kind: "user", userId: j.ownerId });
      }}>
        <TeamLogo logo={j.logo || null} color="#1d7544" name={j.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-[0.82rem] font-extrabold">
            {j.name}
            {isHostTeam && <span className="chip !px-1.5 !py-0.5 bg-[var(--gold)] text-[0.52rem] text-[#241a02]"><i className="fa-solid fa-crown text-[0.5rem]" />HOST</span>}
            {mine && <i className="fa-solid fa-star text-[0.6rem] text-[var(--gold)]" />}
          </div>
          <div className="flex items-center gap-1.5 text-[0.64rem] font-bold text-[var(--mut)]">
            <FlagBadge country={j.country} size={13} />{j.owner}{j.ownerHandle ? ` · @${j.ownerHandle}` : ""}
          </div>
        </div>
      </button>
      {showPts && <span className="font-display text-[0.85rem] text-[var(--forest)]">{showPts.pts}<span className="text-[0.55rem] text-[var(--mut)]"> pts</span></span>}
      {!mine && (isFriend
        ? <button className="btn btn-forest !px-3 !py-1.5 text-[0.64rem]" onClick={openChat}><i className="fa-solid fa-comment" />Chat</button>
        : requested
          ? <span className="chip bg-[color-mix(in_srgb,var(--mut)_14%,transparent)] text-[var(--mut)]">Requested</span>
          : <button className="btn btn-ghost !px-3 !py-1.5 text-[0.64rem]" onClick={addFriend}><i className="fa-solid fa-user-plus" />Add</button>)}
    </div>
  );
}

/* ============================================================
   2 · EXPLORE SCREEN (tabs)
   ============================================================ */
export function CompExploreScreen({ compId }: { compId: string }) {
  const { db, user, set, notify } = useApp();
  const comp = db.comps.find(c => c.id === compId);
  const [tab, setTab] = useState<TabId>("fixtures");
  const [fxSel, setFxSel] = useState<string | null>(null);
  const fxs = useMemo(() => (comp ? buildFixtures(comp) : []), [comp]);

  /* deadline watchdog — Input-mode matches not confirmed by 11:59 PM are flagged to the host once */
  useEffect(() => {
    if (!comp || comp.resultMode !== "Input" || comp.hostId !== user?.id) return;
    const overdue = fxs.filter(f => !f.played && f.homeId && f.awayId && endOfDay(f.date) < Date.now() && !comp.disputed.includes(f.id) && !comp.nudged.includes(f.id));
    if (overdue.length === 0) return;
    set(d => withNotif({
      ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, nudged: [...c.nudged, ...overdue.map(f => f.id)] } : c),
    }, "result", `⚠️ ${overdue.length} match${overdue.length > 1 ? "es" : ""} in "${comp.name}" not confirmed by 11:59 PM — open Host Tools to nudge the teams.`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compId, db.comps]);

  if (!comp || !user) return null;
  const game = gameById(comp.gameId);
  const status = compStatus(comp);
  const myTeam = db.teams.find(t => comp.joined.some(j => j.teamId === t.id));
  const isHost = comp.hostId === user.id;
  const isTournament = comp.type === "Tournament";
  const tableRows = standingsRows(comp.joined, fxs);
  const selFx = fxs.find(f => f.id === fxSel) ?? null;

  return (
    <LayerScreen title={comp.name} sub={`${comp.serial} · ${comp.type}`} onDark>
      {/* compact banner */}
      <div className="relative -mx-4 -mt-4 mb-4 overflow-hidden">
        <div className="relative px-4 pb-4 pt-14 text-white" style={{ background: `linear-gradient(rgb(6 40 23 / .85), rgb(6 40 23 / .95)), url(${game?.banner}) center/cover` }}>
          <div className="gold-stripes absolute inset-0" />
          <div className="relative flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><StatusChip status={status} />{myTeam && <span className="chip bg-[var(--gold)] text-[#241a02]"><i className="fa-solid fa-star" />My Competition</span>}</div>
              <h1 className="font-display mt-2 truncate text-[1.15rem] uppercase">{comp.name}</h1>
              <p className="text-[0.64rem] font-bold text-white/70"><i className="fa-solid fa-hashtag text-[var(--gold)]" /> {comp.serial} · {comp.joined.length}/{comp.capacity} teams · {comp.resultMode === "Input" ? "Input results" : "Host results"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="sticky-under z-30 -mx-4 mb-4 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-4 py-2 backdrop-blur-xl">
        <Seg small value={tab} onChange={setTab} options={[
          { id: "fixtures", label: "Fixtures" },
          { id: "table", label: isTournament ? "Bracket" : "Standings" },
          { id: "rankings", label: "Rankings" },
          { id: "teams", label: "Teams" },
          { id: "rules", label: "Rules" },
        ]} />
      </div>

      {isHost && <HostTools comp={comp} fxs={fxs} />}

      {tab === "fixtures" && <FixturesTab comp={comp} fxs={fxs} myTeamId={myTeam?.id ?? null} onOpen={setFxSel} />}
      {tab === "table" && (isTournament ? <BracketTab comp={comp} fxs={fxs} /> : <StandingsTable rows={tableRows} title="League Standings" />)}
      {tab === "rankings" && <RankingsTab comp={comp} rows={tableRows} />}
      {tab === "teams" && (
        <div className="card divide-y divide-[var(--line)]">
          {comp.joined.map(j => <TeamRow key={j.teamId} comp={comp} j={j} showPts={tableRows.find(r => r.teamId === j.teamId)} />)}
        </div>
      )}
      {tab === "rules" && (
        <div className="card divide-y divide-[var(--line)] text-[0.78rem] font-bold">
          {[
            ["Serial", comp.serial], ["Type", `${comp.type} · ${comp.format}`], ["Game", `${game?.name} (${game?.platform})`],
            ["Team size", "1v1"], ["Capacity", `${comp.capacity} teams`], ["Access", comp.access],
            ["Prize", "No prize (prize hosting is under maintenance)"],
            ["Fixtures", comp.fixtureMode === "Auto" ? "Auto-generated" : "Manual (host-built head to heads)"],
            ["Results", comp.resultMode === "Input" ? "Input match results — both teams type the score before 11:59 PM on matchday; mismatches go to the host" : "Host types results"],
            ["Match frequency", comp.frequency], ["Start", `${fmtDay(new Date(comp.startDate + "T12:00").getTime())} · ${comp.startTime}`],
            ["Host", `${comp.hostName} (@${comp.hostHandle})`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
              <span className="text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">{k}</span>
              <span className="text-right">{v}</span>
            </div>
          ))}
          <div className="px-4 py-4">
            <h4 className="text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Description</h4>
            <p className="mt-1.5 leading-relaxed text-[var(--mut)]">{comp.description}</p>
            <h4 className="mt-4 text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Rules</h4>
            <p className="mt-1.5 leading-relaxed text-[var(--mut)]">{comp.rules}</p>
          </div>
        </div>
      )}

      {selFx && <FixtureModal comp={comp} fx={selFx} myTeamId={myTeam?.id ?? null} onClose={() => setFxSel(null)} />}
    </LayerScreen>
  );
}

/* ============================================================
   3 · FIXTURE MODAL — VS, Input Result, last-5 form, H2H
   ============================================================ */
function FormDots({ list }: { list: string[] }) {
  if (list.length === 0) return <span className="text-[0.6rem] font-bold text-[var(--mut)]">No matches yet</span>;
  const col: Record<string, string> = { W: "#16a34a", D: "#d9a421", L: "#e11d48" };
  return (
    <span className="flex gap-1">
      {list.map((r, i) => (
        <span key={i} className="font-display flex h-5 w-5 items-center justify-center rounded-md text-[0.6rem] text-white" style={{ background: col[r] }}>{r}</span>
      ))}
    </span>
  );
}

function FixtureModal({ comp, fx, myTeamId, onClose }: { comp: Competition; fx: Fx; myTeamId: string | null; onClose: () => void }) {
  const { user, set, toast, notify, pushLayer } = useApp();
  const [hs, setHs] = useState(""); const [as, setAs] = useState("");
  if (!user) return null;
  const fxs = buildFixtures(comp);
  const mySide = myTeamId && (fx.homeId === myTeamId || fx.awayId === myTeamId);
  const canInput = comp.resultMode === "Input" && !!mySide && !fx.played && endOfDay(fx.date) >= Date.now();
  const entries: InputEntry[] = comp.inputs[fx.id] ?? [];
  const myEntry = entries.find(e => e.teamId === myTeamId);
  const bothIn = entries.length >= 2;
  const disputed = comp.disputed.includes(fx.id);
  const overdue = !fx.played && endOfDay(fx.date) < Date.now();
  const homeJ = comp.joined.find(j => j.teamId === fx.homeId);
  const awayJ = comp.joined.find(j => j.teamId === fx.awayId);

  const submit = () => {
    const h = Number(hs), a = Number(as);
    if (hs === "" || as === "" || Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return toast("Enter both scores", "fa-triangle-exclamation");
    const teamId = myTeamId!;
    const j = comp.joined.find(x => x.teamId === teamId);
    const entry: InputEntry = { teamId, userId: user.id, userName: j?.name ?? "Team", hs: h, as: a, time: Date.now() };
    const others = entries.filter(e => e.teamId !== teamId);
    const next = [...others, entry];
    const opp = others[0];
    if (opp && (opp.hs !== h || opp.as !== a)) {
      /* mismatch → disputed, host reviews */
      set(d => withNotif({
        ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, inputs: { ...c.inputs, [fx.id]: next }, disputed: [...new Set([...c.disputed, fx.id])] } : c),
      }, "result", `Result mismatch in "${comp.name}": ${fx.homeName} vs ${fx.awayName} — forwarded to the host for review.`));
      toast("Scores don't match — sent to host for review", "fa-scale-balanced");
    } else if (opp) {
      /* match → confirmed */
      set(d => withNotif({
        ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, inputs: { ...c.inputs, [fx.id]: [] }, scores: { ...c.scores, [fx.id]: { hs: h, as: a } } } : c),
      }, "result", `Confirmed: ${fx.homeName} ${h}–${a} ${fx.awayName} in "${comp.name}"`));
      toast("Result confirmed by both teams!", "fa-circle-check");
    } else {
      set(d => ({ ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, inputs: { ...c.inputs, [fx.id]: next } } : c) }));
      notify("result", `Your result for ${fx.homeName} vs ${fx.awayName} is saved — waiting for the opponent.`);
      toast("Saved — waiting for the opponent's input", "fa-hourglass-half");
    }
    setHs(""); setAs("");
  };

  const h2h = h2hLastFive(fx.homeId ?? "", fx.awayId ?? "", fxs);

  return (
    <Modal title={`${matchdayLabel(comp.frequency)} · ${fx.stage}${fx.group ? ` · Group ${fx.group}` : ""}`} onClose={onClose} tall>
      {/* VS header */}
      <div className="pitch gold-stripes relative overflow-hidden rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex w-[38%] flex-col items-center gap-1.5 text-center">
            <TeamLogo logo={fx.homeLogo || null} color="#1d7544" name={fx.homeName} size={56} />
            <span className="text-[0.72rem] font-extrabold leading-tight">{fx.homeName}</span>
            <FlagBadge country={fx.homeCountry} size={16} />
          </div>
          <div className="text-center">
            {fx.played ? (
              <div className="font-display text-[1.6rem] text-[var(--gold)]">{fx.hs}–{fx.as}</div>
            ) : (
              <div className="font-display text-[1.1rem] text-[var(--gold)]">VS</div>
            )}
            <div className="mt-1 text-[0.58rem] font-extrabold uppercase tracking-wider text-white/70">{fmtDay(fx.date)} · {fmtClock(fx.date)}</div>
            {fx.leg === 2 && <div className="text-[0.56rem] font-extrabold uppercase text-[var(--gold)]">2nd leg</div>}
          </div>
          <div className="flex w-[38%] flex-col items-center gap-1.5 text-center">
            <TeamLogo logo={fx.awayLogo || null} color="#0e5b63" name={fx.awayName} size={56} />
            <span className="text-[0.72rem] font-extrabold leading-tight">{fx.awayName}</span>
            <FlagBadge country={fx.awayCountry} size={16} />
          </div>
        </div>
      </div>

      {/* status / input result */}
      {comp.resultMode === "Input" && mySide && !fx.played && (
        <div className="card mt-4 p-4">
          {disputed ? (
            <div className="flex items-center gap-2.5 text-[0.74rem] font-bold text-[var(--mut)]">
              <i className="fa-solid fa-scale-balanced text-[#e11d48]" /> Scores didn't match — the host is reviewing this result.
            </div>
          ) : overdue ? (
            <div className="flex items-center gap-2.5 text-[0.74rem] font-bold text-[var(--mut)]">
              <i className="fa-solid fa-clock text-[#e11d48]" /> The 11:59 PM matchday deadline passed — the host has been notified to confirm this match.
            </div>
          ) : canInput ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-keyboard text-[var(--forest)]" /> Input Result</h4>
                <span className="text-[0.58rem] font-extrabold uppercase text-[var(--mut)]">before 11:59 PM matchday</span>
              </div>
              {myEntry && <p className="mt-1.5 text-[0.66rem] font-bold text-[var(--forest)]"><i className="fa-solid fa-circle-check" /> You entered {myEntry.hs}–{myEntry.as} — submitting again replaces it.</p>}
              {!bothIn && entries.length > 0 && <p className="mt-1.5 text-[0.66rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-hourglass-half text-[var(--gold)]" /> Opponent has entered their result — yours decides it.</p>}
              <div className="mt-3 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-right text-[0.66rem] font-extrabold">{fx.homeName}</span>
                <input type="number" min={0} inputMode="numeric" placeholder="0" className="input !w-16 !px-2 !py-2 text-center font-display" value={hs} onChange={e => setHs(e.target.value)} />
                <span className="font-display text-[var(--mut)]">–</span>
                <input type="number" min={0} inputMode="numeric" placeholder="0" className="input !w-16 !px-2 !py-2 text-center font-display" value={as} onChange={e => setAs(e.target.value)} />
                <span className="min-w-0 flex-1 truncate text-[0.66rem] font-extrabold">{fx.awayName}</span>
              </div>
              <button className="btn btn-forest mt-3 w-full !py-3" onClick={submit}><i className="fa-solid fa-paper-plane" />Submit Result</button>
              <p className="mt-2 text-[0.62rem] font-bold text-[var(--mut)]">Both teams must enter the same score — matching results confirm the match instantly, mismatches go to the host.</p>
            </>
          ) : null}
        </div>
      )}
      {comp.resultMode === "Host" && !fx.played && (
        <p className="card mt-4 px-4 py-3 text-[0.72rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-pen text-[var(--forest)]" /> The host types this result from Host Tools.</p>
      )}

      {/* form + H2H */}
      <div className="card mt-4 space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">{fx.homeName} · last 5</span>
          <FormDots list={lastFive(fx.homeId ?? "", fxs)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">{fx.awayName} · last 5</span>
          <FormDots list={lastFive(fx.awayId ?? "", fxs)} />
        </div>
        <div className="divider" />
        <div>
          <h4 className="mb-2 text-[0.64rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-arrows-rotate text-[var(--gold)]" /> Head to head · last {Math.max(h2h.length, 0) || "5"}</h4>
          {h2h.length === 0 ? (
            <p className="text-[0.7rem] font-bold text-[var(--mut)]">First meeting in this competition.</p>
          ) : (
            <div className="space-y-1.5">
              {h2h.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--forest)_6%,transparent)] px-3 py-1.5 text-[0.68rem] font-extrabold">
                  <span className="min-w-0 flex-1 truncate text-right">{m.homeName}</span>
                  <span className="font-display mx-2 text-[var(--forest)]">{m.hs}–{m.as}</span>
                  <span className="min-w-0 flex-1 truncate">{m.awayName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {(homeJ || awayJ) && (
          <>
            <div className="divider" />
            <div className="flex justify-between gap-2 text-[0.62rem] font-bold text-[var(--mut)]">
              {homeJ?.ownerHandle && <button className="underline underline-offset-2" onClick={() => { if (homeJ.ownerId) { onClose(); pushLayer({ kind: "user", userId: homeJ.ownerId }); } }}>{fx.homeName}: @{homeJ.ownerHandle}</button>}
              {awayJ?.ownerHandle && <button className="underline underline-offset-2" onClick={() => { if (awayJ.ownerId) { onClose(); pushLayer({ kind: "user", userId: awayJ.ownerId }); } }}>{fx.awayName}: @{awayJ.ownerHandle}</button>}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   4 · FIXTURES TAB
   ============================================================ */
function MatchRow({ f, mine, onOpen, legLabel }: { f: Fx; mine: boolean; onOpen: () => void; legLabel?: string }) {
  return (
    <button onClick={onOpen} className={`mb-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-transform last:mb-0 active:scale-[0.985] ${mine ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_7%,var(--card))]" : "border-[var(--line)] bg-[var(--card)]"}`}>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-[0.72rem] font-extrabold">{f.homeName}</span>
        <TeamLogo logo={f.homeLogo || null} color="#1d7544" name={f.homeName} size={30} />
      </div>
      <div className="w-[74px] shrink-0 text-center">
        {f.played && f.hs != null ? (
          <span className="font-display inline-block rounded-lg bg-[var(--deep)] px-2.5 py-1 text-[0.82rem] text-white">{f.hs}–{f.as}</span>
        ) : (
          <span className="block text-[0.58rem] font-extrabold uppercase leading-tight text-[var(--mut)]">{fmtDay(f.date)}<br />{fmtClock(f.date)}</span>
        )}
        {legLabel && <span className="mt-0.5 block text-[0.52rem] font-extrabold uppercase text-[var(--gold)]">{legLabel}</span>}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamLogo logo={f.awayLogo || null} color="#0e5b63" name={f.awayName} size={30} />
        <span className="truncate text-[0.72rem] font-extrabold">{f.awayName}</span>
      </div>
      <i className="fa-solid fa-chevron-right shrink-0 text-[0.6rem] text-[var(--mut)]" />
    </button>
  );
}

function TrendArrow({ t }: { t: number }) {
  if (t > 0) return <i className="fa-solid fa-caret-up text-[#16a34a]" />;
  if (t < 0) return <i className="fa-solid fa-caret-down text-[#e11d48]" />;
  return <i className="fa-solid fa-minus text-[var(--mut)] text-[0.6rem]" />;
}

function GroupTable({ name, rows }: { name: string; rows: StandingRow[] }) {
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="bg-[var(--deep)] px-3 py-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--gold)]">{name}</div>
      <table className="w-full text-[0.66rem] font-bold">
        <thead><tr className="text-left text-[var(--mut)]"><th className="px-3 py-1.5">Team</th><th className="text-center">MP</th><th className="text-center">W</th><th className="text-center">D</th><th className="text-center">L</th><th className="text-center">GA</th><th className="text-center">GF</th><th className="text-center">GD</th><th className="text-center">PTS</th><th /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId} className={`border-t border-[var(--line)] ${i < 2 ? "bg-[color-mix(in_srgb,#16a34a_7%,transparent)]" : ""}`}>
              <td className="flex items-center gap-1.5 px-3 py-1.5"><span className="w-3 text-[var(--mut)]">{i + 1}</span><span className="max-w-[92px] truncate">{r.name}</span><TrendArrow t={r.trend} /></td>
              <td className="text-center">{r.mp}</td><td className="text-center">{r.w}</td><td className="text-center">{r.d}</td><td className="text-center">{r.l}</td>
              <td className="text-center">{r.ga}</td><td className="text-center">{r.gf}</td><td className="text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="font-display text-center text-[0.74rem] text-[var(--forest)]">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixturesTab({ comp, fxs, myTeamId, onOpen }: { comp: Competition; fxs: Fx[]; myTeamId: string | null; onOpen: (id: string) => void }) {
  if (fxs.length === 0)
    return <Empty icon="fa-calendar-xmark" title="No fixtures yet" sub={comp.fixtureMode === "Manual" ? "The host will build head-to-head fixtures manually." : "Fixtures auto-generate once the required teams are confirmed."} />;
  const mine = (f: Fx) => !!myTeamId && (f.homeId === myTeamId || f.awayId === myTeamId);
  const open = (f: Fx) => onOpen(f.id);

  if (comp.type === "League") {
    const days = [...new Set(fxs.map(f => f.matchday))].sort((a, b) => a - b);
    return (
      <div className="space-y-4">
        {days.map(md => (
          <section key={md}>
            <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider">
              <span className="h-4 w-1 rounded-full bg-[var(--gold)]" />{matchdayLabel(comp.frequency)} {md}
            </h3>
            {fxs.filter(f => f.matchday === md).map(f => <MatchRow key={f.id} f={f} mine={mine(f)} onOpen={() => open(f)} legLabel={f.leg === 2 ? "2nd leg" : undefined} />)}
          </section>
        ))}
      </div>
    );
  }

  const groups = buildGroups(comp);
  const koStages = [...new Set(fxs.filter(f => !f.group && f.stage !== "Grand Final").map(f => f.stage))];
  koStages.sort((a, b) => (fxs.find(f => f.stage === a)?.date ?? 0) - (fxs.find(f => f.stage === b)?.date ?? 0));
  const gf = fxs.find(f => f.stage === "Grand Final");
  return (
    <div className="space-y-5">
      {groups.length > 0 && (
        <section>
          <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider"><span className="h-4 w-1 rounded-full bg-[var(--gold)]" />Group Stage</h3>
          <p className="mb-2 text-[0.66rem] font-bold text-[var(--mut)]">Each team plays 3 matches — win 3 pts · draw 1 pt · loss 0. Top two qualify.</p>
          {groups.map(g => <GroupTable key={g.name} name={g.name} rows={g.rows} />)}
          {fxs.filter(f => f.group).sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id)).map(f => (
            <MatchRow key={f.id} f={f} mine={mine(f)} onOpen={() => open(f)} legLabel={`Group ${f.group}`} />
          ))}
        </section>
      )}
      {koStages.map(stage => (
        <section key={stage}>
          <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider"><span className="h-4 w-1 rounded-full bg-[var(--gold)]" />{stage}</h3>
          <div className="space-y-2 border-l-2 border-dashed border-[var(--line)] pl-3">
            {fxs.filter(f => f.stage === stage).map(f => <MatchRow key={f.id} f={f} mine={mine(f)} onOpen={() => open(f)} legLabel={comp.format === "Double Round Robin" && f.stage !== "Grand Final" ? `${f.leg === 1 ? "1st" : "2nd"} leg` : undefined} />)}
          </div>
        </section>
      ))}
      {gf && (
        <section>
          <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider"><span className="h-4 w-1 rounded-full bg-[var(--gold)]" />Grand Final</h3>
          <MatchRow f={gf} mine={mine(gf)} onOpen={() => open(gf)} />
        </section>
      )}
    </div>
  );
}

/* ============================================================
   5 · STANDINGS / BRACKET
   ============================================================ */
function StandingsTable({ rows, title }: { rows: StandingRow[]; title: string }) {
  return (
    <div>
      <h3 className="font-display mb-2 text-[0.8rem] uppercase tracking-wider">{title}</h3>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
        <table className="w-full text-[0.7rem] font-bold">
          <thead className="bg-[var(--deep)] text-left text-white">
            <tr><th className="px-3 py-2.5">#</th><th>Team</th><th className="text-center">MP</th><th className="text-center">W</th><th className="text-center">D</th><th className="text-center">L</th><th className="text-center">GF</th><th className="text-center">GA</th><th className="text-center">GD</th><th className="px-3 text-center">PTS</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.teamId} className={`border-t border-[var(--line)] ${i === 0 ? "bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]" : i < 3 ? "bg-[color-mix(in_srgb,#16a34a_6%,transparent)]" : ""}`}>
                <td className="px-3 py-2"><span className="flex items-center gap-1.5">{i + 1}<TrendArrow t={r.trend} /></span></td>
                <td><span className="flex items-center gap-2"><TeamLogo logo={r.logo || null} color="#1d7544" name={r.name} size={24} /><span className="max-w-[110px] truncate">{r.name}</span><FlagBadge country={r.country} size={14} /></span></td>
                <td className="text-center">{r.mp}</td><td className="text-center">{r.w}</td><td className="text-center">{r.d}</td><td className="text-center">{r.l}</td>
                <td className="text-center">{r.gf}</td><td className="text-center">{r.ga}</td><td className="text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="font-display px-3 text-center text-[0.82rem] text-[var(--forest)]">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Tie { home: Fx; legs: Fx[] }
function collectTies(fxs: Fx[], stage: string): Tie[] {
  const map = new Map<string, Fx[]>();
  fxs.filter(f => f.stage === stage).forEach(f => {
    const key = f.id.slice(0, f.id.lastIndexOf("-"));
    map.set(key, [...(map.get(key) ?? []), f]);
  });
  return [...map.values()].map(legs => ({ home: legs[0], legs: legs.sort((a, b) => a.leg - b.leg) }));
}
function TiePill({ tie }: { tie: Tie }) {
  const agg = (i: 0 | 1) => tie.legs.reduce((s, l) => s + (i === 0 ? l.hs ?? 0 : l.as ?? 0), 0);
  const played = tie.legs.some(l => l.played);
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] text-[0.66rem] font-bold shadow-sm">
      {[0, 1].map(i => {
        const f = tie.home;
        const nm = i === 0 ? f.homeName : f.awayName;
        const win = played && agg(0) !== agg(1) && ((i === 0 && agg(0) > agg(1)) || (i === 1 && agg(1) > agg(0)));
        return (
          <div key={i} className={`flex items-center gap-2 px-2.5 py-2 ${i === 1 ? "border-t border-[var(--line)]" : ""} ${win ? "bg-[color-mix(in_srgb,#16a34a_9%,transparent)]" : ""}`}>
            <TeamLogo logo={(i === 0 ? f.homeLogo : f.awayLogo) || null} color="#1d7544" name={nm} size={20} />
            <span className={`min-w-0 flex-1 truncate ${win ? "text-[var(--forest)]" : ""}`}>{nm}{win && <i className="fa-solid fa-check ml-1 text-[0.55rem]" />}</span>
            <span className="font-display text-[0.72rem]">{tie.legs.map(l => (i === 0 ? l.hs : l.as) ?? "–").join(" · ")}</span>
          </div>
        );
      })}
    </div>
  );
}

function BracketTab({ comp, fxs }: { comp: Competition; fxs: Fx[] }) {
  const groups = buildGroups(comp);
  const koStages = [...new Set(fxs.filter(f => !f.group && f.stage !== "Grand Final").map(f => f.stage))];
  koStages.sort((a, b) => (fxs.find(f => f.stage === a)?.date ?? 0) - (fxs.find(f => f.stage === b)?.date ?? 0));
  const double = comp.format === "Double Round Robin";
  const gf = fxs.find(f => f.stage === "Grand Final");
  if (koStages.length === 0 && groups.length === 0)
    return <Empty icon="fa-sitemap" title="Bracket coming soon" sub="The knockout path appears once teams are confirmed." />;

  const lower: { name: string; ties: { a: string; b: string }[] }[] = [];
  if (double && koStages.length > 0) {
    const r1 = collectTies(fxs, koStages[0]);
    const losers = r1.map((t, i) => {
      const l = t.legs[0];
      if (l.played && l.hs != null) return (l.hs ?? 0) >= (l.as ?? 0) ? l.awayName : l.homeName;
      return `Loser · R1 Tie ${i + 1}`;
    });
    for (let size = losers.length; size >= 2; size /= 2) {
      const name = size === 2 ? "LB Final" : size === 4 ? "LB Semi-finals" : `LB Round of ${size}`;
      const ties: { a: string; b: string }[] = [];
      for (let i = 0; i < size / 2; i++) ties.push({ a: losers[i], b: losers[size - 1 - i] });
      lower.push({ name, ties });
      if (size === 2) break;
    }
  }

  return (
    <div className="space-y-5">
      {groups.length > 0 && (
        <section>
          <h3 className="font-display mb-2 text-[0.78rem] uppercase tracking-wider">Group Tables</h3>
          {groups.map(g => <GroupTable key={g.name} name={g.name} rows={g.rows} />)}
          <p className="text-[0.66rem] font-bold text-[var(--mut)]">Winners' knockout path continues below ↓</p>
        </section>
      )}
      <section>
        <h3 className="font-display mb-1 text-[0.78rem] uppercase tracking-wider">{double ? "Upper Bracket" : "Knockout Bracket"}</h3>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {koStages.map(stage => (
            <div key={stage} className="w-[196px] shrink-0">
              <div className="mb-2 rounded-lg bg-[var(--deep)] px-2.5 py-1.5 text-center text-[0.6rem] font-extrabold uppercase tracking-wider text-[var(--gold)]">{stage}</div>
              <div className="flex flex-col justify-around border-r-2 border-dashed border-[var(--line)] pr-2" style={{ minHeight: collectTies(fxs, stage).length * 62 }}>
                {collectTies(fxs, stage).map(t => <TiePill key={t.home.id} tie={t} />)}
              </div>
            </div>
          ))}
          {gf && (
            <div className="w-[196px] shrink-0">
              <div className="mb-2 rounded-lg bg-[var(--gold)] px-2.5 py-1.5 text-center text-[0.6rem] font-extrabold uppercase tracking-wider text-[#241a02]"><i className="fa-solid fa-trophy" /> Grand Final</div>
              <TiePill tie={{ home: gf, legs: [gf] }} />
            </div>
          )}
        </div>
      </section>
      {lower.length > 0 && (
        <section>
          <h3 className="font-display mb-2 text-[0.78rem] uppercase tracking-wider">Lower Bracket</h3>
          <div className="space-y-3">
            {lower.map(r => (
              <div key={r.name}>
                <div className="mb-1.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">{r.name}</div>
                {r.ties.map((t, i) => (
                  <div key={i} className="mb-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[0.68rem] font-bold">
                    <span>{t.a}</span><span className="font-display mx-2 text-[var(--gold)]">vs</span><span>{t.b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ============================================================
   6 · RANKINGS (FIFA power-ranking style)
   ============================================================ */
function RankingsTab({ comp, rows }: { comp: Competition; rows: StandingRow[] }) {
  const top10 = rows.slice(0, 10);
  const scorers = [...rows].sort((a, b) => b.gf - a.gf).slice(0, 3);
  const defense = [...rows].sort((a, b) => a.ga - b.ga).slice(0, 3);
  const winners = [...rows].sort((a, b) => b.w - a.w).slice(0, 3);
  if (rows.length === 0) return <Empty icon="fa-ranking-star" title="No rankings" sub="Rankings appear once matches are played." />;
  const miniCard = (title: string, icon: string, list: StandingRow[], stat: (r: StandingRow) => string) => (
    <div className="fifa-card relative overflow-hidden rounded-2xl p-4">
      <div className="gold-stripes absolute inset-0" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[var(--gold)]"><i className={`fa-solid ${icon}`} />{title}</div>
        <div className="mt-3 space-y-2">
          {list.map((r, i) => (
            <div key={r.teamId} className="flex items-center gap-2.5">
              <span className="font-display w-5 text-[0.9rem] text-white/60">{i + 1}</span>
              <TeamLogo logo={r.logo || null} color="#1d7544" name={r.name} size={26} />
              <span className="min-w-0 flex-1 truncate text-[0.74rem] font-extrabold">{r.name}</span>
              <span className="font-display text-[0.85rem] text-[var(--gold)]">{stat(r)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="fifa-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-[0.8rem] uppercase tracking-wide">Power Rankings</span>
          <span className="chip bg-white/12 text-white">{comp.name}</span>
        </div>
        <div className="divide-y divide-white/8">
          {top10.map((r, i) => (
            <div key={r.teamId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-display w-7 text-center text-[1rem]" style={{ color: i < 3 ? "#e9c25a" : "rgba(255,255,255,.55)" }}>{i + 1}</span>
              <TeamLogo logo={r.logo || null} color="#1d7544" name={r.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.78rem] font-extrabold">{r.name}</div>
                <div className="flex items-center gap-1.5 text-[0.6rem] font-bold text-white/60"><FlagBadge country={r.country} size={13} />{r.gf} goals · {r.pts} pts</div>
              </div>
              <TrendArrow t={r.trend} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {miniCard("Top Scoring", "fa-futbol", scorers, r => `${r.gf} ⚽`)}
        {miniCard("Defending the Goal", "fa-shield", defense, r => `${r.ga} conceded`)}
        {miniCard("Winning Mentality", "fa-fire", winners, r => `${r.w} wins`)}
      </div>
    </div>
  );
}

/* ============================================================
   7 · HOST TOOLS — requests, disputes, deadline nudges, results
   ============================================================ */
function HostTools({ comp, fxs }: { comp: Competition; fxs: Fx[] }) {
  const { user, set, toast, notify } = useApp();
  const [open, setOpen] = useState(true);
  const [scores, setScores] = useState<Record<string, { hs: string; as: string }>>({});
  const [mh, setMh] = useState(""); const [ma, setMa] = useState(""); const [md, setMd] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const patch = (fn: (c: Competition) => Competition) => set(d => ({ ...d, comps: d.comps.map(c => (c.id === comp.id ? fn(c) : c)) }));

  const unplayed = fxs.filter(f => !f.played && f.homeId && f.awayId).slice(0, 3);
  const disputedFxs = fxs.filter(f => comp.disputed.includes(f.id));
  const overdue = fxs.filter(f => !f.played && f.homeId && f.awayId && endOfDay(f.date) < Date.now() && !comp.disputed.includes(f.id));

  const remindTeams = (f: Fx) => {
    [f.homeId, f.awayId].forEach(tid => {
      const j = comp.joined.find(x => x.teamId === tid);
      if (!j?.ownerId || j.ownerId === user?.id) return;
      const chatId = `ch-${j.ownerId}`;
      set(d => {
        let next: DB = d.chats.some(c => c.userId === j.ownerId) ? d : { ...d, chats: [...d.chats, threadForUser({ id: j.ownerId!, name: j.owner, handle: j.ownerHandle ?? "manager", country: j.country, photo: null })] };
        return { ...next, chats: next.chats.map(c => c.userId === j.ownerId ? { ...c, messages: [...c.messages, { id: uid(), from: "me" as const, text: `⚠️ "${comp.name}": your result for ${f.homeName} vs ${f.awayName} wasn't confirmed by 11:59 PM. Please confirm the match result now.`, time: Date.now() }] } : c) };
      });
    });
    notify("system", `Reminders sent to both teams for ${f.homeName} vs ${f.awayName}.`);
    toast("Reminders sent to both teams", "fa-paper-plane");
  };

  const resolveDispute = (f: Fx, hs: number, as: number) => {
    patch(c => ({ ...c, disputed: c.disputed.filter(x => x !== f.id), inputs: { ...c.inputs, [f.id]: [] }, scores: { ...c.scores, [f.id]: { hs, as } } }));
    notify("result", `You confirmed ${f.homeName} ${hs}–${as} ${f.awayName} after review.`);
    toast("Result confirmed", "fa-gavel");
  };

  return (
    <div className="card mb-4 overflow-hidden">
      <button className="pitch flex w-full items-center justify-between px-4 py-3 text-left text-white" onClick={() => setOpen(!open)}>
        <span className="font-display text-[0.78rem] uppercase tracking-wider"><i className="fa-solid fa-screwdriver-wrench text-[var(--gold)]" /> Host Tools</span>
        <span className="flex items-center gap-2 text-[0.66rem] font-extrabold">
          {comp.requests.length > 0 && <span className="chip bg-[#e11d48] text-white">{comp.requests.length} requests</span>}
          {disputedFxs.length > 0 && <span className="chip bg-[var(--gold)] text-[#241a02]">{disputedFxs.length} disputes</span>}
          <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-4 p-4">
          {/* join requests */}
          {comp.requests.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Join Requests</h4>
              {comp.requests.map(r => (
                <div key={r.teamId} className="mb-2 flex items-center gap-2.5 rounded-xl border border-[var(--line)] p-2.5">
                  <FlagBadge country={r.country} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.76rem] font-extrabold">{r.name}</div>
                    <div className="text-[0.62rem] font-bold text-[var(--mut)]">{r.owner}</div>
                  </div>
                  <button className="btn btn-forest !px-3 !py-1.5 text-[0.66rem]" onClick={() => {
                    if (comp.joined.length >= comp.capacity) return toast("Competition is full", "fa-ban");
                    patch(c => ({ ...c, requests: c.requests.filter(x => x.teamId !== r.teamId), joined: [...c.joined, { teamId: r.teamId, name: r.name, owner: r.owner, country: r.country, logo: "#8f5a1d", ownerId: r.userId, ownerHandle: undefined }] }));
                    notify("join", `You accepted ${r.name} into "${comp.name}"`);
                    toast(`${r.name} accepted`, "fa-circle-check");
                  }}>Accept</button>
                  <button className="btn !px-3 !py-1.5 text-[0.66rem] text-white" style={{ background: "#c0392b" }} onClick={() => {
                    patch(c => ({ ...c, requests: c.requests.filter(x => x.teamId !== r.teamId) }));
                    toast(`${r.name} rejected`, "fa-xmark");
                  }}>Reject</button>
                </div>
              ))}
            </div>
          )}

          {/* disputed inputs */}
          {disputedFxs.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[#e11d48]"><i className="fa-solid fa-scale-balanced" /> Disputed Results — your call</h4>
              {disputedFxs.map(f => {
                const entries = comp.inputs[f.id] ?? [];
                return (
                  <div key={f.id} className="mb-2 rounded-xl border border-[#e11d48]/40 bg-[color-mix(in_srgb,#e11d48_5%,var(--card))] p-3">
                    <div className="text-[0.72rem] font-extrabold">{f.homeName} <span className="text-[var(--gold)]">vs</span> {f.awayName}</div>
                    <div className="mt-1.5 space-y-1.5">
                      {entries.map(e => (
                        <div key={e.teamId} className="flex items-center justify-between rounded-lg bg-[var(--card)] px-3 py-1.5 text-[0.68rem] font-bold">
                          <span className="truncate">{e.userName} entered:</span>
                          <span className="font-display text-[var(--forest)]">{e.hs}–{e.as}</span>
                          <button className="btn btn-forest !px-2.5 !py-1 text-[0.6rem]" onClick={() => resolveDispute(f, e.hs, e.as)}>Accept</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* overdue unconfirmed (Input mode) */}
          {comp.resultMode === "Input" && overdue.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]"><i className="fa-solid fa-clock text-[#e11d48]" /> Not confirmed by 11:59 PM — chat both teams</h4>
              {overdue.slice(0, 5).map(f => (
                <div key={f.id} className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--line)] p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.72rem] font-extrabold">{f.homeName} vs {f.awayName}</div>
                    <div className="text-[0.6rem] font-bold text-[var(--mut)]">{matchdayLabel(comp.frequency)} {f.matchday} · {fmtDay(f.date)}</div>
                  </div>
                  <button className="btn btn-forest !px-3 !py-1.5 text-[0.64rem]" onClick={() => remindTeams(f)}><i className="fa-solid fa-paper-plane" />Nudge</button>
                </div>
              ))}
            </div>
          )}

          {/* host types results */}
          {comp.resultMode === "Host" && comp.fixtureMode === "Auto" && unplayed.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Type Results</h4>
              {unplayed.map(f => {
                const s = scores[f.id] ?? { hs: "", as: "" };
                return (
                  <div key={f.id} className="mb-2 rounded-xl border border-[var(--line)] p-2.5">
                    <div className="mb-1.5 text-[0.66rem] font-extrabold">{f.homeName} <span className="text-[var(--gold)]">vs</span> {f.awayName}<span className="ml-1 text-[var(--mut)]">· {f.stage} {f.matchday}</span></div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} placeholder="0" className="input !w-16 !px-2 !py-1.5 text-center" value={s.hs} onChange={e => setScores({ ...scores, [f.id]: { ...s, hs: e.target.value } })} />
                      <span className="font-display text-[var(--mut)]">–</span>
                      <input type="number" min={0} placeholder="0" className="input !w-16 !px-2 !py-1.5 text-center" value={s.as} onChange={e => setScores({ ...scores, [f.id]: { ...s, as: e.target.value } })} />
                      <button className="btn btn-forest ml-auto !px-3 !py-1.5 text-[0.66rem]" onClick={() => {
                        const hs = Number(s.hs), as = Number(s.as);
                        if (s.hs === "" || s.as === "" || Number.isNaN(hs) || Number.isNaN(as)) return toast("Enter both scores", "fa-triangle-exclamation");
                        patch(c => ({ ...c, scores: { ...c.scores, [f.id]: { hs, as } } }));
                        notify("system", `Result confirmed: ${f.homeName} ${hs}–${as} ${f.awayName}`);
                        toast("Result saved", "fa-floppy-disk");
                      }}>Save</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* manual fixture builder */}
          {comp.fixtureMode === "Manual" && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Build Head-to-Head Fixture</h4>
              <div className="space-y-2">
                <select className="input" value={mh} onChange={e => setMh(e.target.value)}><option value="">Home team…</option>{comp.joined.map(j => <option key={j.teamId} value={j.teamId}>{j.name}</option>)}</select>
                <select className="input" value={ma} onChange={e => setMa(e.target.value)}><option value="">Away team…</option>{comp.joined.filter(j => j.teamId !== mh).map(j => <option key={j.teamId} value={j.teamId}>{j.name}</option>)}</select>
                <input type="datetime-local" className="input" value={md} onChange={e => setMd(e.target.value)} />
                <button className="btn btn-forest w-full !py-2.5 text-[0.72rem]" onClick={() => {
                  if (!mh || !ma) return toast("Pick both teams", "fa-triangle-exclamation");
                  patch(c => ({ ...c, manual: [...c.manual, { id: uid(), homeId: mh, awayId: ma, date: md, hs: null, as: null }] }));
                  toast("Fixture added", "fa-calendar-plus");
                }}><i className="fa-solid fa-calendar-plus" />Add Fixture</button>
              </div>
            </div>
          )}

          {comp.requests.length === 0 && disputedFxs.length === 0 && overdue.length === 0 && unplayed.length === 0 && comp.fixtureMode !== "Manual" && (
            <p className="text-[0.7rem] font-bold text-[var(--mut)]">All caught up — no requests, disputes or pending results.</p>
          )}
        </div>
      )}
    </div>
  );
}
