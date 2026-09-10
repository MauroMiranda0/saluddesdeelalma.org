import { Router } from "express";

import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook
} from "./chatbot.controller";

export const chatbotRoutes = Router();

chatbotRoutes.get("/whatsapp", verifyWhatsAppWebhook);
chatbotRoutes.post("/whatsapp", receiveWhatsAppWebhook);
