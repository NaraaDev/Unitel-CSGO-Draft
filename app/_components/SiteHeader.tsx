"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "./Avatar";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (alive) {
          setMe(j.data ?? null);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  };

  const ts = now
    .toISOString()
    .replace("T", " // ")
    .replace(/\..+$/, " UTC");

  return (
    <header className="border-b border-subtle bg-raised/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="font-display text-3xl tracking-[0.18em] text-fire">UNITEL</span>
          <span className="font-mono text-sm text-muted hidden sm:inline">
            {"// CSGO_DRAFT."}<span className="text-secondary">v1</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 ml-auto">
          <Link
            href="/draft"
            className={`font-display tracking-[0.16em] text-base px-3 py-2 transition-colors ${
              pathname === "/draft" ? "text-fire" : "text-secondary hover:text-fire"
            }`}
          >
            LIVE
            {pathname === "/draft" && (
              <span className="ml-1 inline-block w-1.5 h-1.5 bg-current align-middle blink" />
            )}
          </Link>
          <Link
            href="/leaderboard"
            className={`font-display tracking-[0.16em] text-base px-3 py-2 transition-colors ${
              pathname === "/leaderboard" ? "text-fire" : "text-secondary hover:text-fire"
            }`}
          >
            SCOREBOARD
          </Link>

          {loading ? (
            <span className="font-mono text-sm text-muted">...</span>
          ) : me ? (
            <>
              {me.isAdmin && (
                <Link
                  href="/admin"
                  className={`font-display tracking-[0.16em] text-base px-3 py-2 transition-colors ${
                    pathname === "/admin" ? "text-fire" : "text-secondary hover:text-fire"
                  }`}
                >
                  ADMIN
                </Link>
              )}
              <span className="hidden md:flex items-center gap-2">
                <Avatar id={me.avatarId} size={32} />
                <span className="font-mono text-sm text-muted">
                  {me.lastName} {me.firstName}
                </span>
              </span>
              <button onClick={onLogout} className="btn-ghost !py-2 !px-3 !text-sm">
                Гарах
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !py-2 !px-3 !text-sm">
                Нэвтрэх
              </Link>
              <Link href="/register" className="btn-fire !py-2 !px-3 !text-sm">
                Бүртгүүлэх
              </Link>
            </>
          )}
        </nav>

        <div className="w-full font-mono text-xs text-muted flex items-center justify-between gap-2 pt-2 border-t border-subtle/40">
          <span>SYS::{ts}</span>
          <span className="hidden sm:inline">CONN::SECURE</span>
          <span className="hidden md:inline">PROTOCOL::TURN_BASED</span>
          <span>STATUS::<span className="text-success">ONLINE</span></span>
        </div>
      </div>
    </header>
  );
}
