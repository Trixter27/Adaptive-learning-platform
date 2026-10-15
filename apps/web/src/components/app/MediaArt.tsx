import { cn } from "@/lib/cn";

type Tone =
  | "wave"
  | "dark"
  | "fluid"
  | "circuit"
  | "project"
  | "guide"
  | "spatial"
  | "ritual"
  | "web"
  | "wings"
  | "frame"
  | "thinker"
  | "spotlight"
  | "ritual-banner"
  | "badge-cyan"
  | "badge-pink";

export default function MediaArt({
  tone,
  className,
}: {
  tone: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className={cn("absolute inset-0", backgrounds[tone])} />
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute -left-6 top-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute right-0 bottom-0 h-28 w-28 rounded-full bg-cyan/30 blur-2xl" />
      </div>
    </div>
  );
}

const backgrounds: Record<Tone, string> = {
  wave: "bg-[radial-gradient(circle_at_20%_20%,#67e8f9,transparent_35%),radial-gradient(circle_at_80%_0%,#f472b6,transparent_32%),linear-gradient(135deg,#312e81,#22d3ee)]",
  dark: "bg-[radial-gradient(circle_at_30%_80%,#7c3aed,transparent_36%),radial-gradient(circle_at_80%_20%,#22d3ee22,transparent_40%),#050510]",
  fluid: "bg-[conic-gradient(from_120deg,#f472b6,#22d3ee,#6366f1,#f472b6)]",
  circuit:
    "bg-[linear-gradient(135deg,#1e1b4b,#4c1d95)] after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent_48%,#22d3ee55_49%,transparent_52%),linear-gradient(transparent_48%,#f472b655_49%,transparent_52%)] after:bg-[size:18px_18px]",
  project:
    "bg-[radial-gradient(circle_at_70%_20%,#22d3ee,transparent_28%),radial-gradient(circle_at_20%_80%,#22c55e,transparent_30%),#022c22]",
  guide: "bg-[#0b1220] bg-[radial-gradient(circle_at_50%_40%,#67e8f9aa,transparent_45%)]",
  spatial:
    "bg-[radial-gradient(circle_at_30%_30%,#c084fc,transparent_32%),radial-gradient(circle_at_80%_70%,#22d3ee,transparent_28%),#1e1033]",
  ritual:
    "bg-[radial-gradient(circle_at_50%_50%,#fb7185,transparent_32%),radial-gradient(circle_at_80%_20%,#facc15,transparent_24%),#2a0a16]",
  web: "bg-[radial-gradient(circle_at_40%_40%,#22d3ee,transparent_30%),#0b1020]",
  wings:
    "bg-[radial-gradient(circle_at_50%_40%,#fda4af,transparent_36%),linear-gradient(180deg,#3f1726,#111111)]",
  frame:
    "bg-[radial-gradient(circle_at_50%_50%,#67e8f9,transparent_34%),linear-gradient(135deg,#4c1d95,#0ea5e9)]",
  thinker:
    "bg-[radial-gradient(circle_at_50%_40%,#a78bfa,transparent_32%),#0a0a12]",
  spotlight:
    "bg-[linear-gradient(135deg,#f472b6,#7c3aed_40%,#22d3ee)]",
  "ritual-banner":
    "bg-[radial-gradient(circle_at_70%_40%,#c084fc,transparent_36%),radial-gradient(circle_at_20%_80%,#22d3ee,transparent_28%),#12061c]",
  "badge-cyan": "bg-gradient-to-br from-cyan/30 to-cyan/5",
  "badge-pink": "bg-gradient-to-br from-pink/30 to-pink/5",
};
