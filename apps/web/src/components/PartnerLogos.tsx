const partners = ["VERCEL", "LINEAR", "STRIPE", "RAYCAST", "SUPABASE", "RESEND"];

export default function PartnerLogos() {
  return (
    <section className="relative border-y border-white/5 py-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Powering knowledge for teams at
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {partners.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center font-display text-lg font-bold tracking-tight text-muted/70 transition-colors hover:text-text"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
