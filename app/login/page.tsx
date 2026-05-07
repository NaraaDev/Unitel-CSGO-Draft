"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "../_components/SiteHeader";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Нэвтрэх амжилтгүй");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }
      const redirect = json.data?.isAdmin ? "/admin" : "/draft";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Сүлжээний алдаа");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--accent-cyber), transparent 70%)" }}
          />
        </div>

        <div className={`relative w-full max-w-md ${shake ? "shake" : ""}`}>
          <div className="font-mono text-xs text-fire tracking-[0.4em] mb-3 rise-in">
            {"// AUTH.HANDSHAKE"}
          </div>
          <h1
            className="font-display text-6xl mb-2 leading-none rise-in"
            style={{ ["--i" as never]: 1 }}
          >
            <span className="text-fire">/</span> НЭВТРЭХ
          </h1>
          <p className="text-secondary text-sm mb-8 rise-in" style={{ ["--i" as never]: 2 }}>
            Дугаар + нууц үг.
          </p>

          <form
            onSubmit={onSubmit}
            className="tactical-card bevel-strong corners p-7 relative rise-in"
            style={{ ["--i" as never]: 3 }}
          >
            <div className="scanline" />

            <div className="space-y-4 relative">
              <div>
                <label className="label-tac">Утас</label>
                <input
                  className="input-tac"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })
                  }
                  placeholder="99112233"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />
              </div>
              <div>
                <label className="label-tac">Нууц үг</label>
                <input
                  className="input-tac"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mt-5 border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-sm text-danger flex items-start gap-2">
                <span className="font-display tracking-widest">ERR //</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-fire w-full mt-6 flex items-center justify-center"
            >
              {submitting ? <span className="font-mono">VERIFYING...</span> : <>► ИДЭВХЖҮҮЛЭХ</>}
            </button>

            <p className="text-secondary text-xs text-center mt-4 font-mono">
              Бүртгэлгүй бол{" "}
              <Link href="/register" className="text-fire hover:underline">
                бүртгүүлэх
              </Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
