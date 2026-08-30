/* ============================================================
   PenX Hub — Teams: create/edit modal, My Teams, Team Details
   ============================================================ */
import { useRef, useState } from "react";
import type { Team } from "../data";
import { GAMES, gameById, teamAggregate, teamBusy, uid } from "../data";
import { useApp, withNotif, withPoints } from "../store";
import { Empty, Field, LayerScreen, Modal, TeamLogo } from "../ui";
import { CompCard } from "./Home";

const SWATCHES = ["#1d7544", "#0e5b63", "#8f2f4f", "#5b3a8f", "#8f5a1d", "#274d8f", "#a3341d", "#b8860b", "#3d5a17", "#146c3d"];

/** read + downscale an image file to a dataURL (keeps localStorage small) */
export function readImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(fr.result);
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/* ---------------- Team create / edit modal ---------------- */
export function TeamFormModal({ gameId, teamId, onClose, onSaved }: { gameId?: string; teamId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { db, user, set, toast, notify } = useApp();
  const editing = db.teams.find(t => t.id === teamId) ?? null;
  const busy = editing ? teamBusy(editing.id, db.comps) : null;
  const freeGames = GAMES.filter(g => !db.teams.some(t => t.gameId === g.id));
  const [gId, setGId] = useState(gameId ?? editing?.gameId ?? freeGames[0]?.id ?? "dls");
  const [name, setName] = useState(editing?.name ?? "");
  const [inGameId, setInGameId] = useState(editing?.inGameId ?? "");
  const [color, setColor] = useState(editing?.color ?? SWATCHES[0]);
  const [logo, setLogo] = useState<string | null>(editing?.logo ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const locked = !!busy;
  const save = async () => {
    if (!name.trim()) return toast("Team name is required", "fa-triangle-exclamation");
    if (locked) return toast("Team info is locked while in a competition", "fa-lock");
    if (editing) {
      set(d => ({ ...d, teams: d.teams.map(t => (t.id === editing.id ? { ...t, name: name.trim(), inGameId: inGameId.trim(), color, logo } : t)) }));
      toast("Team updated", "fa-shield-halved");
    } else {
      const team: Team = { id: uid(), gameId: gId, name: name.trim(), inGameId: inGameId.trim() || "—", color, logo };
      set(d => withPoints(withNotif({ ...d, teams: [...d.teams, team] }, "profile", `You created team "${team.name}" for ${gameById(gId)?.name}`), 20));
      toast("Team created! +20 XP", "fa-shield-halved");
    }
    notify("system", `${name.trim()} is ready for competitions.`);
    onClose();
    onSaved?.(editing?.id ?? "new");
  };

  return (
    <Modal title={editing ? "Edit Team" : "Create Team"} onClose={onClose}>
      {locked && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] p-3 text-[0.72rem] font-bold text-[var(--mut)]">
          <i className="fa-solid fa-lock text-[var(--gold)]" /> Team is in <strong className="text-[var(--ink)]">{busy!.name}</strong> — info is locked until it ends.
        </div>
      )}
      {/* crest picker */}
      <div className="mb-4 flex items-center gap-4">
        <TeamLogo logo={logo} color={color} name={name || "Team"} size={72} />
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            {SWATCHES.map(c => (
              <button key={c} aria-label={`Color ${c}`} onClick={() => { setColor(c); setLogo(null); }}
                className={`h-7 w-7 rounded-full transition-transform ${color === c && !logo ? "scale-110 ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--card)]" : ""}`} style={{ background: c }} />
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { setLogo(await readImage(f, 192)); toast("Team logo uploaded", "fa-image"); } catch { toast("Could not read image", "fa-triangle-exclamation"); }
          }} />
          <button className="btn btn-ghost !px-3 !py-2 text-[0.7rem]" onClick={() => fileRef.current?.click()}><i className="fa-solid fa-upload" />Upload logo</button>
        </div>
      </div>

      {!editing && (
        <div className="mb-4">
          <Field label="Game" hint="One team per game — only games without a team are listed.">
            <div className="flex flex-wrap gap-2">
              {freeGames.map(g => (
                <button key={g.id} onClick={() => setGId(g.id)} className={`rounded-xl px-3 py-2 text-[0.72rem] font-extrabold transition-all ${gId === g.id ? "bg-[var(--deep)] text-white" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>{g.name}</button>
              ))}
            </div>
          </Field>
        </div>
      )}
      <div className="space-y-4">
        <Field label="Team name *"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lagos Lions" disabled={locked} /></Field>
        <Field label="Team ID (in-game)" hint="If you rename your team inside the game, update it here before participating in a competition.">
          <input className="input" value={inGameId} onChange={e => setInGameId(e.target.value)} placeholder="e.g. 8842-1190" disabled={locked} />
        </Field>
      </div>
      <button className="btn btn-forest mt-5 w-full !py-3.5" onClick={save} disabled={locked}>
        <i className={`fa-solid ${editing ? "fa-floppy-disk" : "fa-plus"}`} />{editing ? "Save Changes" : "Create Team"}
      </button>
    </Modal>
  );
}

/* ---------------- My Teams screen ---------------- */
export function MyTeamsScreen() {
  const { db, pushLayer, toast } = useApp();
  const [form, setForm] = useState<{ gameId?: string; teamId?: string } | null>(null);
  const freeSlots = GAMES.filter(g => !db.teams.some(t => t.gameId === g.id)).length;
  return (
    <LayerScreen title="My Teams" sub={`${db.teams.length} team${db.teams.length === 1 ? "" : "s"} · one per game`}>
      {db.teams.length === 0 ? (
        <Empty icon="fa-shield-halved" title="No teams yet…" sub="Create your first squad — one team per game." >
          <button className="btn btn-forest" onClick={() => setForm({})}><i className="fa-solid fa-plus" />Create Team</button>
        </Empty>
      ) : (
        <div className="space-y-3">
          {db.teams.map(t => {
            const game = gameById(t.gameId);
            const busyComp = teamBusy(t.id, db.comps);
            return (
              <div key={t.id} className="card flex items-center gap-3 p-4">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => pushLayer({ kind: "team", teamId: t.id })}>
                  <TeamLogo logo={t.logo} color={t.color} name={t.name} size={52} />
                  <div className="min-w-0">
                    <div className="truncate text-[0.92rem] font-extrabold">{t.name}</div>
                    <div className="text-[0.68rem] font-bold text-[var(--mut)]">{game?.name} · ID {t.inGameId}</div>
                    <div className="mt-1">
                      {busyComp
                        ? <span className="chip bg-[color-mix(in_srgb,#16a34a_16%,transparent)] text-[#15803d] dark:text-[#4ade80]"><i className="fa-solid fa-trophy text-[0.55rem]" />{busyComp.name}</span>
                        : <span className="chip bg-[color-mix(in_srgb,var(--mut)_14%,transparent)] text-[var(--mut)]">Free agent</span>}
                    </div>
                  </div>
                </button>
                <button className="icon-btn" aria-label="Team options" onClick={() => (busyComp ? toast("Team info is locked while in a competition", "fa-lock") : setForm({ teamId: t.id }))}>
                  <i className="fa-solid fa-ellipsis-vertical" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {freeSlots > 0 && db.teams.length > 0 && (
        <button className="btn btn-ghost mt-4 w-full" onClick={() => setForm({})}><i className="fa-solid fa-plus" />New team ({freeSlots} game slot{freeSlots > 1 ? "s" : ""} free)</button>
      )}
      {form && <TeamFormModal gameId={form.gameId} teamId={form.teamId} onClose={() => setForm(null)} />}
    </LayerScreen>
  );
}

/* ---------------- Team Details screen ---------------- */
export function TeamDetailScreen({ teamId }: { teamId: string }) {
  const { db, pushLayer, toast } = useApp();
  const team = db.teams.find(t => t.id === teamId);
  const [form, setForm] = useState(false);
  if (!team) return null;
  const game = gameById(team.gameId);
  const agg = teamAggregate(team.id, db.comps);
  const busyComp = teamBusy(team.id, db.comps);
  const rows: { label: string; value: string; pct: number; icon: string }[] = [
    { label: "Goals Scored", value: String(agg.gf), pct: Math.min(100, agg.gf * 8), icon: "fa-futbol" },
    { label: "Goals Conceded", value: String(agg.ga), pct: Math.min(100, agg.ga * 8), icon: "fa-shield" },
    { label: "Goal Difference", value: (agg.gd >= 0 ? "+" : "") + agg.gd, pct: Math.min(100, Math.abs(agg.gd) * 9), icon: "fa-scale-balanced" },
    { label: "Clean Sheets", value: String(agg.cs), pct: Math.min(100, agg.cs * 14), icon: "fa-hand" },
    { label: "Win Rate", value: `${agg.winRate}%`, pct: agg.winRate, icon: "fa-percent" },
  ];
  return (
    <LayerScreen title={team.name} sub={`${game?.name} · Team ID ${team.inGameId}`}>
      <div className="stagger space-y-4">
        {/* hero */}
        <div className="pitch gold-stripes flex items-center gap-4 rounded-2xl p-5 text-white">
          <TeamLogo logo={team.logo} color={team.color} name={team.name} size={76} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display truncate text-[1.15rem] uppercase">{team.name}</h2>
            <p className="mt-0.5 text-[0.7rem] font-bold text-white/75"><i className="fa-solid fa-gamepad text-[var(--gold)]" /> {game?.name} · {game?.platform}</p>
            <button className="mt-2 text-[0.66rem] font-extrabold uppercase tracking-wider text-[var(--gold)]"
              onClick={() => (busyComp ? toast("Team info is locked while in a competition", "fa-lock") : setForm(true))}>
              <i className="fa-solid fa-pen" /> {busyComp ? "Locked (in league)" : "Edit team"}
            </button>
          </div>
        </div>

        {/* stat boxes */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: "Matches", v: agg.mp, c: "var(--forest)" },
            { l: "Wins", v: agg.w, c: "#16a34a" },
            { l: "Losses", v: agg.l, c: "#e11d48" },
            { l: "Draws", v: agg.d, c: "var(--gold)" },
          ].map(s => (
            <div key={s.l} className="card px-2 py-3 text-center">
              <div className="font-display text-[1.25rem]" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[0.58rem] font-extrabold uppercase tracking-wide text-[var(--mut)]">{s.l}</div>
            </div>
          ))}
        </div>

        {/* performance rows */}
        <div className="card p-4">
          <h3 className="mb-3 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Performance</h3>
          {rows.map(r => (
            <div key={r.label} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between text-[0.76rem] font-extrabold">
                <span className="flex items-center gap-2"><i className={`fa-solid ${r.icon} w-4 text-[var(--forest)]`} />{r.label}</span>
                <span>{r.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--forest-2),var(--gold))]" style={{ width: `${Math.max(4, r.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* active competitions */}
        <div>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Active Competitions</h3>
          {agg.active.length === 0 ? (
            <Empty icon="fa-calendar-xmark" title="No active competition" sub="This team is a free agent — join a league or tournament." />
          ) : (
            <div className="space-y-3">{agg.active.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
          )}
        </div>

        {/* past competitions */}
        <div>
          <h3 className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-[var(--mut)]">Past Competitions</h3>
          {agg.past.length === 0 ? (
            <div className="card px-4 py-3 text-[0.74rem] font-bold text-[var(--mut)]">No finished competitions yet.</div>
          ) : (
            <div className="space-y-3">{agg.past.map(c => <CompCard key={c.id} comp={c} onOpen={() => pushLayer({ kind: "comp", compId: c.id })} />)}</div>
          )}
        </div>
      </div>
      {form && <TeamFormModal teamId={team.id} onClose={() => setForm(false)} />}
    </LayerScreen>
  );
}
