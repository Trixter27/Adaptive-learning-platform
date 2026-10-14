import {
  Star,
} from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  accent: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      '"I passed my USMLE Step 1 using QUESTORIAA. The gamified XP kept me going when I was exhausted. It turned boring anatomy into a quest."',
    name: "Sarah Jenkins",
    role: "Medical Student",
    initials: "SJ",
    accent: "from-pink to-rose-500",
  },
  {
    quote:
      '"The knowledge linking is insane. I finally understood how different system architectures actually relate to each other."',
    name: "Marcus Thorne",
    role: "Full-Stack Engineer",
    initials: "MT",
    accent: "from-cyan to-blue-500",
  },
  {
    quote:
      '"Learning three languages at once used to be impossible. QUESTORIAA keeps my memory paths distinct and organized automatically."',
    name: "Elena Rossi",
    role: "Polyglot Learner",
    initials: "ER",
    accent: "from-amber-400 to-orange-500",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Learner Stories · Preview
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Illustrative personas and sample stories from the design preview,
              not verified customer testimonials.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-text">Preview</span>
            <span className="text-xs text-muted">sample ratings</span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="card-hover flex flex-col rounded-2xl border border-white/8 bg-card p-6"
            >
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-text">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-white/5 pt-5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.accent} text-xs font-bold text-bg`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">{t.name}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted">
                    {t.role}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
