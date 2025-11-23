'use client'

import { ChatMessage as ChatMessageType } from '@/types/chat'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <Card className={cn(
        "max-w-[80%]",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <CardContent className="p-4">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.sources && message.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs opacity-70">Sources:</p>
              <ul className="text-xs opacity-70 mt-1">
                {message.sources.map((source, idx) => (
                  <li key={idx}>
                    {source.filename} (score: {source.score.toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

