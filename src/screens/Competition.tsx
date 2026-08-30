/* ============================================================
   PenX Hub — Competition detail screen (fixtures, standings,
   bracket, rankings, teams, rules, hosting tools)
   ============================================================ */
import { useMemo, useRef, useState } from "react";
import type { Competition, Fx, StandingRow } from "../data";
import { buildFixtures, buildGroups, compStatus, fmtClock, fmtDay, gameById, matchdayLabel, standingsRows, teamBusy, uid } from "../data";
import { useApp, withNotif, withPoints } from "../store";
import { Empty, FlagBadge, LayerScreen, Seg, StatusChip, TeamLogo } from "../ui";
import { readImage, TeamFormModal } from "./Teams";

type TabId = "fixtures" | "table" | "rankings" | "teams" | "rules";

export function CompScreen({ compId }: { compId: string }) {
  const { db, user, set, toast, notify, pushLayer } = useApp();
  const comp = db.comps.find(c => c.id === compId);
  const [tab, setTab] = useState<TabId>("fixtures");
  const [gate, setGate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<{ fxId: string; disputed: boolean } | null>(null);

  const fxs = useMemo(() => (comp ? buildFixtures(comp) : []), [comp]);
  if (!comp || !user) return null;
  const game = gameById(comp.gameId);
  const status = compStatus(comp);
  const myTeam = db.teams.find(t => comp.joined.some(j => j.teamId === t.id));
  const isHost = comp.hostId === user.id;
  const isTournament = comp.type === "Tournament";
  const endTs = fxs.length ? Math.max(...fxs.map(f => f.date)) + 86400000 : new Date(comp.startDate).getTime();

  /* ---------- participation ---------- */
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
    set(d => withPoints(withNotif({
      ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, joined: [...c.joined, { teamId: team.id, name: team.name, owner: `${user.firstName} ${user.lastName}`, country: user.country, logo: team.logo ?? team.color }] } : c),
    }, "join", `You joined "${comp.name}" with ${team.name}`), 50));
    toast("Joined! +50 XP", "fa-circle-check");
  };
  const explore = () => {
    setTab("fixtures");
    const els = document.querySelectorAll("[data-layer-scroll]");
    (els[els.length - 1] as HTMLElement | undefined)?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onUploadClick = (fxId: string, disputed: boolean) => { uploadFor.current = { fxId, disputed }; uploadRef.current?.click(); };
  const handleFile = async (f: File) => {
    const t = uploadFor.current; if (!t) return;
    try {
      const img = await readImage(f, 480);
      const fx = fxs.find(x => x.id === t.fxId);
      set(d => withNotif({
        ...d, comps: d.comps.map(c => c.id === comp.id ? { ...c, proofs: [...c.proofs, { fixtureId: t.fxId, image: img, by: myTeam?.name ?? "A team", time: Date.now(), status: t.disputed ? "disputed" : "pending" }] } : c),
      }, "request", t.disputed ? `Dispute raised on ${fx?.stage ?? "fixture"} — forwarded to host` : `Result screenshot uploaded for review (${fx?.homeName} vs ${fx?.awayName})`));
      toast(t.disputed ? "Dispute forwarded to host" : "Screenshot sent for review", "fa-camera");
    } catch { toast("Could not read image", "fa-triangle-exclamation"); }
  };

  const tableRows = useMemo(() => standingsRows(comp.joined, fxs), [comp, fxs]);

  return (
    <LayerScreen title={comp.name} sub={`${comp.serial} · ${comp.type}`} onDark>
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />

      {/* banner */}
      <div className="relative -mx-4 -mt-4 mb-4 overflow-hidden">
        <div className="relative px-4 pb-5 pt-20 text-white" style={{ background: `linear-gradient(rgb(6 40 23 / .82), rgb(6 40 23 / .94)), url(${game?.banner}) center/cover` }}>
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
              <i className="fa-solid fa-hashtag text-[var(--gold)]" /> {comp.serial} · hosted by {comp.hostName} (@{comp.hostHandle})
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-extrabold text-white/85">
              <span><i className="fa-solid fa-shield-halved text-[var(--gold)]" /> {comp.joined.length}/{comp.capacity} teams</span>
              <span><i className="fa-regular fa-calendar text-[var(--gold)]" /> {fmtDay(new Date(comp.startDate + "T12:00").getTime())}</span>
              <span><i className="fa-solid fa-rotate text-[var(--gold)]" /> {comp.frequency}</span>
              {comp.prize && <span><i className="fa-solid fa-sack-dollar text-[var(--gold)]" /> ${comp.entryFee * comp.capacity} pool</span>}
              {comp.access === "Private" && <span><i className="fa-solid fa-lock text-[var(--gold)]" /> Private</span>}
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

      {/* host tools */}
      {isHost && <HostTools comp={comp} fxs={fxs} />}

      {tab === "fixtures" && <FixturesTab comp={comp} fxs={fxs} myTeamId={myTeam?.id ?? null} onUpload={onUploadClick} />}
      {tab === "table" && (isTournament ? <BracketTab comp={comp} fxs={fxs} /> : <StandingsTable rows={tableRows} title="League Standings" />)}
      {tab === "rankings" && <RankingsTab comp={comp} rows={tableRows} />}
      {tab === "teams" && (
        <div className="card divide-y divide-[var(--line)]">
          {comp.joined.map(j => {
            const mine = myTeam?.id === j.teamId;
            const open = expanded === j.teamId;
            const row = tableRows.find(r => r.teamId === j.teamId);
            return (
              <div key={j.teamId}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => (mine ? pushLayer({ kind: "team", teamId: j.teamId }) : setExpanded(open ? null : j.teamId))}>
                  <TeamLogo logo={j.logo || null} color="#1d7544" name={j.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.82rem] font-extrabold">{j.name}{mine && <i className="fa-solid fa-star ml-1.5 text-[0.6rem] text-[var(--gold)]" />}</div>
                    <div className="flex items-center gap-1.5 text-[0.64rem] font-bold text-[var(--mut)]"><FlagBadge country={j.country} size={13} />{j.owner}</div>
                  </div>
                  {row && <span className="font-display text-[0.85rem] text-[var(--forest)]">{row.pts}<span className="text-[0.55rem] text-[var(--mut)]"> pts</span></span>}
                  {!mine && <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-[var(--mut)]`} />}
                </button>
                {open && !mine && (
                  <div className="fade-up mx-4 mb-3 grid grid-cols-4 gap-2 rounded-xl bg-[color-mix(in_srgb,var(--forest)_7%,transparent)] p-3 text-center">
                    {[["MP", row?.mp ?? 0], ["W", row?.w ?? 0], ["GF", row?.gf ?? 0], ["PTS", row?.pts ?? 0]].map(([l, v]) => (
                      <div key={String(l)}><div className="font-display text-[0.95rem] text-[var(--forest)]">{v}</div><div className="text-[0.56rem] font-extrabold uppercase text-[var(--mut)]">{l}</div></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === "rules" && (
        <div className="card divide-y divide-[var(--line)] text-[0.78rem] font-bold">
          {[
            ["Serial", comp.serial], ["Type", `${comp.type} · ${comp.format}`], ["Game", `${game?.name} (${game?.platform})`],
            ["Team size", "1v1"], ["Capacity", `${comp.capacity} teams`], ["Access", comp.access],
            ["Prize", comp.prize ? `$${comp.entryFee} entry × ${comp.capacity} teams = $${comp.entryFee * comp.capacity} USD pool` : "No prize"],
            ["Fixtures", comp.fixtureMode === "Auto" ? "Auto-generated" : "Manual (host-built head to heads)"],
            ["Results", comp.resultMode === "Typed" ? "Host types results" : "Team screenshots (reviewed, disputes to host)"],
            ["Match frequency", comp.frequency], ["Start", `${fmtDay(new Date(comp.startDate + "T12:00").getTime())} · ${comp.startTime}`],
            ["End (by frequency)", fmtDay(endTs)], ["Host", `${comp.hostName} (@${comp.hostHandle})`],
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

      {/* bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-[65]">
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-3 shadow-2xl backdrop-blur-xl" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            {myTeam ? (
              <button className="btn btn-forest flex-1" onClick={explore}><i className="fa-solid fa-compass" />Explore</button>
            ) : (
              <>
                <button className="btn btn-ghost flex-1" onClick={explore}><i className="fa-solid fa-compass" />Explore</button>
                <button className="btn btn-gold flex-1" onClick={participate}>
                  <i className={`fa-solid ${comp.access === "Private" ? "fa-paper-plane" : "fa-user-plus"}`} />
                  {comp.access === "Private" ? "Request To Join" : "Participate"}
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

/* ================= fixtures ================= */
function MatchRow({ f, mine, onUpload, legLabel }: { f: Fx; mine: boolean; onUpload?: (fxId: string, disputed: boolean) => void; legLabel?: string }) {
  return (
    <div className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 last:mb-0 ${mine ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_7%,var(--card))]" : "border-[var(--line)] bg-[var(--card)]"}`}>
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
      {onUpload && mine && (
        <div className="flex shrink-0 flex-col gap-1">
          <button className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--deep)] text-[0.6rem] text-white" aria-label="Upload result screenshot" onClick={() => onUpload(f.id, false)}><i className="fa-solid fa-camera" /></button>
          {f.played && <button className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e11d48] text-[0.6rem] text-white" aria-label="Dispute result" onClick={() => onUpload(f.id, true)}><i className="fa-solid fa-flag" /></button>}
        </div>
      )}
    </div>
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

function FixturesTab({ comp, fxs, myTeamId, onUpload }: { comp: Competition; fxs: Fx[]; myTeamId: string | null; onUpload: (fxId: string, disputed: boolean) => void }) {
  if (fxs.length === 0)
    return <Empty icon="fa-calendar-xmark" title="No fixtures yet" sub={comp.fixtureMode === "Manual" ? "The host will build head-to-head fixtures manually." : "Fixtures auto-generate once the required teams are confirmed."} />;
  const mine = (f: Fx) => !!myTeamId && (f.homeId === myTeamId || f.awayId === myTeamId);
  const uploadFn = comp.resultMode === "Screenshot" && myTeamId ? onUpload : undefined;

  if (comp.type === "League") {
    const days = [...new Set(fxs.map(f => f.matchday))].sort((a, b) => a - b);
    return (
      <div className="space-y-4">
        {days.map(md => (
          <section key={md}>
            <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider">
              <span className="h-4 w-1 rounded-full bg-[var(--gold)]" />{matchdayLabel(comp.frequency)} {md}
            </h3>
            {fxs.filter(f => f.matchday === md).map(f => <MatchRow key={f.id} f={f} mine={mine(f)} onUpload={uploadFn} legLabel={f.leg === 2 ? "2nd leg" : undefined} />)}
          </section>
        ))}
      </div>
    );
  }

  /* tournament: groups (with tables) then knockout rounds as connected pills */
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
            <MatchRow key={f.id} f={f} mine={mine(f)} onUpload={uploadFn} legLabel={`Group ${f.group}`} />
          ))}
        </section>
      )}
      {koStages.map(stage => (
        <section key={stage}>
          <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider"><span className="h-4 w-1 rounded-full bg-[var(--gold)]" />{stage}</h3>
          <div className="space-y-2 border-l-2 border-dashed border-[var(--line)] pl-3">
            {fxs.filter(f => f.stage === stage).map(f => <MatchRow key={f.id} f={f} mine={mine(f)} onUpload={uploadFn} legLabel={comp.format === "Double Round Robin" && f.stage !== "Grand Final" ? `${f.leg === 1 ? "1st" : "2nd"} leg` : undefined} />)}
          </div>
        </section>
      ))}
      {gf && (
        <section>
          <h3 className="font-display mb-2 flex items-center gap-2 text-[0.78rem] uppercase tracking-wider"><span className="h-4 w-1 rounded-full bg-[var(--gold)]" />Grand Final</h3>
          <MatchRow f={gf} mine={mine(gf)} onUpload={uploadFn} />
        </section>
      )}
    </div>
  );
}

/* ================= standings / bracket ================= */
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

  /* lower bracket (double elim): losers of upper round 1 cascade down */
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

/* ================= rankings ================= */
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

/* ================= host tools ================= */
function HostTools({ comp, fxs }: { comp: Competition; fxs: Fx[] }) {
  const { set, toast, notify } = useApp();
  const [open, setOpen] = useState(true);
  const [scores, setScores] = useState<Record<string, { hs: string; as: string }>>({});
  const [mh, setMh] = useState(""); const [ma, setMa] = useState(""); const [md, setMd] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const patch = (fn: (c: Competition) => Competition) => set(d => ({ ...d, comps: d.comps.map(c => (c.id === comp.id ? fn(c) : c)) }));

  const unplayed = fxs.filter(f => !f.played && f.homeId && f.awayId).slice(0, 3);
  const pendingProofs = comp.proofs.filter(p => p.status === "pending" || p.status === "disputed");

  return (
    <div className="card mb-4 overflow-hidden">
      <button className="pitch flex w-full items-center justify-between px-4 py-3 text-left text-white" onClick={() => setOpen(!open)}>
        <span className="font-display text-[0.78rem] uppercase tracking-wider"><i className="fa-solid fa-screwdriver-wrench text-[var(--gold)]" /> Host Tools</span>
        <span className="flex items-center gap-2 text-[0.66rem] font-extrabold">
          {comp.requests.length > 0 && <span className="chip bg-[#e11d48] text-white">{comp.requests.length} requests</span>}
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
                    patch(c => ({ ...c, requests: c.requests.filter(x => x.teamId !== r.teamId), joined: [...c.joined, { teamId: r.teamId, name: r.name, owner: r.owner, country: r.country, logo: "#8f5a1d" }] }));
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

          {/* enter results */}
          {comp.fixtureMode === "Auto" && unplayed.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Upload Results (type scores)</h4>
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

          {/* screenshot review */}
          {pendingProofs.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Review Screenshots</h4>
              {pendingProofs.map((p, i) => {
                const fx = fxs.find(f => f.id === p.fixtureId);
                return (
                  <div key={i} className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--line)] p-2.5">
                    <img src={p.image} alt="proof" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.7rem] font-extrabold">{fx ? `${fx.homeName} vs ${fx.awayName}` : "Fixture"}</div>
                      <div className="text-[0.6rem] font-bold text-[var(--mut)]">by {p.by} · <span className={p.status === "disputed" ? "text-[#e11d48]" : "text-[var(--gold)]"}>{p.status}</span></div>
                    </div>
                    <button className="btn btn-forest !px-2.5 !py-1.5 text-[0.62rem]" onClick={() => { patch(c => ({ ...c, proofs: c.proofs.map(x => x === p ? { ...x, status: "approved" } : x) })); toast("Approved", "fa-check"); }}>OK</button>
                    <button className="btn !px-2.5 !py-1.5 text-[0.62rem] text-white" style={{ background: "#c0392b" }} onClick={() => { patch(c => ({ ...c, proofs: c.proofs.filter(x => x !== p) })); toast("Rejected", "fa-xmark"); }}><i className="fa-solid fa-xmark" /></button>
                  </div>
                );
              })}
            </div>
          )}
          {comp.requests.length === 0 && unplayed.length === 0 && comp.fixtureMode !== "Manual" && pendingProofs.length === 0 && (
            <p className="text-[0.7rem] font-bold text-[var(--mut)]">All caught up — no requests, pending results or disputes.</p>
          )}
        </div>
      )}
    </div>
  );
}
