export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "FOUNDERS_CATALOGUE",
  "CONTACT_FORM",
  "INTEREST_FORM",
  "QUOTE_FORM",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_OFFERINGS = [
  "90_MIN_STRATEGY_SESSION",
  "IDEA_TO_MVP_SPRINT",
  "AI_BUILD_PRICED",
  "PRODUCT_BUILD_QUOTE_ONLY",
] as const;

export type LeadOffering = (typeof LEAD_OFFERINGS)[number];

export const LEAD_OFFERING_LABELS: Record<LeadOffering, string> = {
  "90_MIN_STRATEGY_SESSION": "90-minute strategy session",
  "IDEA_TO_MVP_SPRINT": "Idea to MVP sprint",
  AI_BUILD_PRICED: "Building your product with AI",
  PRODUCT_BUILD_QUOTE_ONLY: "Build a product with us",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  CLOSED_WON: "Closed won",
  CLOSED_LOST: "Closed lost",
};