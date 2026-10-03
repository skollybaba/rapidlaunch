import { z } from "zod";

import { LEAD_STATUSES } from "@/types/lead";

export const interestFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email is required")
      .max(254, "Email is too long"),
    phone: z.string().trim().optional(),
    company: z.string().trim().optional(),
    whatYouAreBuilding: z
      .string()
      .trim()
      .min(1, "Please tell us what you're building")
      .max(2000, "Description is too long"),
    currentStage: z.string().trim().optional(),
    helpNeeded: z
      .string()
      .trim()
      .min(1, "Please tell us what help you need")
      .max(2000, "Description is too long"),
    timeline: z.string().trim().optional(),
  })
  .strict();

export type InterestFormInput = z.infer<typeof interestFormSchema>;

export const quoteFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email is required")
      .max(254, "Email is too long"),
    phone: z.string().trim().optional(),
    company: z.string().trim().optional(),
    website: z.string().trim().url("A valid URL is required").optional().or(z.literal("")),
    whatYouAreBuilding: z
      .string()
      .trim()
      .min(1, "Please tell us what you're building")
      .max(2000, "Description is too long"),
    projectScope: z
      .string()
      .trim()
      .min(1, "Please describe the project scope")
      .max(5000, "Description is too long"),
    requirements: z.string().trim().max(5000, "Description is too long").optional(),
    teamSize: z.string().trim().optional(),
    timeline: z.string().trim().optional(),
    budgetMinor: z.coerce.number().min(0).max(1_000_000_000).optional(),
    budgetCurrency: z.string().uppercase().optional(),
  })
  .strict();

export type QuoteFormInput = z.infer<typeof quoteFormSchema>;

export const updateLeadStatusSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    notes: z.string().trim().max(5000, "Notes are too long").optional(),
    assignedTo: z.string().trim().max(120, "Name is too long").optional(),
  })
  .strict();

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
