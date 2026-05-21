import { z } from "zod";

export const questionSchema = z.object({
  _id: z.string().optional(),
  type: z.enum(["text", "radio", "checkbox", "dropdown", "rating"]),
  prompt: z.string().min(1),
  placeholder: z.string().optional().or(z.literal("")),
  isRequired: z.boolean().default(true),
  characterLimit: z.number().optional(),
  shuffleOptions: z.boolean().default(false),
  options: z.array(z.string().min(1)).default([]),
});

export const surveySchema = z.object({
  title: z.string().min(1),
  introduction: z.string().optional(),
  description: z.string().optional(),
  disclaimer: z.string().optional(),
  expiresAt: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  instructions: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  questions: z.array(questionSchema).min(1),
});

export type SurveyInput = z.infer<typeof surveySchema>;
