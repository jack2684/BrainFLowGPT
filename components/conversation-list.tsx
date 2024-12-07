'use client'

import { useEffect, useState } from 'react'
import { getConversations } from '@/app/actions/flow'
import { format } from 'date-fns'

interface Conversation {
  id: string
  title: string
  updatedAt: Date
}

export function ConversationList({ onSelect }: { onSelect: (id: string) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConversations = async () => {
      const result = await getConversations()
      if (result.success) {
        setConversations(result.conversations)
      }
      setLoading(false)
    }

    loadConversations()
  }, [])

  if (loading) {
    return <div className="p-4">Loading conversations...</div>
  }

  return (
    <div className="w-64 h-full border-l border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Conversations</h2>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className="w-full text-left p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="text-sm font-medium truncate">{conversation.title}</div>
              <div className="text-xs text-gray-500">
                {format(new Date(conversation.updatedAt), 'MMM d, yyyy')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 