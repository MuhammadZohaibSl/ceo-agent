import * as React from "react"
import { Send, X, MessageSquare, CornerDownRight, Sparkles, Brain, Pencil, Check, Loader2, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { HighlightText } from "@/components/ui/highlight-text"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { ChatAction, ChatMessage } from "@/types/api"

interface FloatingChatbotProps {
  selection: string
  position: { x: number; y: number }
  onClose: () => void
  onAcceptEdit?: (newText: string) => void
}

export function FloatingChatbot({ selection, position, onClose, onAcceptEdit }: FloatingChatbotProps) {
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestedEdit, setSuggestedEdit] = React.useState<string | null>(null)
  
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleAction = async (action: ChatAction, userMsg?: string) => {
    if (isLoading) return
    
    setIsLoading(true)
    setSuggestedEdit(null)
    
    const messageContent = userMsg || input.trim()
    
    // Add user message if provided
    if (messageContent) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }])
    } else if (action === 'explain' || action === 'refine') {
      // For quick buttons that don't need text, add a system-like indicator
      const label = action === 'explain' ? "Explaining..." : "Refining..."
      setMessages(prev => [...prev, { role: "user", content: label }])
    }

    try {
      const response = await api.chatWithArtifact({
        selectedText: selection,
        action,
        userMessage: messageContent,
        conversationHistory: messages
      })

      setMessages(prev => [...prev, { role: "ai", content: response.reply }])
      
      if (response.suggestedEdit) {
        setSuggestedEdit(response.suggestedEdit)
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: `Error: ${error.message || "Failed to get response. Please try again."}` 
      }])
    } finally {
      setIsLoading(false)
      setInput("")
    }
  }

  const handleAccept = () => {
    if (suggestedEdit && onAcceptEdit) {
      onAcceptEdit(suggestedEdit)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="fixed z-[100] w-80 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden artifact-chatbot backdrop-blur-xl"
        style={{ 
          left: `${Math.min(window.innerWidth - 340, Math.max(20, position.x))}px`, 
          top: `${Math.min(window.innerHeight - 450, Math.max(20, position.y + 20))}px` 
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">Artifact AI</span>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose} className="hover:bg-muted">
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Selection Context */}
        <div className="p-2 px-3 bg-primary/5 border-b border-border/30">
          <div className="flex items-start gap-1.5">
            <CornerDownRight className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground italic line-clamp-2">
              "{selection}"
            </p>
          </div>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="h-52 overflow-y-auto p-3 space-y-3 scrollbar-hide scroll-smooth">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-2 opacity-40">
                <Brain className="w-8 h-8" />
                <p className="text-[10px] font-medium px-6 text-center">Intelligent assistant for your artifact findings.</p>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 w-full px-2">
                <Button 
                  variant="outline" 
                  size="xs" 
                  className="text-[10px] gap-1.5 justify-start hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => handleAction('explain')}
                >
                  <MessageSquare className="w-3 h-3" />
                  Explain
                </Button>
                <Button 
                  variant="outline" 
                  size="xs" 
                  className="text-[10px] gap-1.5 justify-start hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => handleAction('refine')}
                >
                  <RefreshCw className="w-3 h-3" />
                  Refine
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[90%] p-2 px-3 rounded-2xl text-xs shadow-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium whitespace-pre-wrap"
                      : "bg-muted text-foreground chatbot-prose"
                  )}>
                    {msg.role === "ai" ? (
                      <HighlightText text={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-medium animate-pulse">Thinking...</span>
                </div>
              )}

              {suggestedEdit && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-2"
                >
                  <Button 
                    className="w-full text-[10px] h-8 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    onClick={handleAccept}
                  >
                    <Check className="w-3 h-3" />
                    Accept Changes
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-muted/10 border-t border-border/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="How should I edit this?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAction('edit')}
                disabled={isLoading}
                className="h-8 pr-8 text-[11px] bg-background border-border/60 focus-visible:ring-primary shadow-inner placeholder:text-muted-foreground/50 transition-all focus:bg-background"
              />
              <Pencil className="absolute right-2.5 top-2.5 w-3 h-3 text-muted-foreground/30 pointer-events-none" />
            </div>
            <Button 
              size="icon-xs" 
              onClick={() => handleAction('edit')} 
              disabled={!input.trim() || isLoading} 
              className="bg-primary hover:bg-primary/90 shrink-0 h-8 w-8 rounded-lg shadow-lg shadow-primary/20"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
