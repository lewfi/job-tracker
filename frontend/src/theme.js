export const COLORS = {
    dark: "#0A0A0A",
    accent: "#0047FF",
    muted: "#6B6B6B",
    mutedLight: "#9CA3AF",
    bgLight: "#F3F4F6",
    pillBlueBg: "#E6EEFF",
    error: "#B91C1C",
    border: "#000000",
}

export const MONO = "'IBM Plex Mono', monospace"

export const STATUSES = ["applied", "oa", "screen", "onsite", "offer", "rejected", "withdrawn"]
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
    onsite: "Onsite",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
}

export const STATUS_META = {
    applied: { bg: COLORS.bgLight, color: "#4B5563" },
    oa: { bg: COLORS.pillBlueBg, color: COLORS.accent },
    screen: { bg: COLORS.pillBlueBg, color: COLORS.accent },
    onsite: { bg: COLORS.pillBlueBg, color: COLORS.accent },
    offer: { bg: COLORS.accent, color: "#FFFFFF" },
    rejected: { bg: COLORS.bgLight, color: COLORS.mutedLight },
    withdrawn: { bg: COLORS.bgLight, color: COLORS.mutedLight },
}
