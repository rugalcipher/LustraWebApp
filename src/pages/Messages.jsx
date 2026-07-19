import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Check, CheckCheck, Lock, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import Monogram from "@/lib/lustra/Monogram";
import { getTalent } from "@/mocks/talent";

const SEED_MESSAGES = [
  { id: "m1", from: "management", text: "Good evening, and welcome to Lustra. My name is V. Castellan — I'll be your dedicated concierge for this inquiry. How may we assist you this evening?", time: "7:02 PM", status: "read" },
  { id: "m2", from: "client", text: "Thank you. I'm hoping to arrange a private dinner for two this Saturday.", time: "7:04 PM", status: "read" },
  { id: "m3", from: "management", text: "Of course. A lovely choice. Let me confirm Isabelle's availability for Saturday evening and I'll prepare a proposal for you shortly.", time: "7:05 PM", status: "read" },
];

export default function Messages() {
  const location = useLocation();
  const [messages, setMessages] = useState(/** @type {any[]} */ (SEED_MESSAGES));
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [inquiryCard] = useState(() => location.state?.newInquiry || null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (location.state?.newInquiry) {
      setMessages((prev) => [
        ...prev,
        {
          id: "inquiry",
          from: "client",
          type: "inquiry",
          data: location.state.newInquiry,
          time: "Now",
          status: "sent",
        },
        {
          id: "auto",
          from: "management",
          text: "Thank you for your inquiry. I've received your request and am reviewing Isabelle's availability now. I'll return to you with a proposal within the hour.",
          time: "Now",
          status: "sent",
        },
      ]);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    if (!draft.trim()) return;
    const msg = { id: Date.now(), from: "client", text: draft.trim(), time: "Now", status: "sent" };
    setMessages((p) => [...p, msg]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          from: "management",
          text: "Understood. I'll make the arrangements and send you a structured proposal to review.",
          time: "Now",
          status: "delivered",
        },
      ]);
    }, 2200);
  };

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)]">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-noir/60">
        <Link to="/app/inquiries" className="text-ivory">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
        </Link>
        <div className="w-9 h-9 rounded-full bg-elevated-black border border-rose-gold/30 flex items-center justify-center">
          <Monogram size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base text-ivory leading-none">Lustra Concierge</p>
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-success mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online · V. Castellan
          </p>
        </div>
        <button className="text-muted-grey">
          <MoreVertical className="w-5 h-5" strokeWidth={1.2} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto lustra-scroll-hide px-4 py-4 space-y-3">
        <div className="flex justify-center">
          <span className="text-[0.5rem] tracking-luxe uppercase text-muted-grey bg-card-black/50 px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}

        {typing && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-card-black/70 rounded-2xl rounded-bl-sm w-fit">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-rose-gold/70"
                style={{ animation: `shimmer 1s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] bg-noir/80 px-3 py-2.5 safe-bottom">
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center text-muted-grey hover:text-rose-gold transition">
            <Paperclip className="w-5 h-5" strokeWidth={1.2} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 bg-card-black border border-white/[0.08] rounded-full px-4 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-light-rose-gold to-rose-gold flex items-center justify-center text-noir disabled:opacity-30 transition"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[0.5rem] tracking-wide-luxe text-muted-grey/60 mt-1.5 flex items-center gap-1 justify-center">
          <Lock className="w-2.5 h-2.5" strokeWidth={1.2} /> Private & discreet · End-to-end by Lustra
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const mine = msg.from === "client";

  if (msg.type === "inquiry") {
    const t = msg.data.talent || getTalent(msg.data.id);
    return (
      <div className="max-w-[85%] mx-auto">
        <div className="bg-card-black border border-rose-gold/25 rounded-lg p-4">
          <p className="text-[0.5rem] tracking-luxe uppercase text-rose-gold text-center">Inquiry Submitted</p>
          <div className="my-3"><StarDivider /></div>
          {t && (
            <div className="flex items-center gap-3 mb-3">
              <img src={t.cover} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-heading text-base text-ivory leading-none">{t.name}</p>
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1">{msg.data.engagement}</p>
              </div>
            </div>
          )}
          <div className="space-y-1 text-[0.7rem] font-body text-soft-ivory/80">
            <Row k="Date" v={msg.data.date || "Flexible"} />
            <Row k="Time" v={msg.data.time || "Evening"} />
            <Row k="City" v={msg.data.city} />
            <Row k="Venue" v={msg.data.venue || "To be confirmed"} />
          </div>
        </div>
        <p className="text-[0.5rem] text-muted-grey text-center mt-1">{msg.time}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-body leading-relaxed",
          mine
            ? "bg-gradient-to-br from-rose-gold to-rose-gold/80 text-noir rounded-br-sm"
            : "bg-card-black text-soft-ivory rounded-bl-sm border border-white/[0.06]"
        )}
      >
        {msg.text}
      </div>
      <div className={cn("flex items-center gap-1 mt-1 px-1", mine && "flex-row-reverse")}>
        <span className="text-[0.5rem] text-muted-grey">{msg.time}</span>
        {mine && (msg.status === "read" ? (
          <CheckCheck className="w-3 h-3 text-rose-gold" strokeWidth={1.5} />
        ) : msg.status === "delivered" ? (
          <CheckCheck className="w-3 h-3 text-muted-grey" strokeWidth={1.5} />
        ) : (
          <Check className="w-3 h-3 text-muted-grey" strokeWidth={1.5} />
        ))}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-grey">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}