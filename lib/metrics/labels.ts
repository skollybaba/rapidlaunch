/**
 * Human labels for product types, shared by the metrics service and the admin
 * product picker. Kept free of server-only imports so client components can use
 * it for optgroup headings.
 */
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  COURSE: "Online courses",
  BOOK: "Digital books",
  CONSULTATION: "Sessions",
  MVP_SERVICE: "MVP services",
};
