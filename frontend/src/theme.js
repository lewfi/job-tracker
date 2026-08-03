export const COLORS = {
    dark: "#0A0A0A",
    accent: "#0047FF",
    muted: "#6B6B6B",
    mutedLight: "#9CA3AF",
    bgLight: "#F3F4F6",
    error: "#B91C1C",
    border: "#000000",
}

export const MONO = "'IBM Plex Mono', monospace"

export const STATUSES = ["applied", "oa", "screen", "technical", "behavioral", "onsite", "offer", "rejected", "withdrawn"]
export const SOURCES = ["linkedin", "indeed", "company_website", "referral", "handshake", "other"]

export const SOURCE_LABELS = {
    linkedin: "LinkedIn",
    indeed: "Indeed",
    company_website: "Company site",
    referral: "Referral",
    handshake: "Handshake",
    other: "Other",
}

export const STATUS_LABELS = {
    applied: "Applied",
    oa: "OA",
    screen: "Screen",
    technical: "Technical",
    behavioral: "Behavioral",
    onsite: "Onsite",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
}

// `swatch` is the representative hue for each status (used in charts/bars).
// It matches `color` except for `offer`, whose badge uses a solid fill with
// white text — there the swatch is the fill color itself.
export const STATUS_META = {
    applied: { bg: COLORS.bgLight, color: "#4B5563", swatch: "#4B5563" },
    oa: { bg: "#FEF3C7", color: "#92400E", swatch: "#92400E" },
    screen: { bg: "#E0E7FF", color: "#4338CA", swatch: "#4338CA" },
    technical: { bg: "#CCFBF1", color: "#0F766E", swatch: "#0F766E" },
    behavioral: { bg: "#FCE7F3", color: "#BE185D", swatch: "#BE185D" },
    onsite: { bg: "#F3E8FF", color: "#7E22CE", swatch: "#7E22CE" },
    offer: { bg: "#16A34A", color: "#FFFFFF", swatch: "#16A34A" },
    rejected: { bg: "#FEE2E2", color: COLORS.error, swatch: COLORS.error },
    withdrawn: { bg: "#F5F5F4", color: "#57534E", swatch: "#57534E" },
}
