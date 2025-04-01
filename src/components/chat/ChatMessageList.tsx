
import { useRef, useEffect, memo } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/lib/firebase-chat-utils";
import { ChatMessageComponent } from "./ChatMessage";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  currentUserId: string;
  isLoading: boolean;
  emptyMessage?: string;
}

// Use memo to prevent unnecessary re-renders
const MemoizedChatMessage = memo(ChatMessageComponent);

export function ChatMessageList({ 
  messages, 
  currentUserId, 
  isLoading, 
  emptyMessage = "No messages yet. Start a conversation!"
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change, using requestAnimationFrame for smoother scrolling
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Loading conversation...</span>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <MemoizedChatMessage
          key={message.id}
          message={message}
          isCurrentUser={message.sender_id === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
