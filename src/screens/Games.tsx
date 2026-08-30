/* ============================================================
   PenX Hub — Games page, Game browser, Hosting modal
   ============================================================ */
import { useMemo, useState } from "react";
import type { CompFormat, CompType, Competition, Frequency, Platform } from "../data";
import { BOTS, GAMES, compStatus, fmtDay, gameById, makeSerial, uid } from "../data";
import { useApp, withNotif, withPoints } from "../store";
import { Empty, Field, LayerScreen, Modal, Seg } from "../ui";
import { CompCard } from "./Home";
import { TeamFormModal } from "./Teams";

const LEAGUE_SIZES = [4, 6, 8, 10, 12, 18, 20, 24, 28, 30];
const CUP_SIZES = [8, 16, 32, 64];

function estMatchdays(type: CompType, format: CompFormat, capacity: number): number {
  if (type === "League") return format === "Double Round Robin" ? 2 * (capacity - 1) : capacity - 1;
  const group = format === "Group Stage" || capacity >= 32;
  const ko = Math.log2(group ? capacity / 2 : capacity);
  return (group ? 3 : 0) + ko + (format === "Double Round Robin" ? ko + 1 : 0);
}
const FREQ_GAP: Record<Frequency, number> = { "Bi-daily": 0.5, "Daily": 1, "Weekly": 7, "Bi-weekly": 3.5 };

/* stable wrapper (module-level so form inputs keep focus while typing) */
const Row = ({ children }: { children: React.ReactNode }) => <div className="mb-4">{children}</div>;

/* ---------------- Games page ---------------- */
export function GamesScreen() {
  const { db, user, pushLayer, toast, unread } = useApp();
  const [platform, setPlatform] = useState<Platform>("Mobile");
  const [q, setQ] = useState("");
  const [hosting, setHosting] = useState(false);
  const [gateGame, setGateGame] = useState<string | null>(null);

  const players = db.accounts.length + BOTS.length + 1240;
  const openGame = (gameId: string) => {
    const hasTeam = db.teams.some(t => t.gameId === gameId);
    if (!hasTeam) setGateGame(gameId); // team gate first
    else pushLayer({ kind: "game", gameId });
  };
  const serialHit = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    return db.comps.find(c => c.serial.toLowerCase() === s) ?? null;
  }, [q, db.comps]);
  const searchHits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return db.comps.filter(c => c.name.toLowerCase().includes(s) || c.serial.toLowerCase().includes(s)).slice(0, 5);
  }, [q, db.comps]);

  return (
    <div className="mx-auto max-w-md px-4 pb-32">
      <div className="sticky-bar -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <h1 className="font-display text-[1.05rem] uppercase tracking-wide">Games</h1>
          <button className="icon-btn relative" aria-label="Notifications" onClick={() => pushLayer({ kind: "notifs" })}>
            <i className="fa-solid fa-bell" />
            {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#e11d48] ring-2 ring-[var(--card)]" />}
          </button>
        </div>
      </div>

      <div className="stagger mt-4 space-y-4">
        {/* header chips */}
        <div className="flex gap-2.5">
          <span className="chip bg-[var(--deep)] text-white"><i className="fa-solid fa-users text-[var(--gold)]" />{players.toLocaleString()} players</span>
          <span className="chip bg-[var(--gold-soft)] text-[#7a5a06] dark:text-[var(--gold)]"><i className="fa-solid fa-trophy" />{db.comps.length} community hosted</span>
        </div>

        {/* search — finds competitions by serial */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search games or serial e.g. Co…" className="input !pl-11" />
        </div>
        {serialHit && (
          <div className="fade-up">
            <p className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--forest)]"><i className="fa-solid fa-hashtag" /> Serial match</p>
            <CompCard comp={serialHit} onOpen={() => pushLayer({ kind: "comp", compId: serialHit.id })} />
          </div>
        )}
        {!serialHit && searchHits.length > 0 && (
          <div className="space-y-3">{searchHits.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
        )}

        {/* platform tabs + global host button */}
        {!q && (
          <>
            <div className="pt-1"><Seg options={[{ id: "Mobile", label: "Mobile" }, { id: "PC", label: "PC" }, { id: "Console", label: "Console" }]} value={platform} onChange={setPlatform} /></div>
            <button onClick={() => (user ? setHosting(true) : toast("Sign in to host", "fa-lock"))} className="btn btn-gold w-full !py-3.5 text-[0.9rem]">
              <i className="fa-solid fa-bullhorn" />Host League / Tournament
            </button>

            {/* games of the platform */}
            <div className="space-y-4">
              {GAMES.filter(g => g.platform === platform).map(g => {
                const hosted = db.comps.filter(c => c.gameId === g.id).length;
                return (
                  <button key={g.id} onClick={() => openGame(g.id)} className="group relative block h-36 w-full overflow-hidden rounded-2xl text-left shadow-xl transition-transform active:scale-[0.98]">
                    <img src={g.banner} alt={g.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                    <span className="absolute inset-0" style={{ background: `linear-gradient(105deg, rgb(6 40 23 / .92) 0%, rgb(6 40 23 / .55) 55%, rgb(6 40 23 / .15))` }} />
                    <span className="gold-stripes absolute inset-0" />
                    <span className="absolute inset-0 flex flex-col justify-between p-4 text-white">
                      <span className="flex items-center justify-between">
                        <span className="chip bg-[var(--gold)] text-[#241a02]">{g.category}</span>
                        <span className="chip bg-white/12 text-white backdrop-blur">{g.platform}</span>
                      </span>
                      <span>
                        <span className="font-display block text-[1.15rem] uppercase leading-none">{g.name}</span>
                        <span className="mt-1.5 flex items-center gap-3 text-[0.66rem] font-extrabold text-white/80">
                          <span><i className="fa-solid fa-trophy text-[var(--gold)]" /> {hosted} hosted</span>
                          <span><i className="fa-solid fa-shield-halved text-[var(--gold)]" /> 1v1 squads</span>
                          <span className="ml-auto text-[var(--gold)]">Enter <i className="fa-solid fa-arrow-right" /></span>
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
              {GAMES.filter(g => g.platform === platform).length === 0 && (
                <Empty icon="fa-gamepad" title="No games for now" sub="Coming soon — we're adding more titles to this platform." />
              )}
            </div>
          </>
        )}
      </div>

      {/* team gate */}
      {gateGame && (
        <TeamGate gameId={gateGame} onClose={() => setGateGame(null)} onDone={() => { const id = gateGame; setGateGame(null); pushLayer({ kind: "game", gameId: id }); }} />
      )}
      {hosting && <HostModal onClose={() => setHosting(false)} onHosted={id => { setHosting(false); pushLayer({ kind: "comp", compId: id }); }} onNeedTeam={() => setHosting(false)} />}
    </div>
  );
}

/* gate modal when opening a game without a team */
function TeamGate({ gameId, onClose, onDone }: { gameId: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState(false);
  const game = gameById(gameId);
  return (
    <>
      <Modal title="Create your team first" onClose={onClose}>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: game?.accent }}><i className="fa-solid fa-shield-halved text-xl" /></span>
          <p className="text-[0.8rem] font-semibold text-[var(--mut)]">You need a <strong className="text-[var(--ink)]">{game?.name}</strong> team before you compete. One team per game — create yours now.</p>
        </div>
        <div className="mt-5 flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => { onClose(); }}>Browse first</button>
          <button className="btn btn-forest flex-1" onClick={() => { onClose(); setForm(true); }}><i className="fa-solid fa-plus" />Create Team</button>
        </div>
        <button className="mt-3 w-full text-center text-[0.7rem] font-extrabold uppercase tracking-wider text-[var(--mut)]" onClick={onDone}>Just browse {game?.name} →</button>
      </Modal>
      {form && <TeamFormModal gameId={gameId} onClose={() => setForm(false)} onSaved={onDone} />}
    </>
  );
}

/* ---------------- Game screen (one game) ---------------- */
export function GameScreen({ gameId }: { gameId: string }) {
  const { db, pushLayer } = useApp();
  const game = gameById(gameId)!;
  const [tab, setTab] = useState<"all" | "League" | "Tournament">("all");
  const [hosting, setHosting] = useState(false);
  const comps = db.comps.filter(c => c.gameId === gameId && (tab === "all" || c.type === tab));
  return (
    <LayerScreen title={game.name} sub={`${game.platform} · ${game.category} · 1v1`} onDark>
      <div className="relative -mx-4 -mt-4 mb-4">
        <div className="relative h-36 overflow-hidden">
          <img src={game.banner} alt={game.name} className="h-full w-full object-cover" onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
          <span className="absolute inset-0" style={{ background: "linear-gradient(rgb(6 40 23/.4), var(--bg))" }} />
        </div>
      </div>
      <div className="mb-3"><Seg options={[{ id: "all", label: "All" }, { id: "League", label: "Leagues" }, { id: "Tournament", label: "Tournaments" }]} value={tab} onChange={setTab} /></div>
      {comps.length === 0 ? (
        <Empty icon="fa-trophy" title="No leagues yet" sub="Be the first — host a league or tournament for this game.">
          <button className="btn btn-gold" onClick={() => setHosting(true)}><i className="fa-solid fa-bullhorn" />Host one</button>
        </Empty>
      ) : (
        <div className="space-y-3">{comps.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
      )}
      {hosting && <HostModal presetGameId={gameId} onClose={() => setHosting(false)} onHosted={id => { setHosting(false); pushLayer({ kind: "comp", compId: id }); }} onNeedTeam={() => setHosting(false)} />}
    </LayerScreen>
  );
}

/* ---------------- Host modal ---------------- */
export function HostModal({ presetGameId, onClose, onHosted, onNeedTeam }: { presetGameId?: string; onClose: () => void; onHosted: (id: string) => void; onNeedTeam: () => void }) {
  const { db, user, set, toast, notify } = useApp();
  const preset = presetGameId ? gameById(presetGameId) : undefined;
  const [type, setType] = useState<CompType>("League");
  const [device, setDevice] = useState<Platform>(preset?.platform ?? "Mobile");
  const [gameId, setGameId] = useState(presetGameId ?? "dls");
  const [name, setName] = useState("");
  const [size, setSize] = useState(8);
  const [format, setFormat] = useState<CompFormat>("Single Round Robin");
  const [access, setAccess] = useState<"Public" | "Private">("Public");
  const [prize, setPrize] = useState(false);
  const [fee, setFee] = useState(5);
  const [fixtureMode, setFixtureMode] = useState<"Auto" | "Manual">("Auto");
  const [resultMode, setResultMode] = useState<"Typed" | "Screenshot">("Typed");
  const [freq, setFreq] = useState<Frequency>("Daily");
  const [date, setDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState("18:00");
  const [desc, setDesc] = useState("");

  const games = GAMES.filter(g => g.platform === device);
  const sizes = type === "League" ? LEAGUE_SIZES : CUP_SIZES;
  const formats: CompFormat[] = type === "League" ? ["Single Round Robin", "Double Round Robin"] : ["Single Round Robin", "Double Round Robin", "Group Stage"];
  const fmtValid = (f: CompFormat) => type === "Tournament" && f === "Group Stage" ? size === 32 || size === 64 : true;
  const myTeam = db.teams.find(t => t.gameId === gameId);
  const endTs = new Date(`${date}T${time}:00`).getTime() + (estMatchdays(type, format, size) - 1) * FREQ_GAP[freq] * 86400000;

  const onDevice = (d: Platform) => {
    setDevice(d);
    const first = GAMES.find(g => g.platform === d);
    if (first) setGameId(first.id);
  };
  const submit = () => {
    if (!name.trim()) return toast("Give your competition a name", "fa-triangle-exclamation");
    if (!user) return;
    if (!myTeam) { toast("Create your team for this game first", "fa-shield-halved"); onNeedTeam(); return; }
    const comp: Competition = {
      id: uid(), serial: makeSerial(db.serialSeq), name: name.trim(), gameId,
      type, format: fmtValid(format) ? format : "Single Round Robin", capacity: size,
      access, prize, entryFee: prize ? fee : 0, currency: "USD",
      fixtureMode, resultMode, frequency: freq, startDate: date, startTime: time,
      description: desc.trim() || "A community competition on PenX Hub.",
      rules: "PenX Fair-Play rules apply: report results within 24h, screenshots settle disputes, host decision is final.",
      hostId: user.id, hostName: `${user.firstName} ${user.lastName}`, hostHandle: user.handle,
      joined: [{ teamId: myTeam.id, name: myTeam.name, owner: `${user.firstName} ${user.lastName}`, country: user.country, logo: myTeam.logo ?? myTeam.color }],
      requests: [], manual: [], proofs: [], scores: {},
    };
    set(d => withPoints(withNotif({ ...d, comps: [comp, ...d.comps], serialSeq: d.serialSeq + 1 }, "host", `You hosted "${comp.name}" · ${comp.serial}`), 100));
    toast("Competition hosted! +100 XP", "fa-trophy");
    notify("system", `${comp.serial} is live in ${gameById(gameId)?.name}`);
    if (access === "Private") {
      window.setTimeout(() => {
        const bot = BOTS[2];
        set(d => {
          const c = d.comps.find(x => x.id === comp.id);
          if (!c) return d;
          return withNotif({
            ...d, comps: d.comps.map(x => x.id === comp.id ? { ...x, requests: [...x.requests, { userId: bot.id, teamId: `rq-${bot.id}`, name: `${bot.name.split(" ")[0]} FC`, owner: bot.name, country: bot.country, time: Date.now() }] } : x),
          }, "request", `${bot.name} requested to join "${comp.name}"`);
        });
      }, 8000);
    }
    onHosted(comp.id);
  };

  return (
    <Modal title="Host League / Tournament" onClose={onClose} tall>
      <Row><Field label="Type"><Seg options={[{ id: "League", label: "League" }, { id: "Tournament", label: "Tournament" }]} value={type} onChange={t => { setType(t); setSize(t === "League" ? 8 : 16); setFormat(t === "League" ? "Single Round Robin" : format); }} /></Field></Row>
      <Row><Field label="Gaming device"><Seg options={[{ id: "Mobile", label: "Mobile" }, { id: "PC", label: "PC" }, { id: "Console", label: "Console" }]} value={device} onChange={onDevice} /></Field></Row>
      <Row>
        <Field label="Soccer game (filtered by device)">
          <div className="grid grid-cols-2 gap-2">
            {games.map(g => (
              <button key={g.id} onClick={() => setGameId(g.id)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-[0.74rem] font-extrabold transition-all ${gameId === g.id ? "border-[var(--forest)] bg-[color-mix(in_srgb,var(--forest)_10%,transparent)]" : "border-[var(--line)] bg-[var(--card)]"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.accent }} />{g.name}
              </button>
            ))}
          </div>
        </Field>
      </Row>
      <Row><Field label="Competition name *"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday Night Champions League" /></Field></Row>
      <Row><Field label="Team size" hint="Soccer competitions are 1v1 — one manager per team."><span className="chip bg-[var(--deep)] text-white">1v1</span></Field></Row>
      <Row>
        <Field label={`Number of teams — ${type}`}>
          <div className="flex flex-wrap gap-2">
            {sizes.map(s => (
              <button key={s} onClick={() => setSize(s)} className={`h-10 w-12 rounded-xl text-[0.8rem] font-extrabold transition-all ${size === s ? "bg-[var(--deep)] text-white shadow-md" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>{s}</button>
            ))}
          </div>
        </Field>
      </Row>
      <Row>
        <Field label={`${type} format`} hint={type === "Tournament" ? "Group Stage is valid for 32 & 64 team capacity — 8 groups of 4, top two qualify." : "Double Round Robin plays every fixture in a 1st and 2nd leg."}>
          <div className="flex flex-wrap gap-2">
            {formats.map(f => {
              const disabled = !fmtValid(f);
              return (
                <button key={f} disabled={disabled} onClick={() => setFormat(f)}
                  className={`rounded-xl px-3 py-2 text-[0.7rem] font-extrabold transition-all ${disabled ? "opacity-35 border border-[var(--line)]" : format === f ? "bg-[var(--forest)] text-white shadow-md" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>{f}</button>
              );
            })}
          </div>
        </Field>
      </Row>
      <Row>
        <Field label="Access" hint={access === "Private" ? "Users tap “Request to Join” — you accept or reject each request." : "Anyone can participate instantly."}>
          <Seg options={[{ id: "Public", label: "Public" }, { id: "Private", label: "Private" }]} value={access} onChange={setAccess} />
        </Field>
      </Row>
      <Row>
        <Field label="Reward prize?">
          <Seg options={[{ id: "no", label: "No" }, { id: "yes", label: "Yes" }]} value={prize ? "yes" : "no"} onChange={v => setPrize(v === "yes")} />
          {prize && (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3">
              <div className="flex items-end gap-3">
                <label className="flex-1"><span className="mb-1 block text-[0.64rem] font-extrabold uppercase text-[var(--mut)]">Entry fee</span>
                  <input type="number" min={1} className="input" value={fee} onChange={e => setFee(Math.max(0, Number(e.target.value)))} /></label>
                <label className="w-24"><span className="mb-1 block text-[0.64rem] font-extrabold uppercase text-[var(--mut)]">Currency</span>
                  <span className="input flex items-center gap-1.5 opacity-70"><i className="fa-solid fa-lock text-[0.6rem]" />USD</span></label>
              </div>
              <p className="mt-2 text-[0.7rem] font-extrabold text-[var(--forest)]"><i className="fa-solid fa-sack-dollar text-[var(--gold)]" /> Prize pool = fee × teams = ${fee * size} USD</p>
              <p className="mt-1 text-[0.62rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-circle-info" /> Prize payout tooling is locked for now — pools are tracked manually.</p>
            </div>
          )}
        </Field>
      </Row>
      <Row><Field label="Fixtures" hint="Auto-generate creates all fixtures once the required teams are confirmed. Manual lets you build head-to-heads yourself.">
        <Seg options={[{ id: "Auto", label: "Auto-generate" }, { id: "Manual", label: "Manual" }]} value={fixtureMode} onChange={setFixtureMode} /></Field></Row>
      <Row><Field label="Upload results" hint="Typed: you enter scores. Screenshot: teams upload proof under each fixture — reviewed, disputes forwarded to you.">
        <Seg options={[{ id: "Typed", label: "Host types" }, { id: "Screenshot", label: "Screenshots" }]} value={resultMode} onChange={setResultMode} /></Field></Row>
      <Row>
        <Field label="Match frequency" hint="Bi-daily: 2 matchdays/day · Daily: 1/day · Weekly: 1/week · Bi-weekly: 2/week.">
          <div className="flex flex-wrap gap-2">
            {(["Bi-daily", "Daily", "Weekly", "Bi-weekly"] as Frequency[]).map(f => (
              <button key={f} onClick={() => setFreq(f)} className={`rounded-xl px-3.5 py-2 text-[0.72rem] font-extrabold transition-all ${freq === f ? "bg-[var(--deep)] text-white shadow-md" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>{f}</button>
            ))}
          </div>
        </Field>
      </Row>
      <Row>
        <div className="flex gap-3">
          <label className="flex-1"><span className="mb-1 block text-[0.64rem] font-extrabold uppercase text-[var(--mut)]">Start date *</span><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="flex-1"><span className="mb-1 block text-[0.64rem] font-extrabold uppercase text-[var(--mut)]">Start time</span><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></label>
        </div>
        <p className="mt-1.5 text-[0.68rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-flag-checkered text-[var(--forest)]" /> End date is set by frequency: <strong className="text-[var(--ink)]">{fmtDay(endTs)}</strong> · {estMatchdays(type, format, size)} matchdays</p>
      </Row>
      <Row><Field label="Description & rules"><textarea className="input min-h-[92px]" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Format notes, fair-play rules, prize details…" /></Field></Row>

      <div className="card mb-4 flex items-center gap-3 border-dashed p-3">
        <i className="fa-solid fa-hashtag text-lg text-[var(--gold)]" />
        <div>
          <div className="text-[0.66rem] font-extrabold uppercase tracking-wider text-[var(--mut)]">Unique serial</div>
          <div className="font-display text-[0.9rem]">{makeSerial(db.serialSeq)}</div>
        </div>
        <span className="ml-auto chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]">Searchable</span>
      </div>

      {!myTeam && (
        <div className="mb-4 rounded-xl border border-dashed border-[#e11d48] bg-[color-mix(in_srgb,#e11d48_8%,transparent)] p-3 text-[0.72rem] font-bold text-[var(--mut)]">
          <i className="fa-solid fa-triangle-exclamation text-[#e11d48]" /> You have no {gameById(gameId)?.name} team yet — you'll create one to host (your team auto-joins).
        </div>
      )}
      <button className="btn btn-forest w-full !py-3.5" onClick={submit}><i className="fa-solid fa-bullhorn" />Create Competition</button>
    </Modal>
  );
}

