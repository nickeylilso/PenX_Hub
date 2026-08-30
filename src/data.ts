/* ============================================================
   PenX Hub — data model, seed content & competition engine
   ============================================================ */

export type Platform = "Mobile" | "PC" | "Console";
export type CompType = "League" | "Tournament";
export type CompFormat = "Single Round Robin" | "Double Round Robin" | "Group Stage";
export type Frequency = "Bi-daily" | "Daily" | "Weekly" | "Bi-weekly";
export type CompStatus = "Upcoming" | "Ongoing" | "Completed";
export type ThemePref = "light" | "dark" | "system";

export interface Game { id: string; name: string; platform: Platform; category: string; banner: string; accent: string }
export interface JoinedTeam { teamId: string; name: string; owner: string; country: string; logo: string }
export interface JoinRequest { userId: string; teamId: string; name: string; owner: string; country: string; time: number }
export interface ManualFixture { id: string; homeId: string; awayId: string; date: string; hs: number | null; as: number | null }
export interface ProofShot { fixtureId: string; image: string; by: string; time: number; status: "pending" | "approved" | "disputed" }

export interface Competition {
  id: string; serial: string; name: string; gameId: string;
  type: CompType; format: CompFormat; capacity: number;
  access: "Public" | "Private";
  prize: boolean; entryFee: number; currency: string;
  fixtureMode: "Auto" | "Manual"; resultMode: "Typed" | "Screenshot";
  frequency: Frequency; startDate: string; startTime: string;
  description: string; rules: string;
  hostId: string; hostName: string; hostHandle: string;
  joined: JoinedTeam[]; requests: JoinRequest[];
  manual: ManualFixture[]; proofs: ProofShot[];
  scores: Record<string, { hs: number; as: number }>;
}

export interface Team { id: string; gameId: string; name: string; inGameId: string; color: string; logo: string | null }
export interface Account {
  id: string; firstName: string; lastName: string; handle: string; country: string;
  email: string; password: string; photo: string | null;
  dob: string; phone: string; location: string; points: number; referral: string;
}
export interface Comment { id: string; userId: string; name: string; handle: string; country: string; photo: string | null; text: string; time: number }
export interface Post {
  id: string; userId: string; name: string; handle: string; country: string; photo: string | null;
  text: string; image: string | null; time: number;
  likes: Record<string, string>; comments: Comment[];
}
export interface Msg { id: string; from: "me" | "them"; text?: string; image?: string | null; time: number }
export interface ChatThread { id: string; userId: string; name: string; handle: string; country: string; photo: string | null; online: boolean; messages: Msg[]; unread: number }
export interface Notif { id: string; kind: "join" | "host" | "profile" | "login" | "request" | "system"; text: string; time: number; read: boolean }

export const LOGO_URL = "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/6dae097e-1b0b-40ba-b99c-ca21b3181ddb.png";

/* ---------------- small utilities ---------------- */
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seeded(seed: number): () => number {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const flagEmoji = (code: string) =>
  [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
export function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* ---------------- countries ---------------- */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "NG", name: "Nigeria" }, { code: "GH", name: "Ghana" }, { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" }, { code: "EG", name: "Egypt" }, { code: "MA", name: "Morocco" },
  { code: "SN", name: "Senegal" }, { code: "CM", name: "Cameroon" }, { code: "CI", name: "Ivory Coast" },
  { code: "RW", name: "Rwanda" }, { code: "UG", name: "Uganda" }, { code: "DZ", name: "Algeria" },
  { code: "TN", name: "Tunisia" }, { code: "BR", name: "Brazil" }, { code: "AR", name: "Argentina" },
  { code: "MX", name: "Mexico" }, { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" }, { code: "ES", name: "Spain" }, { code: "FR", name: "France" },
  { code: "PT", name: "Portugal" }, { code: "NL", name: "Netherlands" }, { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" }, { code: "KR", name: "South Korea" }, { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "UAE" }, { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" },
  { code: "TR", name: "Turkey" }, { code: "CO", name: "Colombia" },
];
export const countryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;

/* ---------------- games catalog ---------------- */
export const GAMES: Game[] = [
  { id: "dls", name: "Dream League Soccer", platform: "Mobile", category: "Soccer", accent: "#1d7544", banner: "https://cdn.phototourl.com/free/2026-08-16-a615f7c3-ad6f-4c60-adc2-82ab19e7389e.jpg" },
  { id: "efootball", name: "eFootball", platform: "Mobile", category: "Soccer", accent: "#0e5b63", banner: "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/817b30da-496c-48ca-9eef-0711a7efaf2c.jpg" },
  { id: "ufl", name: "UFL", platform: "Mobile", category: "Soccer", accent: "#5b3a8f", banner: "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/658b14a3-55db-49c2-8bf7-98947723b9af.jpg" },
  { id: "fcmobile", name: "FC Mobile", platform: "Mobile", category: "Soccer", accent: "#8f2f4f", banner: "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/3516d485-540e-4629-bcc2-92f71ed10d4a.png" },
  { id: "pes", name: "PES", platform: "PC", category: "Soccer", accent: "#274d8f", banner: "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/70177bc5-c98a-42d7-b520-844042daf7e1.jpg" },
  { id: "eafc", name: "EA Sports FC", platform: "Console", category: "Soccer", accent: "#8f5a1d", banner: "https://i.supaimg.com/2f0d9563-6a2d-4bbf-9a4d-326f6ee8d0de/d39fec00-3446-4244-b923-8e0ef1c12e15.jpg" },
];
export const gameById = (id: string) => GAMES.find(g => g.id === id);

/* ---------------- seed pools ---------------- */
const TEAM_NAMES = [
  "Lagos Lions", "Accra Rockets", "Nairobi Storm", "Cairo Phantoms", "Jozi Jets", "Casablanca Kings",
  "Dakar United", "Kampala Falcons", "Kigali Warriors", "Zanzibar Sharks", "Abuja Arrows", "Kumasi Kobra",
  "London Royals", "Madrid Galacticos", "Berlin Iron", "Paris Volt", "Milano Moda", "Amsterdam Total",
  "Lisbon Navigators", "Sao Paulo Samba", "Buenos Aires Gauchos", "Mexico Aztecas", "LA Strikers",
  "Toronto Blizzard", "Seoul Dynamos", "Tokyo Samurai", "Sydney Roar", "Riyadh Oasis", "Dubai Desert",
  "Mumbai Tigers", "Jakarta Garuda", "Istanbul Crescent", "Oslo Vikings", "Lagos Waves", "Accra Flames",
  "Nairobi Rhinos", "Cairo Cobras", "Joburg Gold", "Tunis Eagles", "Oran Wolves", "Douala Dragons",
  "Kigali Hills", "Entebbe Express", "Casablanca Flame", "Rabat Royals", "Alexandria Anchors", "Giza Guardians",
  "Marrakesh Magic", "Annaba Aces", "Sousse Storm", "Durban Thunder", "Cape Town Tide", "Maputo Marlins",
  "Dar es Salaam Dolphins", "Addis Altitude", "Lusaka Lightning", "Harare Heat", "Windhoek Wanderers",
  "Freetown Stars", "Monrovia Mariners", "Bamako Bolts", "Niamey Nomads", "Banjul Beaches", "Praia Pirates",
];
const OWNERS = ["Kwame B.", "Sipho D.", "Emre K.", "Jonas W.", "Mateo R.", "Hiro T.", "Omar S.", "Nia J.", "Pedro L.", "Amir F.", "Leo M.", "Zara H."];
const LOGO_COLORS = ["#1d7544", "#0e5b63", "#8f2f4f", "#5b3a8f", "#8f5a1d", "#274d8f", "#a3341d", "#146c3d", "#b8860b", "#3d5a17"];

export const BOTS: { id: string; name: string; handle: string; country: string }[] = [
  { id: "b1", name: "Kofi Mensah", handle: "kofi_plays", country: "GH" },
  { id: "b2", name: "Amara Obi", handle: "amara_gg", country: "NG" },
  { id: "b3", name: "Tunde Ade", handle: "tunde10", country: "NG" },
  { id: "b4", name: "Zane Dube", handle: "zane_za", country: "ZA" },
  { id: "b5", name: "Leila Farouk", handle: "leila_fx", country: "EG" },
  { id: "b6", name: "Marco Silva", handle: "marco_br", country: "BR" },
  { id: "b7", name: "Jae Park", handle: "jae_kr", country: "KR" },
  { id: "b8", name: "Iva Novak", handle: "iva_goal", country: "DE" },
];

/* ---------------- serial numbers ---------------- */
export function makeSerial(seq: number): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Co${mm}${d.getFullYear()}${String(seq).padStart(5, "0")}`;
}

/* ---------------- date helpers for fixtures ---------------- */
const FREQ_GAP: Record<Frequency, number> = { "Bi-daily": 0.5, "Daily": 1, "Weekly": 7, "Bi-weekly": 3.5 };
export const matchdayLabel = (f: Frequency) => (f === "Weekly" || f === "Bi-weekly" ? "ROUND" : "MATCHDAY");

export function fixtureDate(startDate: string, startTime: string, index: number, freq: Frequency): number {
  const base = new Date(`${startDate.slice(0, 10)}T${startTime || "18:00"}:00`);
  return base.getTime() + index * FREQ_GAP[freq] * 86400000;
}
export function endDateOf(last: number): number { return last + 86400000; }

/* ---------------- fixture engine ---------------- */
export interface Fx {
  id: string; stage: string; group: string | null; matchday: number; leg: number;
  homeName: string; awayName: string; homeId: string | null; awayId: string | null;
  homeCountry: string; awayCountry: string; homeLogo: string; awayLogo: string;
  date: number; hs: number | null; as: number | null; played: boolean;
}

function rrRounds(n: number): [number, number][][] {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (n % 2 === 1) ids.push(-1);
  const m = ids.length, rounds: [number, number][][] = [];
  for (let r = 0; r < m - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < m / 2; i++) {
      const a = ids[i], b = ids[m - 1 - i];
      if (a !== -1 && b !== -1) round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    ids.splice(1, 0, ids.pop() as number);
  }
  return rounds;
}

export function knockoutRoundNames(size: number): string[] {
  const names: string[] = [];
  let s = size;
  while (s > 1) {
    names.push(s === 2 ? "Final" : s === 4 ? "Semi-finals" : s === 8 ? "Quarter-finals" : `Round of ${s}`);
    s /= 2;
  }
  return names;
}

const GROUP_LETTERS = "ABCDEFGHIJKLMNOP";

/** Build the full fixture list of a competition (auto mode) or its manual fixtures. */
export function buildFixtures(comp: Competition): Fx[] {
  const fxs = buildFixturesRaw(comp);
  const sc = comp.scores ?? {};
  fxs.forEach(f => {
    const o = sc[f.id];
    if (o) { f.hs = o.hs; f.as = o.as; f.played = true; }
  });
  return fxs;
}

function buildFixturesRaw(comp: Competition): Fx[] {
  const now = Date.now();
  const team = (i: number) => comp.joined[i];
  const mk = (id: string, stage: string, group: string | null, matchday: number, leg: number, h: JoinedTeam | null, a: JoinedTeam | null, hLabel?: string, aLabel?: string, date?: number): Fx => {
    const d = date ?? fixtureDate(comp.startDate, comp.startTime, matchday - 1, comp.frequency);
    const played = d <= now;
    let hs: number | null = null, as: number | null = null;
    if (played && h && a) {
      const r = seeded(hash(id + h.teamId + a.teamId));
      const g = () => { const x = r(); return x < 0.28 ? 0 : x < 0.56 ? 1 : x < 0.78 ? 2 : x < 0.92 ? 3 : 4; };
      hs = g(); as = g();
    }
    return {
      id, stage, group, matchday, leg,
      homeName: h ? h.name : hLabel || "TBD", awayName: a ? a.name : aLabel || "TBD",
      homeId: h?.teamId ?? null, awayId: a?.teamId ?? null,
      homeCountry: h?.country ?? "", awayCountry: a?.country ?? "",
      homeLogo: h?.logo ?? "", awayLogo: a?.logo ?? "",
      date: d, hs, as, played: played && !!h && !!a,
    };
  };

  if (comp.fixtureMode === "Manual") {
    return comp.manual.map((m, i) => {
      const h = comp.joined.find(j => j.teamId === m.homeId) ?? null;
      const a = comp.joined.find(j => j.teamId === m.awayId) ?? null;
      const d = new Date(m.date).getTime();
      return {
        id: m.id, stage: "Friendly Tie", group: null, matchday: i + 1, leg: 1,
        homeName: h?.name ?? "TBD", awayName: a?.name ?? "TBD", homeId: m.homeId, awayId: m.awayId,
        homeCountry: h?.country ?? "", awayCountry: a?.country ?? "", homeLogo: h?.logo ?? "", awayLogo: a?.logo ?? "",
        date: d, hs: m.hs, as: m.as, played: m.hs != null && m.as != null,
      };
    });
  }

  const n = comp.joined.length;
  if (n < 2) return [];
  const out: Fx[] = [];
  const isGroup = comp.type === "Tournament" && (comp.format === "Group Stage" || comp.capacity >= 32);

  if (comp.type === "League") {
    const rounds = rrRounds(n);
    rounds.forEach((pairs, r) => pairs.forEach((p, i) =>
      out.push(mk(`${comp.id}-L1-${r}-${i}`, matchdayLabel(comp.frequency), null, r + 1, 1, team(p[0]), team(p[1])))));
    if (comp.format === "Double Round Robin") {
      rounds.forEach((pairs, r) => pairs.forEach((p, i) =>
        out.push(mk(`${comp.id}-L2-${r}-${i}`, matchdayLabel(comp.frequency) + " · 2nd Leg", null, rounds.length + r + 1, 2, team(p[1]), team(p[0]), undefined, undefined,
          fixtureDate(comp.startDate, comp.startTime, rounds.length + r, comp.frequency)))));
    }
    return out;
  }

  /* ---- tournament ---- */
  if (!isGroup) {
    const double = comp.format === "Double Round Robin";
    const names = knockoutRoundNames(n);
    let size = n; let roundIdx = 0; let matchday = 1;
    const seeds = Array.from({ length: n }, (_, i) => i);
    let current = seeds;
    while (current.length > 1) {
      const ties: [number, number][] = [];
      for (let i = 0; i < current.length / 2; i++) ties.push([current[i], current[current.length - 1 - i]]);
      const legs = double ? 2 : 1;
      const winners: number[] = [];
      ties.forEach((t, i) => {
        const h = team(t[0]), a = team(t[1]);
        let w = t[0];
        for (let leg = 1; leg <= legs; leg++) {
          const fx = mk(`${comp.id}-K-${roundIdx}-${i}-${leg}`, names[roundIdx], null, matchday, leg, h, a, undefined, undefined,
            fixtureDate(comp.startDate, comp.startTime, matchday - 1, comp.frequency));
          out.push(fx);
          if (fx.played && fx.hs != null && fx.as != null) w = leg === 1 ? (fx.hs >= fx.as ? t[0] : t[1]) : (fx.hs > fx.as ? t[0] : fx.hs < fx.as ? t[1] : w);
        }
        winners.push(w);
      });
      matchday++; roundIdx++; current = winners; size /= 2;
    }
    if (double && out.length > 0) out.push(mk(`${comp.id}-GF`, "Grand Final", null, matchday, 1, null, null, "Upper Champion", "Lower Champion",
      fixtureDate(comp.startDate, comp.startTime, matchday - 1, comp.frequency)));
    return out;
  }

  /* ---- group stage then knockout ---- */
  const groupCount = Math.max(1, Math.floor(n / 4));
  const groups: JoinedTeam[][] = Array.from({ length: groupCount }, () => []);
  comp.joined.forEach((t, i) => groups[i % groupCount].push(t));
  groups.forEach((g, gi) => {
    const rounds = rrRounds(g.length);
    rounds.forEach((pairs, r) => pairs.forEach((p, i) =>
      out.push(mk(`${comp.id}-G${gi}-${r}-${i}`, matchdayLabel(comp.frequency), GROUP_LETTERS[gi], r + 1, 1, g[p[0]], g[p[1]]))));
  });
  const groupDays = 3;
  const qualified = groups.length * 2;
  const koNames = knockoutRoundNames(qualified);
  let roundIdx = 0; let matchday = groupDays + 1;
  let labels: string[] = [];
  groups.forEach((_, gi) => { labels.push(`1st · Group ${GROUP_LETTERS[gi]}`); labels.push(`2nd · Group ${GROUP_LETTERS[gi]}`); });
  /* resolve group winners directly from the group fixtures already in `out` (no recursion) */
  const groupWinners = groups.map((g, gi) => {
    const rows = tallyRows(g, out.filter(f => f.group === GROUP_LETTERS[gi] && f.played));
    return rows[0] ? g.find(t => t.teamId === rows[0].teamId) ?? null : null;
  });
  const resolveLabel = (label: string): JoinedTeam | null => {
    if (!label.startsWith("1st · Group ")) return null;
    const gi = GROUP_LETTERS.indexOf(label.slice(-1));
    return gi >= 0 ? groupWinners[gi] ?? null : null;
  };
  while (labels.length > 1) {
    const ties: [number, number][] = [];
    for (let i = 0; i < labels.length / 2; i++) ties.push([i, labels.length - 1 - i]);
    const winners: string[] = [];
    ties.forEach((t, i) => {
      const h = resolveLabel(labels[t[0]]);
      const a = resolveLabel(labels[t[1]]);
      out.push(mk(`${comp.id}-KO-${roundIdx}-${i}`, koNames[roundIdx], null, matchday, 1, h, a, labels[t[0]], labels[t[1]],
        fixtureDate(comp.startDate, comp.startTime, matchday - 1, comp.frequency)));
      winners.push(h ? `W:${h.name}` : `Winner ${koNames[roundIdx]} ·${i + 1}`);
    });
    matchday++; roundIdx++; labels = winners;
  }
  return out;
}

/* ---------------- standings ---------------- */
export interface StandingRow {
  teamId: string; name: string; country: string; logo: string;
  mp: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; trend: number;
}
/** one-pass accumulation of standings (no trend) */
function tallyRows(teams: JoinedTeam[], fxs: Fx[]): StandingRow[] {
  const map = new Map<string, StandingRow>();
  teams.forEach(t => map.set(t.teamId, { teamId: t.teamId, name: t.name, country: t.country, logo: t.logo, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, trend: 0 }));
  const use = (id: string | null) => (id && map.has(id) ? map.get(id)! : null);
  fxs.filter(f => f.hs != null && f.as != null).forEach(f => {
    const h = use(f.homeId), a = use(f.awayId);
    if (!h || !a) return;
    h.mp++; a.mp++; h.gf += f.hs!; h.ga += f.as!; a.gf += f.as!; a.ga += f.hs!;
    if (f.hs! > f.as!) { h.w++; h.pts += 3; a.l++; }
    else if (f.hs! < f.as!) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  });
  const rows = [...map.values()];
  rows.forEach(r => { r.gd = r.gf - r.ga; });
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
}

export function standingsRows(teams: JoinedTeam[], fxs: Fx[], uptoMatchday?: number): StandingRow[] {
  const considered = fxs.filter(f => f.played && (uptoMatchday == null || f.matchday <= uptoMatchday));
  const rows = tallyRows(teams, considered);
  const maxMd = Math.max(0, ...considered.map(f => f.matchday));
  const before = maxMd > 1 ? tallyRows(teams, considered.filter(f => f.matchday < maxMd)) : null;
  rows.forEach(r => {
    const prev = before ? before.find(p => p.teamId === r.teamId)?.pts ?? r.pts : r.pts;
    r.trend = r.pts > prev ? 1 : r.pts < prev ? -1 : 0;
  });
  return rows;
}

export function compStatus(comp: Competition): CompStatus {
  const fxs = buildFixtures(comp);
  const first = fxs.length ? fxs[0].date : new Date(comp.startDate).getTime();
  const last = fxs.length ? Math.max(...fxs.map(f => f.date)) : first;
  const now = Date.now();
  if (now < first) return "Upcoming";
  if (now > endDateOf(last)) return "Completed";
  return "Ongoing";
}

export function teamBusy(teamId: string, comps: Competition[]): Competition | null {
  return comps.find(c => c.joined.some(j => j.teamId === teamId) && compStatus(c) !== "Completed") ?? null;
}

/* ---------------- groups view ---------------- */
export function buildGroups(comp: Competition): { name: string; rows: StandingRow[] }[] {
  const fxs = buildFixtures(comp);
  const letters = [...new Set(fxs.filter(f => f.group).map(f => f.group as string))];
  return letters.map(L => {
    const gFxs = fxs.filter(f => f.group === L);
    const ids = [...new Set([...gFxs.map(f => f.homeId), ...gFxs.map(f => f.awayId)].filter(Boolean) as string[])];
    const teams = ids.map(id => comp.joined.find(j => j.teamId === id)).filter(Boolean) as JoinedTeam[];
    return { name: `Group ${L}`, rows: standingsRows(teams, gFxs) };
  });
}

/* ---------------- team aggregate stats ---------------- */
export function teamAggregate(teamId: string, comps: Competition[]) {
  let mp = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, cs = 0;
  const active: Competition[] = []; const past: Competition[] = [];
  comps.forEach(c => {
    if (!c.joined.some(j => j.teamId === teamId)) return;
    const st = compStatus(c);
    (st === "Completed" ? past : active).push(c);
    buildFixtures(c).filter(f => f.played && (f.homeId === teamId || f.awayId === teamId)).forEach(f => {
      const mine = f.homeId === teamId ? f.hs! : f.as!;
      const theirs = f.homeId === teamId ? f.as! : f.hs!;
      mp++; gf += mine; ga += theirs;
      if (mine > theirs) w++; else if (mine < theirs) l++; else d++;
      if (theirs === 0) cs++;
    });
  });
  return { mp, w, d, l, gf, ga, gd: gf - ga, cs, winRate: mp ? Math.round((w / mp) * 100) : 0, active, past };
}

/* ---------------- leaderboard ---------------- */
export interface LbRow { teamId: string; name: string; country: string; logo: string; gameId: string; pts: number; gf: number; w: number; comp: string }
export function leaderboard(comps: Competition[]): LbRow[] {
  const rows: LbRow[] = [];
  comps.forEach(c => {
    if (compStatus(c) !== "Ongoing") return;
    standingsRows(c.joined, buildFixtures(c)).forEach(r => {
      const ex = rows.find(x => x.teamId === r.teamId);
      if (ex) { ex.pts += r.pts; ex.gf += r.gf; ex.w += r.w; }
      else rows.push({ teamId: r.teamId, name: r.name, country: r.country, logo: r.logo, gameId: c.gameId, pts: r.pts, gf: r.gf, w: r.w, comp: c.name });
    });
  });
  return rows.sort((a, b) => b.pts - a.pts || b.gf - a.gf);
}

/* ---------------- reaction stickers (exact set) ---------------- */
export const STICKERS = ["💥", "💯", "🤠", "😉", "😎", "❤️", "😁", "👌", "🤑", "😭", "🎉", "🌍", "🌐", "🌏", "🌎", "⚽️", "🥅"];

/* ---------------- seed builders ---------------- */
function seedTeamsFor(compId: string, count: number, salt: number): JoinedTeam[] {
  const r = seeded(hash(compId) + salt);
  const out: JoinedTeam[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let ni = Math.floor(r() * TEAM_NAMES.length);
    while (used.has(ni)) ni = (ni + 1) % TEAM_NAMES.length;
    used.add(ni);
    out.push({
      teamId: `st-${compId}-${i}`, name: TEAM_NAMES[ni],
      owner: OWNERS[Math.floor(r() * OWNERS.length)],
      country: COUNTRIES[Math.floor(r() * COUNTRIES.length)].code,
      logo: LOGO_COLORS[Math.floor(r() * LOGO_COLORS.length)],
    });
  }
  return out;
}
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

export function seedCompetitions(seqStart: number): Competition[] {
  const host = (i: number) => ({ hostId: BOTS[i].id, hostName: BOTS[i].name, hostHandle: BOTS[i].handle });
  const defs: Array<Partial<Competition> & { name: string; gameId: string; type: CompType; format: CompFormat; capacity: number; joinedCount: number; start: number; frequency: Frequency; access?: "Public" | "Private"; prize?: boolean; fee?: number; desc: string }> = [
    { name: "Premier Showdown League", gameId: "dls", type: "League", format: "Single Round Robin", capacity: 10, joinedCount: 10, start: -6, frequency: "Daily", prize: true, fee: 5, desc: "The flagship DLS league of PenX Hub. Winner takes the Golden Boot trophy and the prize pool. Respect the ref, respect the opponent." },
    { name: "Kings Cup Mobile", gameId: "efootball", type: "Tournament", format: "Single Round Robin", capacity: 16, joinedCount: 16, start: -4, frequency: "Bi-daily", prize: true, fee: 3, desc: "Straight knockout glory. One leg, no second chances. Bring your best squad and stable connection." },
    { name: "Golden Boot League", gameId: "fcmobile", type: "League", format: "Double Round Robin", capacity: 8, joinedCount: 6, start: 5, frequency: "Weekly", desc: "Home & away legs decide everything. Long-format league for patient tacticians of FC Mobile." },
    { name: "UFL Masters Cup", gameId: "ufl", type: "Tournament", format: "Group Stage", capacity: 32, joinedCount: 32, start: -10, frequency: "Daily", prize: true, fee: 2, desc: "8 groups of 4. Top two qualify to the Round of 16. 3 points for a win, 1 for a draw. The road to the Final starts here." },
    { name: "Continental PC League", gameId: "pes", type: "League", format: "Single Round Robin", capacity: 12, joinedCount: 12, start: -80, frequency: "Bi-weekly", desc: "Classic PES on PC. A completed season of grit, goals and glory — check the final standings." },
    { name: "Pro Champions Cup", gameId: "eafc", type: "Tournament", format: "Single Round Robin", capacity: 8, joinedCount: 8, start: -32, frequency: "Daily", desc: "Console knockout on EA Sports FC. Quarter-finals to Final — a finished bracket with champions crowned." },
    { name: "Invitational Sixes", gameId: "dls", type: "League", format: "Single Round Robin", capacity: 6, joinedCount: 3, start: 2, frequency: "Daily", access: "Private", desc: "Private invitational league. Request to join — the host reviews every request personally." },
    { name: "eFootball Weekly Warm-up", gameId: "efootball", type: "League", format: "Single Round Robin", capacity: 4, joinedCount: 2, start: 8, frequency: "Weekly", desc: "A cosy 4-team warm-up league. Perfect for new managers finding their feet." },
  ];
  return defs.map((d, i) => ({
    id: `c${i + 1}`, serial: makeSerial(seqStart + i), name: d.name, gameId: d.gameId,
    type: d.type, format: d.format, capacity: d.capacity,
    access: d.access ?? "Public", prize: d.prize ?? false, entryFee: d.fee ?? 0, currency: "USD",
    fixtureMode: "Auto", resultMode: "Typed",
    frequency: d.frequency, startDate: iso(d.start), startTime: "18:00",
    description: d.desc,
    rules: "Standard PenX Fair-Play rules: results within 24h, screenshots on dispute, no account sharing, no time-wasting. Host decision is final on disputes.",
    ...host(i % BOTS.length),
    joined: seedTeamsFor(`c${i + 1}`, d.joinedCount, i),
    requests: [], manual: [], proofs: [], scores: {},
  })) as Competition[];
}

export function seedPosts(): Post[] {
  const h = (n: number) => Date.now() - n * 3600000;
  return [
    {
      id: "p1", userId: "b1", name: "Kofi Mensah", handle: "kofi_plays", country: "GH", photo: null,
      text: "Just hosted my first league on PenX Hub ⚽️ 10 teams, daily matchdays, and a real prize pool. The fixture generator did everything for me — GG!",
      image: null, time: h(2),
      likes: { b2: "💯", b3: "⚽️", b4: "🔥" },
      comments: [
        { id: "cm1", userId: "b2", name: "Amara Obi", handle: "amara_gg", country: "NG", photo: null, text: "Serial code? I want in 🔥", time: h(1.6) },
        { id: "cm2", userId: "b4", name: "Zane Dube", handle: "zane_za", country: "ZA", photo: null, text: "Hosting on mobile is so smooth here.", time: h(1.1) },
      ],
    },
    {
      id: "p2", userId: "b5", name: "Leila Farouk", handle: "leila_fx", country: "EG", photo: null,
      text: "Matchday 7 of the Premier Showdown League and my Lagos Lions are TOP. Clean sheet streak: 4 🥅 Come at me.",
      image: null, time: h(6),
      likes: { b1: "🥅", b6: "😎" },
      comments: [{ id: "cm3", userId: "b6", name: "Marco Silva", handle: "marco_br", country: "BR", photo: null, text: "That defence is illegal 😭", time: h(5) }],
    },
    {
      id: "p3", userId: "b7", name: "Jae Park", handle: "jae_kr", country: "KR", photo: null,
      text: "Refer your squad to PenX Hub — every referral bumps your points. My whole clan is on here now 🌏",
      image: null, time: h(14),
      likes: { b8: "🌏", b2: "💥", b1: "💥" },
      comments: [],
    },
    {
      id: "p4", userId: "b8", name: "Iva Novak", handle: "iva_goal", country: "DE", photo: null,
      text: "UFL Masters Cup group stage is STACKED this season. 8 groups, 32 teams, top two go through. Predictions? 👇",
      image: null, time: h(26),
      likes: { b3: "💯", b5: "😉" },
      comments: [{ id: "cm4", userId: "b3", name: "Tunde Ade", handle: "tunde10", country: "NG", photo: null, text: "Group C is the group of death, calling it now.", time: h(20) }],
    },
  ];
}

const REPLIES = [
  "GG! Let's run it 🔥", "Send me the serial, I'm in.", "My squad is ready. Matchday when?",
  "Nice one! See you on the pitch ⚽️", "Host a tournament next, I'll bring 4 teams.",
  "That last fixture was crazy 😭", "Respect. Rematch this weekend?",
];
export const botReply = (i: number) => REPLIES[i % REPLIES.length];

export function seedChats(): ChatThread[] {
  const h = (n: number) => Date.now() - n * 3600000;
  return [
    {
      id: "ch1", userId: "b1", name: "Kofi Mensah", handle: "kofi_plays", country: "GH", photo: null, online: true, unread: 2,
      messages: [
        { id: "m1", from: "them", text: "Yo! You joining the Premier Showdown League?", time: h(3) },
        { id: "m2", from: "me", text: "Thinking about it — which game is it on?", time: h(2.8) },
        { id: "m3", from: "them", text: "Dream League Soccer, daily matchdays. Prize pool too 💰", time: h(2.5) },
        { id: "m4", from: "them", text: "Create your team and jump in, slots are filling!", time: h(2.4) },
      ],
    },
    {
      id: "ch2", userId: "b2", name: "Amara Obi", handle: "amara_gg", country: "NG", photo: null, online: true, unread: 1,
      messages: [
        { id: "m5", from: "them", text: "Your defence last matchday was a wall 🥅", time: h(20) },
        { id: "m6", from: "me", text: "Clean sheet mentality 😤", time: h(19.5) },
        { id: "m7", from: "them", text: "Rematch this weekend? I'm hosting.", time: h(5) },
      ],
    },
    {
      id: "ch3", userId: "b5", name: "Leila Farouk", handle: "leila_fx", country: "EG", photo: null, online: false, unread: 0,
      messages: [
        { id: "m8", from: "me", text: "GG on the semi-final!", time: h(50) },
        { id: "m9", from: "them", text: "GGs! The bracket feature here is so clean.", time: h(48) },
      ],
    },
    {
      id: "ch4", userId: "b7", name: "Jae Park", handle: "jae_kr", country: "KR", photo: null, online: true, unread: 3,
      messages: [
        { id: "m10", from: "them", text: "Bro the new rankings tab looks like FIFA cards 😎", time: h(8) },
        { id: "m11", from: "them", text: "Your team is #4 in the world board", time: h(7.6) },
        { id: "m12", from: "them", text: "Push for top 3!", time: h(7.5) },
      ],
    },
  ];
}

export function initialPoints(): number { return 120; }
