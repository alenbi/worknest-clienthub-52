
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/firebase-chat-utils';
import { Paperclip, FileText, Image, FileBadge, FileIcon } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

const ChatMessageComponent = ({ message, isCurrentUser }: ChatMessageProps) => {
  const initial = message.sender_name ? message.sender_name[0] : (isCurrentUser ? 'Y' : 'O');
  
  const displayName = message.sender_name || (isCurrentUser ? 'You' : 'Other');
  
  return (
    <div className={cn(
      "flex w-full mb-4 items-start",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage alt={displayName} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <div className="text-xs mb-1">{displayName}</div>
        <p className="text-sm">{message.message}</p>
        
        {message.attachment_url && message.attachment_type && (
          <div className="mt-2">
            {message.attachment_url && (
              message.attachment_type.startsWith('image/') ? (
                <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img 
                    src={message.attachment_url} 
                    alt="Attachment" 
                    className="max-w-full max-h-40 rounded border" 
                  />
                </a>
              ) : (
                <a 
                  href={message.attachment_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-primary underline mt-2"
                >
                  {message.attachment_type.includes('pdf') ? (
                    <FileText className="h-4 w-4 mr-1" />
                  ) : message.attachment_type.includes('image') ? (
                    <Image className="h-4 w-4 mr-1" />
                  ) : (
                    <FileIcon className="h-4 w-4 mr-1" />
                  )}
                  Attachment
                </a>
              )
            )}
          </div>
        )}
        
        <div className="text-xs opacity-70 mt-1">
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          })}
          {message.is_read && isCurrentUser && (
            <span className="ml-2">✓</span>
          )}
        </div>
      </div>
      
      {isCurrentUser && (
        <Avatar className="h-8 w-8 ml-2">
          <AvatarImage alt={displayName} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export { ChatMessageComponent };
