import { ref, push, set, onValue, off, get, query, orderByChild, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { database, storage } from "@/integrations/firebase/config";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { 
  fetchClientMessages as fetchSupabaseClientMessages,
  sendMessage as sendSupabaseMessage,
  uploadChatFile as uploadSupabaseChatFile,
  markMessageAsRead as markSupabaseMessageAsRead
} from "@/lib/chat-utils";

export interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  client_id: string;
  is_from_client: boolean;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  attachment_url?: string;
  attachment_type?: string;
}

export type MessageHandler = (message: ChatMessage) => void;

// Track if Firebase is available
let isFirebaseAvailable = false;

/**
 * Tests the Firebase connection
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testRef = ref(database, '.info/connected');
    
    return new Promise((resolve) => {
      // Create a timeout ID variable BEFORE creating the onValue callback
      let timeoutId: number | undefined;
      
      // Prepare cleanup function
      const cleanup = () => {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      };
      
      // Create the onValue function reference first before using it
      const onValueCallback = (snapshot: any) => {
        cleanup(); // Clear timeout
        
        // Now we can safely call unsubscribe because it's defined
        if (unsubscribe) {
          unsubscribe();
        }
        
        const connected = snapshot.val() === true;
        console.log("Firebase connection test:", connected ? "Connected" : "Not connected");
        isFirebaseAvailable = connected;
        resolve(connected);
      };
      
      // Create the error handler function
      const onError = (error: any) => {
        cleanup(); // Clear timeout
        
        // Now we can safely call unsubscribe because it's defined
        if (unsubscribe) {
          unsubscribe();
        }
        
        console.error("Firebase connection test failed:", error);
        isFirebaseAvailable = false;
        resolve(false);
      };
      
      // Define unsubscribe BEFORE using it
      let unsubscribe: (() => void) | null = null;
      
      // Assign the actual onValue result to unsubscribe
      try {
        unsubscribe = onValue(testRef, onValueCallback, onError);
      } catch (innerError) {
        console.error("Error setting up Firebase listener:", innerError);
        cleanup();
        isFirebaseAvailable = false;
        resolve(false);
        return;
      }
      
      // Set a timeout in case onValue doesn't fire
      timeoutId = window.setTimeout(() => {
        console.error("Firebase connection test timed out");
        if (unsubscribe) {
          unsubscribe();
        }
        isFirebaseAvailable = false;
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error("Error testing Firebase connection:", error);
    isFirebaseAvailable = false;
    return false;
  }
}

// Test Firebase connection when module is loaded
testFirebaseConnection();

/**
 * Subscribes to chat messages for a specific client
 */
export function subscribeToChatMessages(
  clientId: string,
  onNewMessage: MessageHandler
): () => void {
  try {
    if (!isFirebaseAvailable) {
      console.log("Firebase not available, using Supabase for chat subscription");
      const channel = supabase
        .channel(`client_chat_${clientId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'client_messages',
            filter: `client_id=eq.${clientId}`
          }, 
          async (payload) => {
            console.log("New message received via Supabase realtime:", payload);
            const newMessage = payload.new as ChatMessage;
            onNewMessage(newMessage);
          })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
    
    console.log("Setting up Firebase messages subscription for client:", clientId);
    const messagesRef = ref(database, `messages/${clientId}`);
    const messageQuery = query(messagesRef, orderByChild('created_at'));
    
    const handleNewMessage = (snapshot: any) => {
      console.log("Firebase message snapshot received");
      const data = snapshot.val();
      if (!data) {
        console.log("No data in Firebase message snapshot");
        return;
      }
      
      // Process all messages as they come in
      Object.keys(data).forEach(key => {
        const message = data[key];
        console.log("Processing Firebase message:", key);
        onNewMessage({
          id: key,
          ...message,
        });
      });
    };
    
    console.log("Attaching Firebase onValue listener");
    onValue(messageQuery, handleNewMessage, (error) => {
      console.error("Firebase onValue error:", error);
      isFirebaseAvailable = false;
      toast.error("Chat connection lost, trying alternative connection...");
    });
    
    // Return unsubscribe function
    return () => {
      console.log("Detaching Firebase message listener");
      off(messagesRef);
    };
  } catch (error) {
    console.error("Error in subscribeToChatMessages:", error);
    isFirebaseAvailable = false;
    toast.error("Failed to connect to chat service, trying alternative...");
    // Switch to Supabase if Firebase fails
    const channel = supabase
      .channel(`client_chat_${clientId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'client_messages',
          filter: `client_id=eq.${clientId}`
        }, 
        async (payload) => {
          console.log("New message received via Supabase realtime:", payload);
          const newMessage = payload.new as ChatMessage;
          onNewMessage(newMessage);
        })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

/**
 * Fetches chat messages for a client
 */
export async function fetchClientMessages(clientId: string): Promise<ChatMessage[]> {
  console.log("Fetching messages for client:", clientId);
  try {
    if (!isFirebaseAvailable) {
      console.log("Firebase not available, using Supabase for fetching messages");
      return await fetchSupabaseClientMessages(clientId);
    }
    
    console.log("Fetching Firebase messages for client:", clientId);
    const messagesRef = ref(database, `messages/${clientId}`);
    console.log("Firebase messages ref path:", `messages/${clientId}`);
    
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      console.log("No Firebase messages found for client:", clientId);
      return [];
    }
    
    const data = snapshot.val();
    console.log("Firebase messages data received:", Object.keys(data).length, "messages");
    
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
  } catch (error) {
    console.error("Error fetching Firebase messages:", error);
    isFirebaseAvailable = false;
    
    // Fallback to Supabase
    try {
      console.log("Falling back to Supabase for fetching messages");
      return await fetchSupabaseClientMessages(clientId);
    } catch (fallbackError) {
      console.error("Fallback to Supabase also failed:", fallbackError);
      throw new Error(`Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Marks a message as read
 */
export async function markMessageAsRead(clientId: string, messageId: string): Promise<void> {
  try {
    if (!isFirebaseAvailable) {
      console.log("Firebase not available, using Supabase for marking message as read");
      await markSupabaseMessageAsRead(messageId);
      return;
    }
    
    console.log("Marking Firebase message as read:", messageId);
    const messageRef = ref(database, `messages/${clientId}/${messageId}`);
    await update(messageRef, { is_read: true });
    console.log("Firebase message marked as read successfully");
  } catch (error) {
    console.error("Error marking Firebase message as read:", error);
    isFirebaseAvailable = false;
    
    // Fallback to Supabase
    try {
      await markSupabaseMessageAsRead(messageId);
    } catch (fallbackError) {
      console.error("Fallback to Supabase also failed:", fallbackError);
    }
  }
}

/**
 * Sends a new message
 */
export async function sendMessage({
  clientId,
  senderId,
  senderName,
  message,
  isFromClient,
  attachmentUrl = null,
  attachmentType = null
}: {
  clientId: string;
  senderId: string;
  senderName: string;
  message: string;
  isFromClient: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}): Promise<ChatMessage | null> {
  try {
    if (!isFirebaseAvailable) {
      console.log("Firebase not available, using Supabase for sending message");
      return await sendSupabaseMessage({
        clientId, 
        senderId, 
        message, 
        isFromClient, 
        attachmentUrl, 
        attachmentType
      });
    }
    
    console.log("Sending Firebase message", {
      clientId,
      senderId,
      isFromClient,
      hasAttachment: !!attachmentUrl
    });
    
    // Trim message but keep it if it's only an attachment
    const finalMessage = message ? message.trim() : '';
    
    // If no message and no attachment, don't send anything
    if (!finalMessage && !attachmentUrl) {
      return null;
    }
    
    const now = new Date().toISOString();
    const id = uuidv4();
    
    const messageData = {
      client_id: clientId,
      sender_id: senderId,
      sender_name: senderName,
      is_from_client: isFromClient,
      message: finalMessage,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      is_read: false,
      created_at: now
    };
    
    const messagesRef = ref(database, `messages/${clientId}/${id}`);
    await set(messagesRef, messageData);
    
    console.log("Firebase message sent successfully:", id);
    
    return {
      id,
      ...messageData
    };
  } catch (error) {
    console.error("Error sending Firebase message:", error);
    isFirebaseAvailable = false;
    
    // Fallback to Supabase
    try {
      console.log("Falling back to Supabase for sending message");
      return await sendSupabaseMessage({
        clientId, 
        senderId, 
        message, 
        isFromClient, 
        attachmentUrl, 
        attachmentType
      });
    } catch (fallbackError) {
      console.error("Fallback to Supabase also failed:", fallbackError);
      toast.error("Failed to send message. Please try again.");
      throw error;
    }
  }
}

/**
 * Uploads a file to Firebase Storage
 */
export async function uploadChatFile(
  file: File,
  clientId: string,
  isAdmin: boolean
): Promise<{ url: string; type: string }> {
  try {
    if (!isFirebaseAvailable) {
      console.log("Firebase not available, using Supabase for file upload");
      return await uploadSupabaseChatFile(file, clientId, isAdmin);
    }
    
    console.log("Uploading file to Firebase Storage");
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const prefix = isAdmin ? 'admin-attachments' : 'client-attachments';
    const filePath = `${prefix}/${clientId}/${fileName}`;
    
    // Upload file to Firebase Storage
    const fileRef = storageRef(storage, `chat/${filePath}`);
    
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    console.log("File uploaded successfully:", snapshot.metadata.name);
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(fileRef);
    
    return {
      url: downloadUrl,
      type: fileType
    };
  } catch (error) {
    console.error("File upload failed:", error);
    isFirebaseAvailable = false;
    
    // Fallback to Supabase
    try {
      console.log("Falling back to Supabase for file upload");
      return await uploadSupabaseChatFile(file, clientId, isAdmin);
    } catch (fallbackError) {
      console.error("Fallback to Supabase also failed:", fallbackError);
      toast.error("Failed to upload file. Please try again.");
      throw error;
    }
  }
}

// Import Supabase for fallback
import { supabase } from "@/integrations/supabase/client";
