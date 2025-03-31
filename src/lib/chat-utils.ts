
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/firebase-chat-utils";

// For compatibility, export the Firebase chat utils functions for Supabase
export type { ChatMessage };
export { 
  subscribeToChatMessages, 
  fetchClientMessages, 
  sendMessage, 
  uploadChatFile, 
  markMessageAsRead 
} from "@/lib/firebase-chat-utils";
