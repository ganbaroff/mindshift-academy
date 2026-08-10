/**
 * The monster, drawn — five species and five earned parts.
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §10.1 (a growing monster instead
 * of ranks) and `docs/design-handoff/v1.1/06-MONSTER-ANATOMY-ANSWERS.md`.
 *
 * Two rules the anatomy answers insisted on, and the reason this is a constructor rather
 * than five drawings:
 *
 *  - **Species differ by silhouette and expression, never by gender.** "Любой ребёнок мог
 *    бы выбрать любого" — no bows, no lashes, no colour-coded boy/girl. A child picks the
 *    one they like, not the one they are told is theirs.
 *  - **Growth parts are identical across species and attach at the same anchor points.**
 *    Only the carrier differs, so week 3's horn looks earned rather than redrawn, and one
 *    new part never means five new drawings.
 *
 * Parts are derived from completed weeks (`earnedMonsterParts`), never stored as a
 * separate counter — one source of truth for "how far am I", so art can never disagree
 * with progress. Growth is one-way: a part is never taken back.
 *
 * Pure presentational SVG. No network, no state, no animation of its own — the growth
 * celebration composes this with its own motion.
 */

import type { MonsterPartId } from "@/lib/tasks/course-map";

export const MONSTER_SPECIES = [
  { id: "calm", nameRu: "Тихоня", moodRu: "спокойный", color: "#1FA398" },
  { id: "spark", nameRu: "Искра", moodRu: "весёлая", color: "#8B6BFF" },
  { id: "zippy", nameRu: "Егоза", moodRu: "шустрый", color: "#FFC93C" },
  { id: "steady", nameRu: "Крепыш", moodRu: "надёжный", color: "#3FB37F" },
  { id: "dreamy", nameRu: "Соня", moodRu: "мечтательная", color: "#FF6B4A" },
] as const;

export type MonsterSpeciesId = (typeof MONSTER_SPECIES)[number]["id"];

export function isMonsterSpecies(value: string | null | undefined): value is MonsterSpeciesId {
  return MONSTER_SPECIES.some((s) => s.id === value);
}

/**
 * A child who hatched a monster before species existed still has a colour. Map it to the
 * nearest species so their monster is already itself when they open the app — nothing is
 * taken away and nothing is asked before they can play. They can change it afterwards.
 */
export function speciesFromColor(color: string | null | undefined): MonsterSpeciesId {
  if (!color) return "calm";
  const hex = color.trim().toLowerCase();
  const exact = MONSTER_SPECIES.find((s) => s.color.toLowerCase() === hex);
  if (exact) return exact.id;
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(n)) return "calm";
  return MONSTER_SPECIES[n % MONSTER_SPECIES.length].id;
}

/** Parts render in two layers so wings sit behind the body and horns in front of it. */
const BEHIND: MonsterPartId[] = ["wings", "backPattern"];
const FRONT: MonsterPartId[] = ["arms", "ears", "horn"];

const INK = "var(--ink)";

function Part({ id, growing }: { id: MonsterPartId; growing: boolean }) {
  const cls = growing ? "part growing" : "part";
  switch (id) {
    case "ears":
      return (
        <g className={cls} style={{ transformOrigin: "24px 34px" }}>
          <ellipse cx="24" cy="34" rx="7.5" ry="9.5" fill="var(--color-secondary)" stroke={INK} strokeWidth="2" />
          <ellipse cx="76" cy="34" rx="7.5" ry="9.5" fill="var(--color-secondary)" stroke={INK} strokeWidth="2" />
        </g>
      );
    case "arms":
      return (
        <g className={cls} style={{ transformOrigin: "50px 66px" }}>
          <path d="M22,60 L7,80" stroke={INK} strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M22,60 L7,80" stroke="var(--color-secondary)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="7" cy="80" r="7" fill={INK} />
          <circle cx="7" cy="80" r="5.2" fill="var(--color-secondary)" />
          <path d="M78,60 L93,80" stroke={INK} strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M78,60 L93,80" stroke="var(--color-secondary)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="93" cy="80" r="7" fill={INK} />
          <circle cx="93" cy="80" r="5.2" fill="var(--color-secondary)" />
        </g>
      );
    case "horn":
      return (
        <g className={cls} style={{ transformOrigin: "50px 26px" }}>
          <polygon points="50,15 59,32 41,32" fill="var(--color-accent)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
      );
    case "backPattern":
      return (
        <g className={cls} style={{ transformOrigin: "50px 28px" }}>
          <polygon points="38,30 44,19 50,30" fill="var(--color-primary-violet)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points="50,30 56,17 62,30" fill="var(--color-primary-violet)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points="62,30 68,21 74,30" fill="var(--color-primary-violet)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      );
    case "wings":
      return (
        <g className={cls} style={{ transformOrigin: "50px 55px" }}>
          <ellipse cx="8" cy="52" rx="14" ry="21" fill="var(--color-primary-violet)" stroke={INK} strokeWidth="2" opacity="0.92" />
          <ellipse cx="92" cy="52" rx="14" ry="21" fill="var(--color-primary-violet)" stroke={INK} strokeWidth="2" opacity="0.92" />
        </g>
      );
  }
}

function Body({ species, fill }: { species: MonsterSpeciesId; fill: string }) {
  switch (species) {
    case "calm":
      return (
        <>
          <ellipse cx="50" cy="61" rx="30" ry="27" fill={fill} stroke={INK} strokeWidth="3" />
          <ellipse cx="32" cy="66" rx="5" ry="3" fill="#fff" opacity="0.35" />
          <ellipse cx="68" cy="66" rx="5" ry="3" fill="#fff" opacity="0.35" />
          <circle cx="40" cy="55" r="4" fill={INK} />
          <circle cx="60" cy="55" r="4" fill={INK} />
          <path d="M40,72 Q50,78 60,72" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "spark":
      return (
        <>
          <path d="M20,66 Q20,29 50,29 Q80,29 80,66 Q80,89 50,89 Q20,89 20,66 Z" fill={fill} stroke={INK} strokeWidth="3" />
          <path d="M29,43 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z" fill="var(--color-accent)" />
          <path d="M69,39 l1.7,4.2 4.2,1.7 -4.2,1.7 -1.7,4.2 -1.7,-4.2 -4.2,-1.7 4.2,-1.7 Z" fill="var(--color-accent)" />
          <circle cx="40" cy="57" r="4" fill={INK} />
          <circle cx="60" cy="57" r="4" fill={INK} />
          <path d="M40,73 Q50,81 60,73" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "zippy":
      return (
        <>
          <polygon
            points="20,66 27,35 35,50 43,29 50,48 57,29 65,50 73,35 80,66 80,87 20,87"
            fill={fill}
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon points="35,52 40,58 33,58" fill={INK} />
          <polygon points="65,52 70,58 62,58" fill={INK} />
          <path d="M39,75 L45,71 L51,75 L57,71 L63,75" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "steady":
      return (
        <>
          <rect x="21" y="34" width="58" height="53" rx="16" fill={fill} stroke={INK} strokeWidth="3" />
          <rect x="21" y="53" width="58" height="4" fill={INK} opacity="0.28" />
          <rect x="21" y="69" width="58" height="4" fill={INK} opacity="0.28" />
          <rect x="35" y="52" width="9" height="9" rx="2" fill={INK} />
          <rect x="56" y="52" width="9" height="9" rx="2" fill={INK} />
          <rect x="40" y="75" width="20" height="4" rx="2" fill={INK} />
        </>
      );
    case "dreamy":
      return (
        <>
          <path d="M50,26 C36,40 20,50 20,66 C20,80 33,90 50,90 C67,90 80,80 80,66 C80,50 64,40 50,26 Z" fill={fill} stroke={INK} strokeWidth="3" />
          <ellipse cx="33" cy="68" rx="5" ry="3" fill="#fff" opacity="0.3" />
          <ellipse cx="67" cy="68" rx="5" ry="3" fill="#fff" opacity="0.3" />
          <path d="M35,56 Q40,52 45,56" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M55,56 Q60,52 65,56" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="72" r="3" fill={INK} />
        </>
      );
  }
}

export type MonsterSVGProps = {
  size?: number;
  species?: MonsterSpeciesId;
  /** Parts already earned. Derive with `earnedMonsterParts`. */
  unlocked?: readonly MonsterPartId[];
  /** The part arriving right now — rendered plus animated by the growth celebration. */
  growing?: MonsterPartId | null;
  /** Overrides the species colour when a child has picked their own. */
  color?: string | null;
  className?: string;
};

export function MonsterSVG({
  size = 96,
  species = "calm",
  unlocked = [],
  growing = null,
  color,
  className,
}: MonsterSVGProps) {
  const meta = MONSTER_SPECIES.find((s) => s.id === species) ?? MONSTER_SPECIES[0];
  const active = new Set<MonsterPartId>(unlocked);
  if (growing) active.add(growing);
  const base = color?.trim() || meta.color;
  // Derived from what the gradient actually IS, not from a counter. A module-level
  // counter mutated during render is impure: it renumbers on every re-render and gives
  // the server and the client different ids, which is a hydration mismatch. Two
  // identical monsters sharing one gradient id is harmless — the gradients are identical.
  const gid = `monster-grad-${base.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Монстр, вид «${meta.nameRu}»`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`color-mix(in srgb, ${base} 55%, white)`} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
      </defs>
      {BEHIND.filter((p) => active.has(p)).map((p) => (
        <Part key={p} id={p} growing={p === growing} />
      ))}
      <Body species={meta.id} fill={`url(#${gid})`} />
      {FRONT.filter((p) => active.has(p)).map((p) => (
        <Part key={p} id={p} growing={p === growing} />
      ))}
    </svg>
  );
}
