import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { messagingApi } from '../../../lib/api/messaging.api'
import { useMessages } from '../../../hooks/useMessages'
import { ROUTES } from '../../../constants/routes'
import { formatDate } from '../../../lib/utils/format'

interface ConversationListItem {
  id: string
  name: string | null
  type: string
  lastMessageAt: string | null
  unread: number
  members: { user: { id: string; name: string; avatarUrl: string | null } }[]
  messages: { content: string; createdAt: string }[]
}

function ConversationPane({ conversationId }: { conversationId: string }) {
  const { messages, loading, typingUsers, sendMessage, startTyping, stopTyping, markRead } = useMessages(conversationId)
  const [input, setInput] = useState('')
  const currentUserId = localStorage.getItem('userId') ?? ''

  useEffect(() => { markRead() }, [conversationId])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
    stopTyping()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-center text-gray-400 text-sm">Loading messages...</div>}
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMine && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {msg.sender.name[0]}
                </div>
              )}
              <div className={`max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMine && <span className="text-xs text-gray-400 mb-1 ml-1">{msg.sender.name}</span>}
                <div className={`px-3 py-2 rounded-xl text-sm ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {msg.deleted ? <em className="opacity-50">Message deleted</em> : msg.content}
                </div>
                <span className="text-xs text-gray-300 mt-1 mx-1">{formatDate(msg.createdAt)}</span>
              </div>
            </div>
          )
        })}
        {typingUsers.size > 0 && (
          <div className="text-xs text-gray-400 italic pl-2">Someone is typing...</div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => { setInput(e.target.value); startTyping() }}
          onBlur={stopTyping}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    messagingApi.getConversations().then((res) => setConversations(res.data.items ?? [])).finally(() => setLoading(false))
  }, [])

  const activeConv = conversations.find((c) => c.id === conversationId)

  const convName = (c: ConversationListItem) => {
    if (c.name) return c.name
    const others = c.members.filter((m) => m.user.id !== localStorage.getItem('userId'))
    return others.map((m) => m.user.name).join(', ') || 'Conversation'
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-72 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(ROUTES.CONVERSATION.replace(':conversationId', c.id))}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b ${c.id === conversationId ? 'bg-indigo-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-800 truncate">{convName(c)}</span>
                {c.unread > 0 && (
                  <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">{c.unread}</span>
                )}
              </div>
              {c.messages[0] && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{c.messages[0].content}</p>
              )}
              <p className="text-xs text-gray-300 mt-0.5">{c.type}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main pane */}
      <div className="flex-1 bg-white">
        {conversationId ? (
          <>
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-gray-800">{activeConv ? convName(activeConv) : 'Conversation'}</h3>
            </div>
            <ConversationPane conversationId={conversationId} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}
