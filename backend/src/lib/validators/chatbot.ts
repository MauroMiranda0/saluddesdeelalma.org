import { z } from "zod";

export const conversationIntentSchema = z.enum([
  "faq",
  "availability",
  "book",
  "cancel",
  "payment_info",
  "payment_status",
  "identity_check",
  "handoff",
  "unknown"
]);

export const whatsappWebhookSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.record(z.string(), z.unknown()))
});

export const chatMessageSchema = z.object({
  conversationId: z.uuid(),
  waMessageId: z.string().min(1).max(120),
  direction: z.enum(["inbound", "outbound"]),
  senderKind: z.enum(["patient", "assistant", "admin", "system"]),
  contentMode: z.enum(["full_text", "admin_summary"]),
  contentText: z.string().min(1),
  containsSensitiveClinicalContent: z.boolean().default(false),
  intent: conversationIntentSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
