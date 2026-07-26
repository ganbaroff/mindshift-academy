import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.12),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
              MindShift
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Вход</h1>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Войдите, чтобы открыть родительскую панель и управлять доступом к Академии.
            </p>
          </div>
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/consent" />
        </div>
      </div>
    </main>
  );
}
