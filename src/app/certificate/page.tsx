"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { DEFAULT_CERTIFICATE_LABEL } from "@/lib/certificate-label";
import { skillLabelsRu } from "@/lib/certificate-skills";

type CertPayload = {
  eligibility: {
    eligible: boolean;
    missing: string[];
    sessionsComplete: boolean;
    conceptsAtThreshold: boolean;
    capstoneComplete: boolean;
    formulationSubmitted: boolean;
  };
  certificate: {
    id: string;
    recipientLabel: string;
    issuedDayBucket: string;
  } | null;
  defaultLabel: string;
  monsterName: string | null;
};

const SKILLS = Object.values(skillLabelsRu());

export default function CertificatePage() {
  const [data, setData] = useState<CertPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayLabel, setDisplayLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/certificate");
      if (!res.ok) {
        if (!cancelled) setError("Не удалось загрузить сертификат.");
        return;
      }
      const body = (await res.json()) as CertPayload;
      if (!cancelled) setData(body);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayLabel: displayLabel.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Не удалось выдать сертификат.");
        return;
      }
      const refresh = await fetch("/api/certificate");
      if (refresh.ok) setData((await refresh.json()) as CertPayload);
    } finally {
      setBusy(false);
    }
  };

  const cert = data?.certificate;
  const label = cert?.recipientLabel ?? DEFAULT_CERTIFICATE_LABEL;

  return (
    <div className="min-h-screen bg-[#090d16] text-white print:bg-white print:text-black">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-2xl font-bold print:hidden">Сертификат MindShift</h1>

        {error ? (
          <p className="text-violet-200 print:hidden" role="alert">
            {error}
          </p>
        ) : null}

        {!data ? (
          <p className="text-white/60 print:hidden">Загрузка…</p>
        ) : !cert && !data.eligibility.eligible ? (
          <div className="space-y-3 print:hidden" data-testid="certificate-not-ready">
            <p>Сертификат ещё не готов. Нужно:</p>
            <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
              {!data.eligibility.sessionsComplete ? (
                <li>пройти все 15 сессий</li>
              ) : null}
              {!data.eligibility.conceptsAtThreshold ? (
                <li>достичь порога мастерства по пяти навыкам</li>
              ) : null}
              {!data.eligibility.capstoneComplete ? <li>пройти выпускной квест</li> : null}
              {!data.eligibility.formulationSubmitted ? (
                <li>подать формулировку своими словами</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {!cert && data?.eligibility.eligible ? (
          <div className="space-y-4 print:hidden" data-testid="certificate-issue">
            <p className="text-sm text-white/70">
              Подпись по умолчанию: «{DEFAULT_CERTIFICATE_LABEL}». Родитель может задать
              короткое имя (до 32 символов).
            </p>
            <label className="block text-sm">
              Имя на сертификате (необязательно)
              <input
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                maxLength={32}
                className="mt-1 w-full min-h-11 rounded-xl bg-white/5 border border-white/15 px-3 text-base"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void issue()}
              className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 font-semibold disabled:opacity-50"
            >
              Выдать сертификат
            </button>
          </div>
        ) : null}

        {cert ? (
          <article
            data-testid="certificate-print"
            className="certificate-sheet rounded-3xl border border-violet-400/40 bg-[#0e1422] print:bg-white print:border-black p-8 md:p-12 space-y-6"
          >
            <p className="text-sm uppercase tracking-widest text-violet-300 print:text-gray-600">
              MindShift Academy
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Сертификат участника</h2>
            <p className="text-xl">{label}</p>
            <p className="text-white/80 print:text-gray-800">
              подтверждает прохождение программы MindShift «Мышление» и демонстрацию пяти
              навыков:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-white/85 print:text-gray-800">
              {SKILLS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {data?.monsterName ? (
              <p className="text-sm text-violet-200 print:text-gray-700">
                Спутник: {data.monsterName}
              </p>
            ) : null}
            <p className="text-xs text-white/50 print:text-gray-500 font-mono">
              ID: {cert.id}
            </p>
            <p className="text-xs text-white/50 print:text-gray-500">
              Дата: {cert.issuedDayBucket}
            </p>
            <p className="text-xs text-white/40 print:text-gray-500">
              Это запись о завершении программы. Не аккредитация и не измерение интеллекта.
            </p>
          </article>
        ) : null}

        {cert ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden min-h-11 px-6 py-3 rounded-full border border-white/20 hover:bg-white/5 font-semibold"
          >
            Печать / PDF
          </button>
        ) : null}
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .certificate-sheet {
            box-shadow: none !important;
            border: 1px solid #111 !important;
          }
        }
      `}</style>
    </div>
  );
}
