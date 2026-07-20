// src/hooks/useSocket.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

let socketInstance: Socket | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Reuse singleton socket
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || "", {
        // DO NOT set path: "/api/socket" — the server uses the default "/socket.io"
        transports: ["websocket", "polling"],
      });
    }

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected:", socketInstance?.id);
      socketInstance?.emit("user:online", {
        userId: session.user.id,
        role: session.user.role,
      });
    });

    return () => {
      // Don't disconnect on component unmount — keep singleton alive
    };
  }, [session]);

  const emit = useCallback(<T>(event: string, data: T) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      socketRef.current?.off(event, handler);
    } else {
      socketRef.current?.removeAllListeners(event);
    }
  }, []);

  return { socket: socketRef.current, emit, on, off };
}
