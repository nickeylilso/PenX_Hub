/* ============================================================
   PenX Hub — Updates: Chats, Community feed, Chat overlay, Drawer
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { ChatThread, Post } from "../data";
import { STICKERS, botReply, fmtClock, timeAgo, uid } from "../data";
import { useApp, withNotif, withPoints } from "../store";
import { Avatar, Empty, FlagBadge, LayerScreen, Logo, Modal } from "../ui";
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
        <div className="flex items-center justify-between py-3">
          <h1 className="font-display text-[1.05rem] uppercase tracking-wide">Updates</h1>
          <button className="icon-btn" aria-label="Menu" onClick={() => pushLayer({ kind: "drawer" })}><i className="fa-solid fa-bars" /></button>
        </div>
        <div className="pb-3">
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
                          {last?.image ? "📷 Photo" : last?.text ?? "Say hello…"}
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
  const { db, user, set, toast } = useApp();
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
    set(d => withPoints({ ...d, posts: [post, ...d.posts] }, 10));
    setText(""); setImg(null);
    toast("Posted to the community! +10 XP", "fa-bullhorn");
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
  const { user, set, toast } = useApp();
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
        <Avatar photo={post.photo} name={post.name} country={post.country} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[0.84rem] font-extrabold">{post.name}<FlagBadge country={post.country} size={15} /></div>
          <div className="text-[0.64rem] font-bold text-[var(--mut)]">@{post.handle} · {timeAgo(post.time)}</div>
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

/* ---------------- chat overlay ---------------- */
export function ChatScreen({ chatId }: { chatId: string }) {
  const { db, set } = useApp();
  const chat = db.chats.find(c => c.id === chatId);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replyCount = useRef(0);

  useEffect(() => {
    if (chat && chat.unread > 0)
      set(d => ({ ...d, chats: d.chats.map(c => (c.id === chatId ? { ...c, unread: 0 } : c)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  useEffect(() => {
    const els = document.querySelectorAll("[data-layer-scroll]");
    (els[els.length - 1] as HTMLElement | undefined)?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [chat?.messages.length, typing]);
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
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.from === "me" ? "rounded-br-md bg-[linear-gradient(135deg,var(--forest-2),var(--deep))] text-white" : "rounded-bl-md border border-[var(--line)] bg-[var(--card)]"}`}>
              {m.image && <img src={m.image} alt="" className="mb-1.5 max-h-52 rounded-xl object-cover" />}
              {m.text && <p className="text-[0.8rem] font-semibold leading-relaxed">{m.text}</p>}
              <p className={`mt-1 text-right text-[0.56rem] font-bold ${m.from === "me" ? "text-white/60" : "text-[var(--mut)]"}`}>{fmtClock(m.time)}</p>
            </div>
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
      {/* input bar */}
      <div className="fixed inset-x-0 bottom-0 z-[65]">
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-2.5 shadow-2xl backdrop-blur-xl">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const img = await readImage(f, 640); send(undefined, img); } catch { /* ignore */ }
              e.target.value = "";
            }} />
            <button className="icon-btn !h-10 !w-10" aria-label="Send image" onClick={() => fileRef.current?.click()}><i className="fa-regular fa-image text-[var(--forest)]" /></button>
            <input className="input !border-0 !bg-transparent !py-2" placeholder="Message…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send(text)} />
            <button className="btn btn-forest !h-10 !w-10 !rounded-full !p-0" aria-label="Send" onClick={() => send(text)}><i className="fa-solid fa-paper-plane" /></button>
          </div>
        </div>
      </div>
    </LayerScreen>
  );
}

/* ---------------- drawer (hamburger menu on Updates) ---------------- */
export function MenuDrawer() {
  const { user, goTab, closeAll, pushLayer, db, set, toast } = useApp();
  const row = (icon: string, label: string, fn: () => void) => (
    <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-[0.82rem] font-extrabold transition-colors hover:bg-[color-mix(in_srgb,var(--forest)_7%,transparent)]" onClick={fn}>
      <i className={`fa-solid ${icon} w-5 text-[var(--forest)]`} />{label}
      <i className="fa-solid fa-chevron-right ml-auto text-[0.6rem] text-[var(--mut)]" />
    </button>
  );
  const cycleTheme = () => {
    const next = db.theme === "light" ? "dark" : db.theme === "dark" ? "system" : "light";
    set(d => ({ ...d, theme: next }));
    toast(`Theme: ${next === "system" ? "Follow System" : next === "dark" ? "Dark" : "Light"}`, "fa-circle-half-stroke");
  };
  return (
    <div className="slide-in fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-[rgb(4_20_12/0.55)] backdrop-blur-[2px]" onClick={closeAll} aria-label="Close menu" />
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
              <div className="text-[0.64rem] font-bold text-[var(--mut)]">@{user.handle} · {user.points} XP</div>
            </div>
          </div>
        )}
        <div className="divide-y divide-[var(--line)] py-2">
          {row("fa-house", "Home", () => { closeAll(); goTab("home"); })}
          {row("fa-gamepad", "Games", () => { closeAll(); goTab("games"); })}
          {row("fa-newspaper", "Updates", () => { closeAll(); goTab("updates"); })}
          {row("fa-user", "Profile", () => { closeAll(); goTab("profile"); })}
          {row("fa-gear", "Settings", () => pushLayer({ kind: "settings" }))}
          {row("fa-circle-question", "FAQ", () => pushLayer({ kind: "faq" }))}
          {row("fa-circle-half-stroke", `Theme: ${db.theme === "system" ? "System" : db.theme === "dark" ? "Dark" : "Light"}`, cycleTheme)}
        </div>
        <p className="mt-auto p-4 text-center text-[0.6rem] font-bold text-[var(--mut)]">PenX Hub v1.0 · Season 26</p>
      </div>
    </div>
  );
}
