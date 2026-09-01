/* Editorial SVG illustration library (DESIGN.md §Illustration Library).
   Palette: ink core, lavender tints, violet accents, ai cyan/violet.
   All illustrations are decorative by default; set role/alt per usage. */

interface IllustrationProps {
  className?: string;
}

function visibleProps() {
  return { "aria-hidden": true, focusable: false } as const;
}

export function AgentIllustration({
  className,
  dark = false,
}: IllustrationProps & { dark?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="An AI agent node coordinating tools, memory, and a human goal"
      {...visibleProps()}
    >
      <rect
        width="320"
        height="240"
        rx="20"
        fill={dark ? "var(--color-ink-900)" : "var(--color-lavender-100)"}
      />
      {/* goal */}
      <circle
        cx="160"
        cy="66"
        r="34"
        fill={dark ? "var(--color-ink-800)" : "var(--color-lavender-200)"}
      />
      <circle
        cx="160"
        cy="66"
        r="24"
        fill={dark ? "var(--color-lavender-200)" : "var(--color-ink-900)"}
      />
      <path
        d="M150 80 L160 56 L170 80 L160 72 Z"
        fill="var(--color-terracotta-500)"
      />
      {/* agent hub */}
      <circle cx="160" cy="158" r="26" fill="var(--color-terracotta-600)" />
      <circle
        cx="160"
        cy="158"
        r="10"
        fill={dark ? "var(--color-terracotta-100)" : "var(--color-terracotta-600)"}
      />
      {/* spokes */}
      <g
        stroke={dark ? "var(--color-lavender-200)" : "var(--color-ink-700)"}
        strokeOpacity={dark ? "0.35" : "0.55"}
        strokeWidth="2.5"
      >
        <line x1="130" y1="48" x2="150" y2="128" />
        <line x1="250" y1="48" x2="182" y2="136" />
        <line x1="252" y1="166" x2="188" y2="168" />
        <line x1="68" y1="166" x2="132" y2="164" />
      </g>
      {/* tools */}
      <rect
        x="104"
        y="28"
        width="52"
        height="26"
        rx="8"
        fill={dark ? "var(--color-ink-700)" : "var(--color-ink-800)"}
      />
      <rect
        x="228"
        y="62"
        width="56"
        height="26"
        rx="8"
        fill={dark ? "var(--color-ink-700)" : "var(--color-ink-700)"}
      />
      <rect
        x="234"
        y="152"
        width="56"
        height="26"
        rx="8"
        fill={dark ? "var(--color-ink-700)" : "var(--color-ink-700)"}
      />
      {/* memory */}
      <rect
        x="52"
        y="140"
        width="56"
        height="26"
        rx="8"
        fill="var(--color-ai-cyan)"
        opacity="0.9"
      />
      <rect
        x="78"
        y="192"
        width="56"
        height="26"
        rx="8"
        fill={dark ? "var(--color-ink-700)" : "var(--color-ink-800)"}
      />
    </svg>
  );
}

export function VibecodingIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A person turning a plain-language idea into code and a working screen with AI"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-paper-50)" />
      {/* person */}
      <circle cx="70" cy="66" r="20" fill="var(--color-ink-800)" />
      <path d="M40 150 Q40 110 70 110 Q100 110 100 150 Z" fill="var(--color-ink-700)" />
      {/* prompt bubble */}
      <rect x="118" y="40" width="150" height="52" rx="14" fill="var(--color-white)" stroke="var(--color-neutral-300)" />
      <rect x="132" y="54" width="44" height="8" rx="4" fill="var(--color-neutral-300)" />
      <rect x="132" y="72" width="64" height="8" rx="4" fill="var(--color-terracotta-600)" opacity="0.5" />
      {/* code window */}
      <rect x="118" y="116" width="150" height="70" rx="12" fill="var(--color-ink-900)" />
      <rect x="132" y="130" width="36" height="7" rx="3.5" fill="var(--color-terracotta-100)" />
      <rect x="132" y="146" width="56" height="7" rx="3.5" fill="var(--color-ai-cyan)" opacity="0.7" />
      <rect x="132" y="162" width="28" height="7" rx="3.5" fill="var(--color-terracotta-100)" />
      {/* arrow */}
      <path d="M120 226 C 140 214 236 216 244 204" fill="none" stroke="var(--color-terracotta-500)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 5" />
      {/* working screen */}
      <rect x="232" y="182" width="60" height="38" rx="8" fill="var(--color-white)" stroke="var(--color-neutral-300)" />
      <circle cx="245" cy="194" r="5" fill="var(--color-success-600)" />
      <rect x="258" y="189" width="24" height="5" rx="2.5" fill="var(--color-neutral-300)" />
      <rect x="240" y="203" width="40" height="5" rx="2.5" fill="var(--color-neutral-300)" />
    </svg>
  );
}

export function DatabaseIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="Records flowing into organized tables and returning as a useful result"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-terracotta-100)" />
      {/* incoming records */}
      <rect x="44" y="44" width="52" height="16" rx="8" fill="var(--color-ink-800)" />
      <rect x="44" y="74" width="68" height="16" rx="8" fill="var(--color-ink-700)" />
      {/* arrow into db */}
      <path d="M120 60 H 150" fill="none" stroke="var(--color-terracotta-600)" strokeWidth="3" strokeLinecap="round" />
      {/* database cylinder */}
      <ellipse cx="196" cy="62" rx="62" ry="18" fill="var(--color-ink-900)" />
      <path d="M134 62 V 120 A 62 18 0 0 0 258 120 V 62" fill="var(--color-ink-950)" />
      <path d="M134 62 A 62 18 0 0 0 258 62" fill="var(--color-ink-700)" />
      <path d="M134 82 A 62 18 0 0 0 258 82" fill="none" stroke="var(--color-ink-700)" strokeOpacity="0.6" />
      <path d="M134 100 A 62 18 0 0 0 258 100" fill="none" stroke="var(--color-ink-700)" strokeOpacity="0.6" />
      {/* out arrow */}
      <path d="M196 140 V 168" fill="none" stroke="var(--color-terracotta-600)" strokeWidth="3" strokeLinecap="round" />
      {/* table result */}
      <rect x="122" y="172" width="148" height="48" rx="10" fill="var(--color-white)" stroke="var(--color-neutral-300)" />
      <rect x="136" y="184" width="40" height="8" rx="4" fill="var(--color-terracotta-500)" />
      <rect x="186" y="184" width="24" height="8" rx="4" fill="var(--color-neutral-300)" />
      <rect x="220" y="184" width="36" height="8" rx="4" fill="var(--color-neutral-300)" />
      <rect x="136" y="200" width="60" height="8" rx="4" fill="var(--color-ai-cyan)" opacity="0.7" />
      <rect x="206" y="200" width="30" height="8" rx="4" fill="var(--color-success-100)" />
    </svg>
  );
}

export function ApiIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="Two applications exchanging a request and response"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-ink-900)" />
      {/* apps */}
      <rect x="40" y="70" width="86" height="100" rx="14" fill="var(--color-ink-800)" />
      <rect x="194" y="70" width="86" height="100" rx="14" fill="var(--color-ink-800)" />
      <rect x="56" y="92" width="54" height="10" rx="5" fill="var(--color-terracotta-100)" />
      <rect x="210" y="92" width="54" height="10" rx="5" fill="var(--color-ai-cyan)" opacity="0.8" />
      <rect x="56" y="116" width="40" height="10" rx="5" fill="var(--color-lavender-200)" />
      <rect x="210" y="116" width="40" height="10" rx="5" fill="var(--color-lavender-200)" />
      <rect x="56" y="140" width="48" height="10" rx="5" fill="var(--color-ink-700)" />
      <rect x="210" y="140" width="48" height="10" rx="5" fill="var(--color-ink-700)" />
      {/* request */}
      <path d="M126 92 H 168 V 112 H 194" fill="none" stroke="var(--color-terracotta-500)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="194" cy="112" r="6" fill="var(--color-terracotta-500)" />
      {/* response */}
      <path d="M194 148 H 166 V 128 H 126" fill="none" stroke="var(--color-ai-cyan)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="126" cy="128" r="6" fill="var(--color-ai-cyan)" />
      {/* labels */}
      <text x="160" y="86" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-terracotta-100)" fontFamily="var(--font-mono)">
        req
      </text>
      <text x="160" y="170" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-terracotta-100)" fontFamily="var(--font-mono)">
        resp
      </text>
    </svg>
  );
}

export function DeploymentIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A local workspace moving through a pipeline into a live product"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-paper-50)" />
      {/* local */}
      <rect x="40" y="40" width="74" height="52" rx="12" fill="var(--color-ink-900)" />
      <rect x="80" y="106" width="40" height="10" rx="5" fill="var(--color-neutral-300)" />
      {/* pipeline */}
      <rect x="126" y="56" width="68" height="16" rx="8" fill="var(--color-terracotta-600)" opacity="0.9" />
      <rect x="126" y="56" width="68" height="16" rx="8" fill="none" stroke="var(--color-terracotta-600)" />
      <circle cx="136" cy="64" r="3.5" fill="var(--color-terracotta-100)" />
      <circle cx="150" cy="64" r="3.5" fill="var(--color-terracotta-100)" />
      <circle cx="164" cy="64" r="3.5" fill="var(--color-terracotta-100)" />
      <circle cx="178" cy="64" r="3.5" fill="var(--color-terracotta-100)" />
      {/* arrow */}
      <path d="M96 66 H 120" fill="none" stroke="var(--color-terracotta-600)" strokeWidth="3" strokeLinecap="round" />
      <path d="M200 64 H 226" fill="none" stroke="var(--color-terracotta-600)" strokeWidth="3" strokeLinecap="round" />
      {/* live */}
      <rect x="230" y="40" width="74" height="52" rx="12" fill="var(--color-ink-950)" />
      <rect x="244" y="54" width="46" height="8" rx="4" fill="var(--color-terracotta-100)" />
      <rect x="244" y="68" width="30" height="8" rx="4" fill="var(--color-ai-cyan)" opacity="0.7" />
      {/* result checks */}
      <path d="M40 180 H 236" stroke="var(--color-neutral-300)" strokeWidth="2" strokeDasharray="4 6" />
      <circle cx="286" cy="150" r="24" fill="var(--color-success-100)" />
      <path d="M276 152 L 284 160 L 298 144" fill="none" stroke="var(--color-success-600)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="288" y="204" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink-700)" fontFamily="var(--font-mono)">
        live
      </text>
    </svg>
  );
}

export function LearningPathIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A sequence of milestones leading toward a working project"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-lavender-100)" />
      {/* path */}
      <path d="M40 120 H 80 M 96 120 H 150 M 166 120 H 224 M 240 120 H 280" stroke="var(--color-terracotta-500)" strokeWidth="3" strokeLinecap="round" />
      {/* milestone nodes */}
      <g fill="var(--color-white)" stroke="var(--color-terracotta-600)" strokeWidth="2.5">
        <circle cx="88" cy="120" r="14" />
        <circle cx="158" cy="120" r="14" />
        <circle cx="232" cy="120" r="14" />
      </g>
      <circle cx="288" cy="120" r="20" fill="var(--color-terracotta-600)" />
      <path d="M280 120 L 285 125 L 296 112" fill="none" stroke="var(--color-terracotta-100)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* step labels */}
      <text x="88" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink-700)" fontFamily="var(--font-mono)">
        IDEAS
      </text>
      <text x="158" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink-700)" fontFamily="var(--font-mono)">
        SCOPE
      </text>
      <text x="232" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink-700)" fontFamily="var(--font-mono)">
        SHIP
      </text>
      <text x="288" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-terracotta-600)" fontFamily="var(--font-mono)">
        LIVE
      </text>
      {/* project at bottom */}
      <rect x="86" y="160" width="148" height="52" rx="12" fill="var(--color-white)" stroke="var(--color-neutral-300)" />
      <rect x="102" y="176" width="50" height="8" rx="4" fill="var(--color-terracotta-500)" />
      <rect x="162" y="176" width="26" height="8" rx="4" fill="var(--color-neutral-300)" />
      <rect x="102" y="192" width="70" height="8" rx="4" fill="var(--color-ai-cyan)" opacity="0.6" />
      <path d="M246 180 L 266 180 L 266 160 L 260 166 L 266 160" fill="none" stroke="var(--color-ink-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A person, identity token, and protected application boundary"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-ink-950)" />
      {/* boundary */}
      <rect x="176" y="44" width="110" height="152" rx="16" fill="var(--color-ink-900)" stroke="var(--color-terracotta-600)" strokeWidth="3" strokeDasharray="6 5" />
      <rect x="200" y="64" width="62" height="14" rx="7" fill="var(--color-terracotta-100)" />
      <rect x="200" y="90" width="46" height="10" rx="5" fill="var(--color-ink-700)" />
      <rect x="200" y="110" width="46" height="10" rx="5" fill="var(--color-ink-700)" />
      <circle cx="231" cy="160" r="14" fill="var(--color-terracotta-600)" />
      <path d="M224 160 L 229 166 L 239 154" fill="none" stroke="var(--color-terracotta-100)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* person */}
      <circle cx="86" cy="84" r="22" fill="var(--color-lavender-200)" />
      <path d="M48 170 Q48 126 86 126 Q124 126 124 170 Z" fill="var(--color-terracotta-100)" />
      {/* token */}
      <rect x="100" y="150" width="40" height="34" rx="10" fill="var(--color-white)" stroke="var(--color-ai-cyan)" strokeWidth="3" />
      <path d="M110 160 L 130 176 M130 160 L 110 176" stroke="var(--color-ink-700)" strokeWidth="3" strokeLinecap="round" />
      {/* arrows to boundary */}
      <path d="M142 120 C 156 108 168 104 176 100" fill="none" stroke="var(--color-ai-cyan)" strokeWidth="3" strokeLinecap="round" />
      <path d="M140 138 C 154 128 164 122 176 118" fill="none" stroke="var(--color-ai-cyan)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ConsultationIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A founder and an AI clarity session turning an idea into a scoped plan with a next step"
      {...visibleProps()}
    >
      <rect width="320" height="240" rx="20" fill="var(--color-paper-50)" />
      {/* founder */}
      <circle cx="84" cy="86" r="24" fill="var(--color-lavender-200)" />
      <path d="M44 176 Q44 128 84 128 Q124 128 124 176 Z" fill="var(--color-terracotta-100)" />
      {/* thought bubble → idea */}
      <circle cx="86" cy="44" r="16" fill="var(--color-lavender-200)" />
      <path d="M96 56 L 92 66 L 102 58 Z" fill="var(--color-lavender-200)" />
      {/* idea flag */}
      <path d="M110 40 L 196 40 L 186 52 L 196 64 L 110 64 Z" fill="var(--color-ink-900)" />
      <path d="M116 46 L 172 46" stroke="var(--color-terracotta-500)" strokeWidth="2.5" strokeLinecap="round" />
      {/* big chat panel: session + plan */}
      <rect x="170" y="88" width="118" height="112" rx="16" fill="var(--color-white)" stroke="var(--color-ink-700)" strokeWidth="2.5" />
      {/* header */}
      <rect x="180" y="100" width="40" height="12" rx="6" fill="var(--color-ai-cyan)" opacity="0.85" />
      <rect x="228" y="100" width="48" height="12" rx="6" fill="var(--color-neutral-300)" />
      {/* scoped bullets */}
      <rect x="184" y="128" width="52" height="10" rx="5" fill="var(--color-terracotta-600)" />
      <rect x="246" y="128" width="30" height="10" rx="5" fill="var(--color-neutral-300)" />
      <rect x="184" y="148" width="62" height="10" rx="5" fill="var(--color-ink-700)" />
      <rect x="184" y="168" width="58" height="10" rx="5" fill="var(--color-ink-700)" />
      {/* roadmap line */}
      <path d="M184 192 L 248 192" stroke="var(--color-ink-700)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="196" cy="192" r="4" fill="var(--color-terracotta-600)" />
      <circle cx="216" cy="192" r="4" fill="var(--color-ai-cyan)" opacity="0.9" />
      <circle cx="236" cy="192" r="4" fill="var(--color-success-600)" />
      {/* connection from founder to panel */}
      <path d="M124 150 C 138 146 152 146 168 146" fill="none" stroke="var(--color-ink-700)" strokeWidth="2.5" strokeLinecap="round" />
      {/* next step badge */}
      <circle cx="270" cy="56" r="20" fill="var(--color-terracotta-600)" />
      <path d="M262 56 L 268 62 L 278 50" fill="none" stroke="var(--color-white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}