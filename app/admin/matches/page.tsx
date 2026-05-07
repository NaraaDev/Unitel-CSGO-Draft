"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../../_components/SiteHeader";
import { MatchesArchive } from "../_components/MatchesArchive";
import type { PublicUser } from "@/lib/types";

export default function AdminMatchesPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.data || !j.data.isAdmin) {
          router.replace("/login");
          return;
        }
        setMe(j.data);
      })
      .catch(() => alive && router.replace("/login"))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [router]);

  if (checking || !me) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center font-mono text-muted">
          BOOTING ADMIN ARCHIVE...
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <p className="font-mono text-xs text-fire tracking-[0.4em] rise-in">
            {"// ARCHIVE.CONSOLE"}
          </p>
          <Link href="/admin" className="btn-ghost !py-1 !px-3 !text-xs">
            ← АДМИН КОНСОЛ
          </Link>
        </div>
        <h1 className="font-display text-5xl lg:text-7xl rise-in mb-6" style={{ ["--i" as never]: 1 }}>
          ТОГЛОЛТЫН <span className="text-fire">АРХИВ</span>
        </h1>

        <MatchesArchive />
      </main>
    </>
  );
}
