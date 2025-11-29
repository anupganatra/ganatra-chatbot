"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUp, Mic, MicOff } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string
      }
      isFinal: boolean
    }
    length: number
  }
}

interface SpeechRecognitionErrorEvent {
  error: string
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  // Check browser support immediately (synchronously)
  const isSupported = typeof window !== "undefined" && 
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>("")
  const lastResultIndexRef = useRef<number>(0)
  const isRecordingRef = useRef<boolean>(false)

  // Initialize recognition
  useEffect(() => {
    if (typeof window !== "undefined" && isSupported) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"
        // Don't auto-stop on silence - let user control when to stop
        // This prevents text from being cleared when recognition auto-stops

        recognition.onstart = () => {
          // Don't reset - preserve any existing text in the input
          // The finalTranscriptRef will be set from the current message state
          lastResultIndexRef.current = 0
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = ""
          let allFinalTranscript = ""

          // Process ALL results to get complete final transcript
          // This ensures we capture everything, even if some became final
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              // Collect all final results
              allFinalTranscript += transcript + " "
            } else {
              // Only keep the latest interim result (from new results)
              if (i >= event.resultIndex) {
                interimTranscript = transcript
              }
            }
          }

          // Update final transcript reference with all final results
          if (allFinalTranscript) {
            finalTranscriptRef.current = allFinalTranscript.trim()
          }

          // Update message - always preserve what we have
          setMessage((prev) => {
            // Get base from final transcript or current message (without indicator)
            const baseWithoutIndicator = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
            const baseMessage = finalTranscriptRef.current || baseWithoutIndicator || prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
            
            // Add interim if present
            const newMessage = baseMessage + (interimTranscript ? " " + interimTranscript : "")
            const result = newMessage.trim() + (interimTranscript ? " [listening...]" : "")
            
            // Always update ref with current final state (without interim) - preserve existing if no new final
            if (allFinalTranscript) {
              finalTranscriptRef.current = allFinalTranscript.trim()
            } else if (baseMessage && !interimTranscript) {
              // Preserve base message if no interim
              finalTranscriptRef.current = baseMessage
            }
            
            // Never return empty - always preserve something
            return result || baseMessage || prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim() || ""
          })
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error)
          
          // Don't clear message on error, just stop recording
          if (event.error === "not-allowed") {
            setIsRecording(false)
            alert("Microphone permission denied. Please enable microphone access in your browser settings.")
          } else if (event.error === "no-speech") {
            // This is normal when user stops speaking - don't clear, just remove indicator
            setIsRecording(false)
            setMessage((prev) => {
              const cleaned = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
              finalTranscriptRef.current = cleaned
              return cleaned
            })
          } else if (event.error === "aborted") {
            // Recognition was stopped manually - this is fine
            setIsRecording(false)
          } else {
            setIsRecording(false)
            // Keep the transcribed text even on other errors
            setMessage((prev) => {
              const cleaned = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
              finalTranscriptRef.current = cleaned
              return cleaned
            })
            alert(`Speech recognition error: ${event.error}`)
          }
        }

        recognition.onend = () => {
          // Always preserve the text - never clear it
          // Just remove the [listening...] indicator
          setMessage((prev) => {
            const cleaned = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
            // Always preserve the text in the ref
            if (cleaned) {
              finalTranscriptRef.current = cleaned
            }
            // Return the cleaned message (preserves all text) - never return empty
            return cleaned || prev || finalTranscriptRef.current
          })
          
          // If we're still supposed to be recording, restart
          // Use ref to get current state (not stale closure)
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              // Small delay to avoid immediate restart issues
              setTimeout(() => {
                if (recognitionRef.current && isRecordingRef.current) {
                  recognitionRef.current.start()
                }
              }, 100)
            } catch (e) {
              // If restart fails, stop recording
              isRecordingRef.current = false
              setIsRecording(false)
            }
          } else {
            // User stopped recording
            isRecordingRef.current = false
            setIsRecording(false)
          }
        }

        recognitionRef.current = recognition
      }
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
        recognitionRef.current = null
      }
    }
  }, [isSupported])

  const toggleRecording = () => {
    if (!isSupported || !recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.")
      return
    }

    if (isRecording) {
      // Stop recording
      isRecordingRef.current = false
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error("Error stopping recognition:", e)
        setIsRecording(false)
      }
    } else {
      // Start recording - preserve existing message
      const existingMessage = message.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
      finalTranscriptRef.current = existingMessage
      lastResultIndexRef.current = 0
      isRecordingRef.current = true
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (e) {
        console.error("Error starting recognition:", e)
        isRecordingRef.current = false
        setIsRecording(false)
        alert("Failed to start speech recognition. Please check your microphone permissions.")
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore errors
      }
    }
    // Clean up [listening...] indicator
    const cleanMessage = message.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()
    if (cleanMessage && !disabled) {
      onSend(cleanMessage)
      setMessage("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative rounded-2xl border border-input bg-background shadow-sm">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can I help you today?"
          className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent pr-24 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <div className="absolute right-2 bottom-2 flex gap-1">
          {isSupported && (
            <Button
              type="button"
              onClick={toggleRecording}
              disabled={disabled}
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className={`h-8 w-8 rounded-full transition-all ${
                isRecording
                  ? "bg-destructive hover:bg-destructive/90 animate-pulse text-destructive-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            type="submit"
            disabled={disabled || !message.replace(/\s*\[listening\.\.\.\]\s*$/, "").trim()}
            size="icon"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
