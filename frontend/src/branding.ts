const env = import.meta.env as Record<string, string | undefined>;

function fallback(value: string | undefined, defaultValue: string): string {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : defaultValue;
}

export const BRAND = {
  name: fallback(env.VITE_BRAND_NAME, "AI Novel"),
  tagline: fallback(env.VITE_BRAND_TAGLINE, "AI novel-to-screenplay workspace"),
  description: fallback(
    env.VITE_BRAND_DESCRIPTION,
    "AI Novel converts multi-chapter novels into editable YAML screenplay drafts, then carries them into storyboarding and video workflows.",
  ),
} as const;

export const BRAND_DOCUMENT_TITLE = `${BRAND.name} - ${BRAND.tagline}`;
