import { z } from "zod";

const customCodePattern = /^[a-zA-Z0-9_-]{4,32}$/;

export const createLinkSchema = z.object({
  targetUrl: z.string().url().max(2048),
  customCode: z
    .string()
    .trim()
    .regex(customCodePattern, "Use 4-32 letters, numbers, underscores, or dashes.")
    .optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
  expiresAt: z.string().datetime().optional()
});

export const codeParamSchema = z.object({
  code: z.string().trim().regex(customCodePattern)
});

export const analyticsQuerySchema = z.object({
  adminKey: z.string().min(24).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const analyticsParamSchema = z.object({
  code: z.string().trim().regex(customCodePattern)
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
