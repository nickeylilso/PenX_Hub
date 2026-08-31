/* ============================================================
   PenX Hub — Updates: Chats (+ friendlies), Community feed, Drawer
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { ChatThread, Friendly, Post } from "../data";
import { GAMES, STICKERS, botReply, fmtClock, friendlyDeadline, friendlyExpired, gameById, timeAgo, threadForUser, uid } from "../data";
import type { Platform } from "../data";
import { identityOf, useApp, withNotif } from "../store";
import { Avatar, Empty, Field, FlagBadge, LayerScreen, Logo, Modal, Seg } from "../ui";
import { readImage } from "./Teams";

/* ---------------- Updates page ---------------- */
export function UpdatesScreen() {
  const { db, pushLayer } = useApp();
  const [view, setView] = useState<"chats" | "community">("community");
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const chats = db.chats.filter(c => !ql || c.name.toLowerCase().includes(ql) || c.handle.includes(ql));
  const posts = db.posts.filter(p => !ql || p.text.toLowerCase().includes(ql) || p.name.toLowerCase().includes(ql) || p.handle.includes(ql));

  return (
    <div className="mx-auto max-w-md px-4 pb-32">
      {/* sticky header with hamburger (bell hidden here by design) */}
      <div className="sticky-bar -mx-4 px-4">
        <div className="mx-auto flex max-w-md items-center justify-between py-3">
          <h1 className="font-display text-[1.05rem] uppercase tracking-wide">Updates</h1>
          <button className="icon-btn" aria-label="Menu" onClick={() => pushLayer({ kind: "drawer" })}><i className="fa-solid fa-bars" /></button>
        </div>
        <div className="mx-auto max-w-md pb-3">
          <div className="mb-3 flex gap-2">
            {(["chats", "community"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`flex-1 rounded-xl py-2.5 text-[0.72rem] font-extrabold uppercase tracking-wide transition-all ${view === v ? "bg-[var(--deep)] text-white shadow-md" : "border border-[var(--line)] bg-[var(--card)] text-[var(--mut)]"}`}>
                <i className={`fa-solid ${v === "chats" ? "fa-comments" : "fa-users"} mr-1.5`} />{v}
              </button>
            ))}
          </div>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={view === "chats" ? "Search chats…" : "Search posts & people…"} className="input !py-2.5 !pl-11" />
          </div>
        </div>
      </div>

      {view === "chats" ? (
        <div className="stagger mt-4">
          {chats.length === 0 ? <Empty icon="fa-comments" title="No chats" sub="Conversations with fellow managers appear here." /> : (
            <div className="card divide-y divide-[var(--line)]">
              {chats.map(c => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <button key={c.id} onClick={() => pushLayer({ kind: "chat", chatId: c.id })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <span className="relative">
                      <Avatar photo={c.photo} name={c.name} country={c.country} size={48} />
                      {c.online && <span className="live-dot absolute right-0 top-0.5 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[var(--card)]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between">
                        <span className="truncate text-[0.84rem] font-extrabold">{c.name}</span>
                        <span className="ml-2 shrink-0 text-[0.6rem] font-bold text-[var(--mut)]">{last ? timeAgo(last.time) : ""}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[0.7rem] font-semibold text-[var(--mut)]">
                          {last?.from === "me" && <span className="text-[var(--forest)]">You: </span>}
                          {last?.friendlyId ? "🎮 Friendly match" : last?.image ? "📷 Photo" : last?.text ?? "Say hello…"}
                        </span>
                        {last?.image && <img src={last.image} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />}
                      </span>
                    </span>
                    {c.unread > 0 && <span className="font-display flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e11d48] px-1.5 text-[0.62rem] text-white">{c.unread}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <Composer />
          {posts.length === 0 ? <Empty icon="fa-newspaper" title="No posts" sub="Be the first to share something with the community." /> : posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}

/* ---------------- composer ---------------- */
function Composer() {
  const { user, set, toast } = useApp();
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canPost = text.trim().length > 0 || !!img;
  const submit = () => {
    if (!canPost || !user) return;
    const post: Post = {
      id: uid(), userId: user.id, name: `${user.firstName} ${user.lastName}`, handle: user.handle,
      country: user.country, photo: user.photo, text: text.trim(), image: img, time: Date.now(), likes: {}, comments: [],
    };
    set(d => ({ ...d, posts: [post, ...d.posts] }));
    setText(""); setImg(null);
    toast("Posted to the community!", "fa-bullhorn");
  };
  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar photo={user?.photo ?? null} name={`${user?.firstName} ${user?.lastName}`} country={user?.country} size={42} />
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share a moment, a result, a rivalry…" className="input min-h-[74px] flex-1 resize-none" />
      </div>
      {img && (
        <div className="relative mt-3">
          <img src={img} alt="preview" className="max-h-56 w-full rounded-xl object-cover" />
          <button className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white" onClick={() => setImg(null)} aria-label="Remove image"><i className="fa-solid fa-xmark text-[0.7rem]" /></button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f) return;
        try { setImg(await readImage(f, 640)); } catch { toast("Could not read image", "fa-triangle-exclamation"); }
        e.target.value = "";
      }} />
      <div className="mt-3 flex items-center justify-between">
        <button className="icon-btn" aria-label="Attach image" onClick={() => fileRef.current?.click()}><i className="fa-regular fa-image text-[var(--forest)]" /></button>
        <button className="btn btn-forest !px-5 !py-2.5" disabled={!canPost} onClick={submit}><i className="fa-solid fa-paper-plane" />Post</button>
      </div>
    </div>
  );
}

/* ---------------- post with press-and-hold reactions ---------------- */
function PostCard({ post }: { post: Post }) {
  const { user, set, toast, pushLayer } = useApp();
  const [picker, setPicker] = useState(false);
  const [openComments, setOpenComments] = useState(false);
  const [comment, setComment] = useState("");
  const holdTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  if (!user) return null;
  const mySticker = post.likes[user.id] ?? null;
  const likeCount = Object.keys(post.likes).length;

  const setLike = (sticker: string | null) => {
    set(d => ({
      ...d, posts: d.posts.map(p => {
        if (p.id !== post.id) return p;
        const likes = { ...p.likes };
        if (sticker) likes[user.id] = sticker; else delete likes[user.id];
        return { ...p, likes };
      }),
    }));
  };
  const startHold = () => {
    longPressed.current = false;
    holdTimer.current = window.setTimeout(() => { longPressed.current = true; setPicker(true); }, 430);
  };
  const endHold = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); };
  const onClickLike = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    setLike(mySticker ? null : "👍🏽");
  };
  const addComment = () => {
    if (!comment.trim()) return;
    set(d => ({
      ...d, posts: d.posts.map(p => p.id === post.id ? { ...p, comments: [...p.comments, { id: uid(), userId: user.id, name: `${user.firstName} ${user.lastName}`, handle: user.handle, country: user.country, photo: user.photo, text: comment.trim(), time: Date.now() }] } : p),
    }));
    setComment("");
  };

  return (
    <article className="card fade-up p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => pushLayer({ kind: "user", userId: post.userId })}><Avatar photo={post.photo} name={post.name} country={post.country} size={44} /></button>
        <div className="min-w-0 flex-1">
          <button className="flex items-center gap-1.5 text-[0.84rem] font-extrabold" onClick={() => pushLayer({ kind: "user", userId: post.userId })}>{post.name}<FlagBadge country={post.country} size={15} /></button>
          <button className="text-[0.64rem] font-bold text-[var(--mut)]" onClick={() => pushLayer({ kind: "user", userId: post.userId })}>@{post.handle}</button>
          <span className="text-[0.64rem] font-bold text-[var(--mut)]"> · {timeAgo(post.time)}</span>
        </div>
        <i className="fa-solid fa-futbol text-[var(--line)]" />
      </div>
      {post.text && <p className="mt-3 text-[0.84rem] font-semibold leading-relaxed">{post.text}</p>}
      {post.image && <img src={post.image} alt="" className="mt-3 max-h-72 w-full rounded-xl object-cover" />}

      {/* actions */}
      <div className="mt-3.5 flex items-center gap-2 border-t border-[var(--line)] pt-3">
        <button className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[0.74rem] font-extrabold transition-all active:scale-95"
          style={mySticker ? { background: "color-mix(in srgb, var(--gold) 16%, transparent)" } : undefined}
          onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onClick={onClickLike}>
          <span className="text-[1.05rem] leading-none">{mySticker ?? "👍🏽"}</span>
          <span style={mySticker ? { color: "var(--gold)" } : { color: "var(--mut)" }}>{likeCount}</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[0.74rem] font-extrabold text-[var(--mut)] transition-all active:scale-95" onClick={() => setOpenComments(!openComments)}>
          <i className="fa-regular fa-comment" />{post.comments.length}
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[0.74rem] font-extrabold text-[var(--mut)] transition-all active:scale-95" onClick={() => toast("Post shared", "fa-share-nodes")}>
          <i className="fa-solid fa-share-nodes" />Share
        </button>
      </div>

      {/* comments thread */}
      {openComments && (
        <div className="fade-up mt-3 space-y-2.5 rounded-xl bg-[color-mix(in_srgb,var(--forest)_5%,transparent)] p-3">
          {post.comments.length === 0 && <p className="text-center text-[0.7rem] font-bold text-[var(--mut)]">No comments yet — start the banter.</p>}
          {post.comments.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar photo={c.photo} name={c.name} country={c.country} size={30} />
              <div className="min-w-0 flex-1 rounded-xl bg-[var(--card)] px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.7rem] font-extrabold">{c.name}</span>
                  <span className="shrink-0 text-[0.56rem] font-bold text-[var(--mut)]">{fmtClock(c.time)} · {timeAgo(c.time)}</span>
                </div>
                <p className="text-[0.74rem] font-semibold">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Avatar photo={user.photo} name={`${user.firstName} ${user.lastName}`} country={user.country} size={30} />
            <input className="input !py-2 text-[0.76rem]" placeholder="Write a comment…" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} />
            <button className="icon-btn !h-10 !w-10" onClick={addComment} aria-label="Send comment"><i className="fa-solid fa-paper-plane text-[var(--forest)]" /></button>
          </div>
        </div>
      )}

      {picker && (
        <Modal title="React with a sticker" onClose={() => setPicker(false)}>
          <p className="mb-3 text-[0.72rem] font-semibold text-[var(--mut)]">Pick one — it replaces your like sticker and counts as a like.</p>
          <div className="grid grid-cols-6 gap-2">
            {STICKERS.map(s => (
              <button key={s} className={`flex h-12 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-110 active:scale-95 ${mySticker === s ? "bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] ring-2 ring-[var(--gold)]" : "bg-[color-mix(in_srgb,var(--forest)_7%,transparent)]"}`}
                onClick={() => { setLike(s); setPicker(false); }}>{s}</button>
            ))}
          </div>
        </Modal>
      )}
    </article>
  );
}

/* ============================================================
   FRIENDLIES — hosted from the chat gamepad button
   ============================================================ */
function FriendlyModal({ chat, onClose }: { chat: ChatThread; onClose: () => void }) {
  const { user, set, toast } = useApp();
  const [device, setDevice] = useState<Platform>("Mobile");
  const [gameId, setGameId] = useState("dls");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  if (!user) return null;
  const games = GAMES.filter(g => g.platform === device);

  const invite = () => {
    const f: Friendly = {
      id: uid(), hostId: user.id, guestId: chat.userId, gameId, device,
      date, status: "pending", hostInput: null, guestInput: null, mismatch: false, score: null, createdAt: Date.now(),
    };
    set(d => ({
      ...d,
      friendlies: [...d.friendlies, f],
      chats: d.chats.map(c => c.id === chat.id ? { ...c, messages: [...c.messages, { id: uid(), from: "me" as const, friendlyId: f.id, text: `🎮 Friendly invite — ${gameById(gameId)?.name} on ${new Date(`${date}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, time: Date.now() }] } : c),
    }));
    toast(`Friendly invite sent to ${chat.name}`, "fa-gamepad");
    onClose();
  };

  return (
    <Modal title="Host a friendly" onClose={onClose}>
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--forest)_7%,transparent)] p-3">
        <Avatar photo={chat.photo} name={chat.name} country={chat.country} size={42} />
        <div>
          <div className="text-[0.8rem] font-extrabold">{chat.name}</div>
          <div className="text-[0.64rem] font-bold text-[var(--mut)]">@{chat.handle} · winner takes +5 XP</div>
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Game type"><Seg options={[{ id: "Mobile", label: "Mobile" }, { id: "PC", label: "PC" }, { id: "Console", label: "Console" }]} value={device} onChange={d => { setDevice(d); const g = GAMES.find(x => x.platform === d); if (g) setGameId(g.id); }} /></Field>
        <Field label="Category"><span className="chip bg-[var(--deep)] text-white"><i className="fa-solid fa-futbol text-[var(--gold)]" />Soccer</span></Field>
        <Field label="Game">
          <div className="flex flex-wrap gap-2">
            {games.map(g => (
              <button key={g.id} onClick={() => setGameId(g.id)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[0.72rem] font-extrabold transition-all ${gameId === g.id ? "border-[var(--forest)] bg-[color-mix(in_srgb,var(--forest)_10%,transparent)]" : "border-[var(--line)] bg-[var(--card)]"}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: g.accent }} />{g.name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Date to play" hint="Both managers must input the result before 11:59 PM on this date — otherwise the friendly is cancelled.">
          <input type="date" min={today} className="input" value={date} onChange={e => setDate(e.target.value || today)} />
        </Field>
        <button className="btn btn-gold w-full !py-3.5" onClick={invite}><i className="fa-solid fa-paper-plane" />Invite</button>
      </div>
    </Modal>
  );
}

/* in-chat friendly card — invite · accept · input result · full-time */
function FriendlyCard({ friendlyId }: { friendlyId: string }) {
  const { db, user, set, toast, notify } = useApp();
  const [h, setH] = useState(""); const [g, setG] = useState("");
  const f = db.friendlies.find(x => x.id === friendlyId);
  if (!f || !user) return null;
  const expired = friendlyExpired(f);
  const iAmHost = f.hostId === user.id;
  const oppId = iAmHost ? f.guestId : f.hostId;
  const opp = identityOf(db, oppId);
  const game = gameById(f.gameId);
  const myInput = iAmHost ? f.hostInput : f.guestInput;
  const oppInput = iAmHost ? f.guestInput : f.hostInput;
  const hostName = identityOf(db, f.hostId)?.name.split(" ")[0] ?? "Host";
  const guestName = identityOf(db, f.guestId)?.name.split(" ")[0] ?? "Guest";

  const patchF = (fn: (x: Friendly) => Friendly) => set(d => ({ ...d, friendlies: d.friendlies.map(x => x.id === f.id ? fn(x) : x) }));
  const say = (text: string) => set(d => ({
    ...d, chats: d.chats.map(c => c.userId === oppId ? { ...c, messages: [...c.messages, { id: uid(), from: "them" as const, text, time: Date.now() }] } : c),
  }));

  const submit = () => {
    const hv = Number(h), gv = Number(g);
    if (h === "" || g === "" || Number.isNaN(hv) || Number.isNaN(gv) || hv < 0 || gv < 0) return toast("Enter both scores", "fa-triangle-exclamation");
    const mine = { h: hv, g: gv };
    const other = oppInput;
    if (other && (other.h !== hv || other.g !== gv)) {
      patchF(x => ({ ...x, hostInput: iAmHost ? null : x.hostInput, guestInput: iAmHost ? x.guestInput : null, mismatch: true }));
      say(`Hmm, our results don't match 🤔 I had it ${other.h}–${other.g}. Let's both input the result again.`);
      notify("friendly", `Friendly vs ${opp?.name}: results mismatched — input the result again.`);
      toast("Results didn't match — input again", "fa-rotate");
    } else if (other) {
      patchF(x => ({ ...x, status: "played", score: { h: hv, g: gv } }));
      say(`Full-time confirmed: ${hv}–${gv} ⚽ GG!`);
      notify("friendly", `Friendly vs ${opp?.name} finished ${hv}–${gv} — XP added to your board.`);
      toast("Friendly confirmed — XP added!", "fa-trophy");
    } else {
      patchF(x => (iAmHost ? { ...x, hostInput: mine } : { ...x, guestInput: mine }));
      toast("Result saved — waiting for the other manager", "fa-hourglass-half");
    }
    setH(""); setG("");
  };

  const statusChip = expired
    ? <span className="chip bg-[color-mix(in_srgb,#e11d48_16%,transparent)] text-[#e11d48]">Cancelled</span>
    : f.status === "pending" ? <span className="chip bg-[var(--gold-soft)] text-[#7a5a06] dark:text-[var(--gold)]">Pending</span>
    : f.status === "accepted" ? <span className="chip bg-[color-mix(in_srgb,#16a34a_16%,transparent)] text-[#15803d] dark:text-[#4ade80]"><span className="live-dot h-1.5 w-1.5 rounded-full bg-[#22c55e]" />Accepted</span>
    : <span className="chip bg-[var(--deep)] text-[var(--gold)]">Full-time</span>;

  return (
    <div className="w-full max-w-[86%] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-md">
      <div className="pitch flex items-center justify-between px-3.5 py-2.5 text-white">
        <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em]"><i className="fa-solid fa-gamepad text-[var(--gold)]" /> Friendly · {game?.name}</span>
        {statusChip}
      </div>
      <div className="space-y-2.5 p-3.5">
        <div className="flex items-center justify-between text-[0.74rem] font-extrabold">
          <span className="min-w-0 flex-1 truncate text-right">{hostName} {iAmHost ? "(you)" : ""}</span>
          <span className="font-display mx-2 text-[var(--gold)]">{f.status === "played" && f.score ? `${f.score.h}–${f.score.g}` : "VS"}</span>
          <span className="min-w-0 flex-1 truncate">{guestName} {!iAmHost ? "(you)" : ""}</span>
        </div>
        <div className="text-center text-[0.6rem] font-bold text-[var(--mut)]">
          <i className="fa-regular fa-calendar" /> {new Date(`${f.date}T12:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {game?.platform} · result due before 11:59 PM
          {f.mismatch && f.status === "accepted" && <span className="mt-0.5 block text-[#e11d48]"><i className="fa-solid fa-triangle-exclamation" /> Results didn't match — both input again</span>}
        </div>

        {/* guest accepts the invite (when the other side hosts) */}
        {f.status === "pending" && !iAmHost && !expired && (
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1 !py-2 text-[0.7rem]" onClick={() => { patchF(x => ({ ...x, status: "cancelled" })); say("No worries — maybe next time!"); }}>Decline</button>
            <button className="btn btn-forest flex-1 !py-2 text-[0.7rem]" onClick={() => { patchF(x => ({ ...x, status: "accepted" })); toast("Friendly accepted — see you on the pitch", "fa-circle-check"); notify("friendly", `You accepted ${opp?.name}'s friendly — play on ${f.date}.`); }}><i className="fa-solid fa-check" />Accept</button>
          </div>
        )}
        {f.status === "pending" && iAmHost && !expired && (
          <p className="text-center text-[0.64rem] font-bold text-[var(--mut)]"><i className="fa-solid fa-hourglass-half text-[var(--gold)]" /> Waiting for {opp?.name.split(" ")[0]} to accept…</p>
        )}

        {/* input result once accepted */}
        {f.status === "accepted" && !expired && (
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--forest)_6%,transparent)] p-2.5">
            {myInput ? (
              <p className="text-center text-[0.66rem] font-bold text-[var(--forest)]"><i className="fa-solid fa-circle-check" /> You entered {myInput.h}–{myInput.g}{oppInput ? " — comparing…" : ` — waiting for ${opp?.name.split(" ")[0]}`}</p>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[0.6rem] font-extrabold uppercase text-[var(--mut)]">{hostName}</span>
                  <input type="number" min={0} inputMode="numeric" placeholder="0" className="input !w-14 !px-1.5 !py-1.5 text-center font-display" value={h} onChange={e => setH(e.target.value)} />
                  <span className="font-display text-[var(--mut)]">–</span>
                  <input type="number" min={0} inputMode="numeric" placeholder="0" className="input !w-14 !px-1.5 !py-1.5 text-center font-display" value={g} onChange={e => setG(e.target.value)} />
                  <span className="text-[0.6rem] font-extrabold uppercase text-[var(--mut)]">{guestName}</span>
                </div>
                <button className="btn btn-forest mt-2 w-full !py-2 text-[0.68rem]" onClick={submit}><i className="fa-solid fa-keyboard" />Input Result</button>
              </>
            )}
          </div>
        )}
        {expired && <p className="text-center text-[0.64rem] font-bold text-[#e11d48]"><i className="fa-solid fa-ban" /> Not played before 11:59 PM on {new Date(`${f.date}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })} — cancelled.</p>}
        {f.status === "played" && f.score && (
          <p className="text-center text-[0.66rem] font-extrabold text-[var(--forest)]">
            {(iAmHost ? f.score.h > f.score.g : f.score.g > f.score.h) ? "You won! +5 XP" : (f.score.h === f.score.g ? "A draw — +3 XP each" : `${opp?.name.split(" ")[0]} takes it — +2 XP for the fight`)} ⚽
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- chat overlay ---------------- */
export function ChatScreen({ chatId }: { chatId: string }) {
  const { db, user, set, notify } = useApp();
  const chat = db.chats.find(c => c.id === chatId);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [friendlyOpen, setFriendlyOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replyCount = useRef(0);
  const scheduled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (chat && chat.unread > 0)
      set(d => ({ ...d, chats: d.chats.map(c => (c.id === chatId ? { ...c, unread: 0 } : c)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  /* friendly engine — the bot opponent accepts invites, inputs results, expires stale friendlies */
  useEffect(() => {
    if (!chat || !user) return;
    db.friendlies.forEach(f => {
      const mine = f.hostId === user.id || f.guestId === user.id;
      const withBot = f.hostId === chat.userId || f.guestId === chat.userId;
      if (!mine || !withBot) return;
      const key = `${f.id}:${f.status}`;
      if (friendlyExpired(f)) {
        if (scheduled.current.has(`${f.id}:expire`)) return;
        scheduled.current.add(`${f.id}:expire`);
        set(d => ({
          ...d, friendlies: d.friendlies.map(x => x.id === f.id ? { ...x, status: "cancelled" } : x),
          chats: d.chats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, { id: uid(), from: "them" as const, text: "⌛ The friendly wasn't played before 11:59 PM — it's been cancelled. Rematch soon?", time: Date.now() }] } : c),
        }));
        return;
      }
      if (f.status === "pending" && f.hostId === user.id) {
        if (scheduled.current.has(key)) return;
        scheduled.current.add(key);
        window.setTimeout(() => {
          scheduled.current.delete(key);
          set(d => {
            const still = d.friendlies.find(x => x.id === f.id);
            if (!still || still.status !== "pending") return d; // already handled
            return withNotif({
              ...d,
              friendlies: d.friendlies.map(x => x.id === f.id ? { ...x, status: "accepted" } : x),
              chats: d.chats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, { id: uid(), from: "them" as const, text: "Friendly accepted! 🎮 Bring your best squad.", time: Date.now() }] } : c),
            }, "friendly", `${chat.name} accepted your friendly — play on ${f.date}.`);
          });
        }, 1900);
      }
      if (f.status === "accepted") {
        const botIsHost = f.hostId === chat.userId;
        const botInput = botIsHost ? f.hostInput : f.guestInput;
        const myInput = botIsHost ? f.guestInput : f.hostInput;
        if (botInput || scheduled.current.has(`${f.id}:input`)) return;
        scheduled.current.add(`${f.id}:input`);
        window.setTimeout(() => {
          scheduled.current.delete(`${f.id}:input`);
          const r = () => Math.floor(Math.random() * 4);
          /* 60% of the time echo the manager's saved input so friendlies confirm naturally */
          const input = myInput && Math.random() < 0.6 ? { ...myInput } : { h: r(), g: r() };
          set(d => {
            const still = d.friendlies.find(x => x.id === f.id);
            if (!still || still.status !== "accepted" || (botIsHost ? still.hostInput : still.guestInput)) return d;
            const opp = botIsHost ? still.guestInput : still.hostInput;
            let next = { ...d, friendlies: d.friendlies.map(x => x.id === f.id ? (botIsHost ? { ...x, hostInput: input } : { ...x, guestInput: input }) : x) };
            let text: string;
            if (opp) {
              if (opp.h === input.h && opp.g === input.g) {
                next = { ...next, friendlies: next.friendlies.map(x => x.id === f.id ? { ...x, status: "played", score: { h: input.h, g: input.g } } : x) };
                text = `Full-time confirmed: ${input.h}–${input.g} ⚽ GG!`;
                next = withNotif(next, "friendly", `Friendly vs ${chat.name} finished ${input.h}–${input.g} — XP added.`);
              } else {
                next = { ...next, friendlies: next.friendlies.map(x => x.id === f.id ? { ...x, hostInput: null, guestInput: null, mismatch: true } : x) };
                text = `Hmm, our results don't match 🤔 I had it ${input.h}–${input.g}. Let's both input the result again.`;
                next = withNotif(next, "friendly", `Friendly vs ${chat.name}: results mismatched — input the result again.`);
              }
            } else {
              text = `Done! I've input my result for our friendly — ${input.h}–${input.g} (host–guest). Your turn ⚽`;
            }
            return { ...next, chats: next.chats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, { id: uid(), from: "them" as const, text, time: Date.now() }] } : c) };
          });
        }, 3500 + Math.random() * 2500);
      }
    });
  }, [db.friendlies, chatId, chat, user, set, notify]);

  const msgsLen = chat?.messages.length ?? 0;
  useEffect(() => {
    const els = document.querySelectorAll("[data-layer-scroll]");
    (els[els.length - 1] as HTMLElement | undefined)?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [msgsLen, typing]);
  if (!chat) return null;

  const pushMsg = (fn: (c: ChatThread) => ChatThread) => set(d => ({ ...d, chats: d.chats.map(c => (c.id === chatId ? fn(c) : c)) }));
  const send = (t?: string, img?: string) => {
    if (!t?.trim() && !img) return;
    pushMsg(c => ({ ...c, messages: [...c.messages, { id: uid(), from: "me", text: t?.trim(), image: img ?? null, time: Date.now() }] }));
    setText("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      const reply = botReply(replyCount.current++);
      pushMsg(c => ({ ...c, messages: [...c.messages, { id: uid(), from: "them", text: reply, time: Date.now() }] }));
    }, 1300 + Math.random() * 700);
  };

  return (
    <LayerScreen title={chat.name} sub={chat.online ? "Online now" : "Offline"}
      right={<Avatar photo={chat.photo} name={chat.name} country={chat.country} size={36} />}>
      <div className="space-y-3 pb-24">
        {chat.messages.map(m => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            {m.friendlyId ? (
              <FriendlyCard friendlyId={m.friendlyId} />
            ) : (
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.from === "me" ? "rounded-br-md bg-[linear-gradient(135deg,var(--forest-2),var(--deep))] text-white" : "rounded-bl-md border border-[var(--line)] bg-[var(--card)]"}`}>
                {m.image && <img src={m.image} alt="" className="mb-1.5 max-h-52 rounded-xl object-cover" />}
                {m.text && <p className="text-[0.8rem] font-semibold leading-relaxed">{m.text}</p>}
                <p className={`mt-1 text-right text-[0.56rem] font-bold ${m.from === "me" ? "text-white/60" : "text-[var(--mut)]"}`}>{fmtClock(m.time)}</p>
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      {/* input bar — gamepad (friendly) · image · text · send */}
      <div className="fixed inset-x-0 bottom-0 z-[65]">
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-2.5 shadow-2xl backdrop-blur-xl">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const img = await readImage(f, 640); send(undefined, img); } catch { /* ignore */ }
              e.target.value = "";
            }} />
            <button className="icon-btn !h-10 !w-10" aria-label="Host a friendly" title="Host a friendly" onClick={() => setFriendlyOpen(true)}>
              <i className="fa-solid fa-gamepad text-[var(--gold)]" />
            </button>
            <button className="icon-btn !h-10 !w-10" aria-label="Send image" onClick={() => fileRef.current?.click()}><i className="fa-regular fa-image text-[var(--forest)]" /></button>
            <input className="input !border-0 !bg-transparent !py-2" placeholder="Message…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send(text)} />
            <button className="btn btn-forest !h-10 !w-10 !rounded-full !p-0" aria-label="Send" onClick={() => send(text)}><i className="fa-solid fa-paper-plane" /></button>
          </div>
        </div>
      </div>
      {friendlyOpen && <FriendlyModal chat={chat} onClose={() => setFriendlyOpen(false)} />}
    </LayerScreen>
  );
}

/* ---------------- drawer (hamburger menu on Updates) ---------------- */
export function MenuDrawer() {
  const { db, user, goTab, closeAll, closeTop, pushLayer, set, toast } = useApp();
  const row = (icon: string, label: string, sub: string, fn: () => void, tone = "var(--forest)") => (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--forest)_7%,transparent)]" onClick={fn}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
        <i className={`fa-solid ${icon}`} style={{ color: tone }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.82rem] font-extrabold">{label}</span>
        <span className="block text-[0.6rem] font-bold text-[var(--mut)]">{sub}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-[0.6rem] text-[var(--mut)]" />
    </button>
  );
  const cycleTheme = () => {
    const next = db.theme === "light" ? "dark" : db.theme === "dark" ? "system" : "light";
    set(d => ({ ...d, theme: next }));
    toast(`Theme: ${next === "system" ? "Follow System" : next === "dark" ? "Dark" : "Light"}`, "fa-circle-half-stroke");
  };
  return (
    <div className="slide-in fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-[rgb(4_20_12/0.55)] backdrop-blur-[2px]" onClick={closeTop} aria-label="Close menu" />
      <div className="absolute bottom-0 right-0 top-0 flex w-[290px] flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--card)] shadow-2xl">
        <div className="pitch flex items-center gap-3 p-5 text-white">
          <Logo size={40} />
          <div>
            <div className="font-display text-[0.9rem] uppercase">PenX Hub</div>
            <div className="text-[0.62rem] font-bold text-white/70">Compete, challenge, and rise.</div>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4">
            <Avatar photo={user.photo} name={`${user.firstName} ${user.lastName}`} country={user.country} size={44} />
            <div className="min-w-0">
              <div className="truncate text-[0.82rem] font-extrabold">{user.firstName} {user.lastName}</div>
              <div className="text-[0.64rem] font-bold text-[var(--mut)]">@{user.handle} · {user.friends.length} friends</div>
            </div>
          </div>
        )}
        <div className="divide-y divide-[var(--line)] py-2">
          {row("fa-user-plus", "Find Friends", "Search, add & manage friend requests", () => pushLayer({ kind: "friends" }))}
          {row("fa-user", "Profile", "Your hub profile & stats", () => { closeAll(); goTab("profile"); })}
          {row("fa-gear", "Settings", "Theme, notifications & profile", () => pushLayer({ kind: "settings" }))}
        </div>
        <div className="px-4 pb-2">
          <button className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3.5 py-3 text-left" onClick={cycleTheme}>
            <span className="text-[0.72rem] font-extrabold"><i className="fa-solid fa-circle-half-stroke mr-2 text-[var(--forest)]" />Theme</span>
            <span className="chip bg-[color-mix(in_srgb,var(--forest)_12%,transparent)] text-[var(--forest)]">{db.theme === "system" ? "System" : db.theme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>
        <p className="mt-auto p-4 text-center text-[0.6rem] font-bold text-[var(--mut)]">PenX Hub v2.0 · Season 26</p>
      </div>
    </div>
  );
}

/* keep threadForUser referenced for future chat creation helpers */
export const __chatHelpers = { threadForUser };
