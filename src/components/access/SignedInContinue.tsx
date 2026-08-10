"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

type ContinuePayload = {
  signedIn: boolean;
  continue: { href: string; labelRu: string } | null;
};

/**
 * Signed-in awareness strip for "/" and "/enter-code".
 * Shows a continue-path when the visitor already has an Academy session.
 */
export function SignedInContinue({
  variant = "banner",
}: {
  variant?: "banner" | "replace-form";
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const [payload, setPayload] = useState<ContinuePayload | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/continue");
        if (!res.ok) return;
        const body = (await res.json()) as ContinuePayload;
        if (!cancelled) setPayload(body);
      } catch {
        /* keep unsigned UI */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  // Derive visibility from auth hooks synchronously — only show after fetch lands.
  if (!isLoaded || !isSignedIn || !payload?.continue) return null;

  const { href, labelRu } = payload.continue;

  if (variant === "replace-form") {
    return (
      <div className="w-full max-w-md space-y-6 text-center" data-testid="signed-in-continue">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Ты уже внутри</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Код не нужен — можно продолжить с того места, где остановились.
        </p>
        <Link
          href={href}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90"
        >
          {labelRu}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 mx-auto mb-2 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 lg:px-8"
      data-testid="signed-in-continue"
    >
      <p className="text-sm text-[var(--text-secondary)]">Вы уже вошли — можно продолжить обучение.</p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-[var(--ink)]"
      >
        {labelRu}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
