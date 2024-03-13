'use client'

import { useChat, type Message } from 'ai/react'

import { Socket, io } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { cn, nanoid } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'
import { usePathname, useRouter } from 'next/navigation'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export interface SocketMessage {
  role: 'user' | 'ai'
  userName: String
  message: String
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const path = usePathname()
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userTyping, setUserTyping] = useState<string | null>(null)
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const [isWsMessageLoading, setIsWsMessageLoading] = useState<boolean>(false)
  const {
    messages,
    append,
    reload,
    stop,
    isLoading,
    input,
    setInput,
    setMessages
  } = useChat({
    initialMessages,
    id,
    body: {
      id,
      previewToken
    },
    onResponse(response) {
      if (response.status === 401) {
        toast.error(response.statusText)
      }
    },
    onFinish(message) {
      sendMessage('assistant', message.content)

      if (!path.includes('chat')) {
        router.push(`/chat/${id}`, { shallow: true, scroll: false })
        router.refresh()
      }
    }
  })

  const isActuallyLoading = isWsMessageLoading || isLoading

  const sendMessage = useCallback(
    (role: string, message: string) => {
      socket!.emit('chat-message', role, message)
    },
    [socket]
  )

  useEffect(() => {
    const Socket = io('http://localhost:3001')
    setSocket(Socket)

    Socket.on('connect', () => {
      // console.log('connected')
    })

    Socket.on('disconnect', () => {
      // console.log('disconnected')
    })

    const userName = session?.user.name // Get the user's name from your application state or an input field
    const roomId = id // Get the room ID from your application state or a URL parameter
    Socket.emit('join', { userName, roomId })

    // Clean up function
    return () => {
      Socket.disconnect()
    }
  }, [id, session])

  useEffect(() => {
    const Socket = socket // Get the socket instance from the previous effect

    if (Socket) {
      Socket.on('chat-message', (message: SocketMessage) => {
        console.log(
          `received message: ${message.message} from : ${message.role} ${message.userName}`
        )
        if (message.role == 'user') {
          setIsWsMessageLoading(true)
        } else {
          setIsWsMessageLoading(false)
        }
        const newMessage = {
          id: nanoid(),
          content: message.message,
          role: message.role,
          createdAt: new Date()
        } as Message
        setMessages([...messages, newMessage])
      })

      Socket.on('user-typing', (userName: string) => {
        setUserTyping(userName)
      })

      // Clean up function
      return () => {
        Socket.off('chat-message')
        Socket.off('user-typing')
      }
    }
  }, [socket, messages, setMessages])

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUserTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing')

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current)
      }

      typingTimeout.current = setTimeout(() => {
        socket.emit('stop-typing')
        typingTimeout.current = null
      }, 1500)
    }
  }, [socket])

  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isActuallyLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isActuallyLoading}
        stop={stop}
        append={append}
        sendMessage={sendMessage}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
        userTyping={userTyping}
        handleUserTyping={handleUserTyping}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
