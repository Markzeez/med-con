// src/app/chat/[roomId]/page.tsx
"use client";
import { useEffect, useRef, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import type { Message } from "@/types";

interface ChatPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  // Next.js 16: params is a Promise — unwrap with use()
  const { roomId } = use(params);

  const { data: session, status } = useSession();
  const router = useRouter();
  const { emit, on } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ambulanceActive, setAmbulanceActive] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  // Load message history
  useEffect(() => {
    if (!session) return;

    fetch(`/api/chat/${roomId}`)
      .then((r) => {
        if (!r.ok) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((msgs) => {
        if (msgs) {
          // Map snake_case from Supabase to camelCase for UI
          const mapped = msgs.map((m: any) => ({
            id: m.id,
            roomId: m.room_id,
            senderId: m.sender_id,
            content: m.content,
            type: m.type,
            isRead: m.is_read,
            createdAt: m.created_at,
            sender: m.sender,
          }));
          setMessages(mapped);
        }
        setLoading(false);
      });

    // Fetch room info for header
    fetch("/api/booking")
      .then((r) => r.json())
      .then((bookings) => {
        const b = bookings.find((bk: any) => bk.room_id === roomId);
        if (b) setRoomInfo(b);
      });
  }, [session, roomId, router]);

  // Socket setup
  useEffect(() => {
    if (!session) return;

    emit("room:join", { roomId, userId: session.user.id, role: session.user.role });

    const removeMsg = on<any>("message:receive", (msg) => {
      const mapped: Message = {
        id: msg.id,
        roomId: msg.room_id || msg.roomId || roomId,
        senderId: msg.sender_id || msg.senderId,
        content: msg.content,
        type: msg.type || "text",
        isRead: msg.is_read ?? false,
        createdAt: msg.created_at || msg.createdAt || new Date().toISOString(),
        sender: msg.sender,
      };

      setMessages((prev) => {
        // Dedup: if we already have this exact message by ID, skip
        if (prev.find((m) => m.id === mapped.id)) return prev;
        // Remove optimistic temp message from the same sender with same content
        const filtered = prev.filter(
          (m) => !(m.id.startsWith("tmp_") && m.senderId === mapped.senderId && m.content === mapped.content)
        );
        return [...filtered, mapped];
      });
    });

    const removeTyping = on<{ userId: string; name?: string; isTyping: boolean }>(
      "typing:update",
      ({ userId, name, isTyping }) => {
        if (userId === session.user.id) return;
        setTypingUser(isTyping ? name || "Someone" : null);
      }
    );

    const removeAmb = on<any>("ambulance:en_route", () => {
      setAmbulanceActive(true);
      setMessages((prev) => [...prev, {
        id: `sys_${Date.now()}`,
        roomId,
        senderId: "system",
        content: "🚑 Ambulance has been dispatched and is en route to your location.",
        type: "system",
        isRead: true,
        createdAt: new Date().toISOString(),
      }]);
    });

    return () => {
      removeMsg?.();
      removeTyping?.();
      removeAmb?.();
      emit("room:leave", { roomId, userId: session.user.id });
    };
  }, [session, roomId, emit, on]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  function sendMessage() {
    if (!input.trim() || !session) return;

    const msg = {
      senderId: session.user.id,
      content: input.trim(),
      type: "text",
    };

    emit("message:send", { roomId, message: msg });

    // Optimistic add — will be replaced when server echoes back
    setMessages((prev) => [...prev, {
      id: `tmp_${Date.now()}`,
      roomId,
      senderId: session.user.id,
      content: input.trim(),
      type: "text",
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: session.user.id,
        name: session.user.name!,
        role: session.user.role as any,
        isVerified: true,
        isAvailable: true,
        email: session.user.email!,
        createdAt: "",
      },
    }]);

    setInput("");
    emit("typing:stop", { roomId, userId: session.user.id });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!session) return;
    emit("typing:start", { roomId, userId: session.user.id, name: session.user.name! });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emit("typing:stop", { roomId, userId: session.user.id });
    }, 1500);
  }

  function dispatchAmbulance() {
    if (!session) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        emit("ambulance:dispatch", {
          patientId: session.user.id,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          severity: "critical",
          roomId,
        });
        fetch("/api/ambulance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, severity: "critical" }),
        });
        setAmbulanceActive(true);
      },
      () => {
        emit("ambulance:dispatch", {
          patientId: session.user.id,
          location: { lat: 0, lng: 0, address: "Location unavailable" },
          severity: "critical",
          roomId,
        });
        setAmbulanceActive(true);
      }
    );
  }

  const isPatient = session?.user.role === "PATIENT";
  const otherPerson = roomInfo
    ? (isPatient ? roomInfo.professional : roomInfo.patient)
    : null;

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm">
            {otherPerson?.name?.[0] ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{otherPerson?.name ?? "Loading…"}</p>
            <p className="text-xs text-gray-400">{otherPerson?.role?.replace("_", " ") ?? ""}{otherPerson?.specialty ? ` · ${otherPerson.specialty}` : ""}</p>
          </div>
        </div>

        {isPatient && (
          <button
            onClick={dispatchAmbulance}
            disabled={ambulanceActive}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              ambulanceActive
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600 pulse-btn"
            }`}
          >
            🚑 {ambulanceActive ? "Dispatched" : "Emergency"}
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <div className="text-3xl mb-2">💬</div>
            <p>Start the conversation</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === session?.user.id;
          const isSystem = msg.type === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-full">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex msg-enter ${isOwn ? "justify-end" : "justify-start"}`}>
              {!isOwn && (
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-semibold mr-2 mt-1 shrink-0">
                  {msg.sender?.name?.[0] ?? "?"}
                </div>
              )}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                isOwn
                  ? "bg-sky-500 text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? "text-sky-200" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}

        {typingUser && (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            {typingUser} is typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
