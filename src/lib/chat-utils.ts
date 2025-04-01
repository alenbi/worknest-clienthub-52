
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/lib/firebase-chat-utils";

// For compatibility, export the Firebase chat utils functions for Supabase
export type { ChatMessage };
export { 
  subscribeToChatMessages, 
  fetchClientMessages, 
  sendMessage, 
  markMessageAsRead 
} from "@/lib/firebase-chat-utils";

// Supabase implementation of chat utilities
export async function fetchSupabaseClientMessages(clientId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []) as ChatMessage[];
  } catch (error) {
    console.error("Error fetching messages from Supabase:", error);
    throw error;
  }
}

export async function sendSupabaseMessage({
  clientId,
  senderId,
  senderName,
  message,
  isFromClient,
  attachmentUrl,
  attachmentType
}: {
  clientId: string;
  senderId: string;
  senderName: string;
  message: string;
  isFromClient: boolean;
  attachmentUrl?: string;
  attachmentType?: string;
}): Promise<ChatMessage> {
  try {
    // Trim message
    const finalMessage = message ? message.trim() : '';
    
    // If no message and no attachment, don't send anything
    if (!finalMessage && !attachmentUrl) {
      throw new Error("Message cannot be empty");
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const messageData: Omit<ChatMessage, 'id'> & { id: string } = {
      id,
      client_id: clientId,
      sender_id: senderId,
      sender_name: senderName,
      is_from_client: isFromClient,
      message: finalMessage,
      is_read: false,
      created_at: now
    };
    
    // Add attachment if present
    if (attachmentUrl && attachmentType) {
      messageData.attachment_url = attachmentUrl;
      messageData.attachment_type = attachmentType;
    }
    
    const { error } = await supabase
      .from('client_messages')
      .insert(messageData);
    
    if (error) throw error;
    
    return messageData as ChatMessage;
  } catch (error) {
    console.error("Error sending message via Supabase:", error);
    throw error;
  }
}

export async function markSupabaseMessageAsRead(clientId: string, messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('client_messages')
      .update({ is_read: true })
      .match({ id: messageId, client_id: clientId });
    
    if (error) throw error;
  } catch (error) {
    console.error("Error marking message as read via Supabase:", error);
    throw error;
  }
}
