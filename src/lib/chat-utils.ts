
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { ChatMessage } from "@/lib/firebase-chat-utils";

export { ChatMessage };

// For compatibility, export the Firebase chat utils functions for Supabase
export { 
  subscribeToChatMessages, 
  fetchClientMessages, 
  sendMessage, 
  uploadChatFile, 
  markMessageAsRead 
} from "@/lib/firebase-chat-utils";
