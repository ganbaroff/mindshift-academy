"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type CopyReportButtonProps = {
  text: string;
};

export function CopyReportButton({ text }: CopyReportButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Скопировано" : "Скопировать отчёт"}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? "Отчёт скопирован" : ""}
      </p>
      {failed && (
        <p role="status" aria-live="polite" className="text-xs leading-5 text-warning">
          Не получилось скопировать — выделите текст отчёта и скопируйте вручную.
        </p>
      )}
    </div>
  );
}
