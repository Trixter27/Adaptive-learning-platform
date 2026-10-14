import {
  ArrowRight,
  Play,
  CheckCircle2,
} from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";

const trust = ["No Credit Card Required", "24/7 Free Access"];

export default function FinalCTA() {
  return (
    <section id="cta" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-pink/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-cyan/15 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-5xl">
              Ready to Learn Smarter?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
              Stop passive reading. Start active mastering. Sign up for free and
              experience the future of cognitive technology.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <SignUpButton mode="redirect">
                <button
                  type="button"
                  className="btn-pink group inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
                >
                  Start Learning Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </SignUpButton>
              <a
                href="#showcase"
                className="btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-text"
              >
                <Play className="h-4 w-4 fill-current" />
                View Demo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {trust.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 text-xs text-muted"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
