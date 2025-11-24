'use client'

import { ChatMessage as ChatMessageType } from '@/types/chat'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface ChatMessageProps {
  message: ChatMessageType
}

function isFenceBalanced(text: string) {
  const matches = text.match(/```/g)
  const count = matches ? matches.length : 0
  return count % 2 === 0
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const content = message.content || ''
  const balanced = isFenceBalanced(content)

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
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            // If a fenced code block is unbalanced (streaming in progress), render plain pre
            balanced ? (
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
            )
          )}

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

