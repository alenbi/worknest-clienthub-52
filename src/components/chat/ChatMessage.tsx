
import { format } from "date-fns";
import { File } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatMessage as ChatMessageType } from "@/lib/firebase-chat-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatMessageProps {
  message: ChatMessageType;
  isCurrentUser: boolean;
  showAvatar?: boolean;
}

export function ChatMessage({ message, isCurrentUser, showAvatar = true }: ChatMessageProps) {
  const isMobile = useIsMobile();
  
  // Reduce avatar size on mobile
  const avatarSize = isMobile ? "h-6 w-6" : "h-8 w-8";
  const messageMaxWidth = isMobile ? "max-w-[85%]" : "max-w-[80%]";
  
  return (
    <div 
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {showAvatar && !isCurrentUser && (
        <Avatar className={`${avatarSize} mr-2`}>
          <AvatarFallback className="bg-muted text-muted-foreground">
            {message.sender_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`${messageMaxWidth} ${isCurrentUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-lg px-3 py-2 ${isMobile ? 'text-sm' : ''} ${
            isCurrentUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}
        >
          {message.attachment_url && message.attachment_type === 'image' && (
            <a 
              href={message.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block mb-2"
            >
              <img 
                src={message.attachment_url} 
                alt="Attachment" 
                className="rounded max-h-48 max-w-full"
                loading="lazy"
              />
            </a>
          )}
          
          {message.attachment_url && message.attachment_type !== 'image' && (
            <a 
              href={message.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center mb-2 text-blue-500 hover:underline"
            >
              <File className="h-4 w-4 mr-1" />
              {isMobile ? "File" : "Attachment"}
            </a>
          )}
          
          <div className="break-words">{message.message}</div>
        </div>
        
        <div
          className={`text-xs mt-1 text-muted-foreground`}
        >
          {!isCurrentUser && `${message.sender_name || ''} • `}
          {format(new Date(message.created_at), isMobile ? "h:mm a" : "MMM d, h:mm a")}
        </div>
      </div>
      
      {showAvatar && isCurrentUser && (
        <Avatar className={`${avatarSize} ml-2`}>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {message.sender_name?.[0]?.toUpperCase() || 'Y'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
