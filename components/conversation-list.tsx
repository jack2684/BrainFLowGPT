'use client'

import { useEffect, useState } from 'react'
import { getConversations } from '@/app/actions/flow'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Conversation {
  id: string
  title: string
  updatedAt: Date
}

export function ConversationList({
  onSelect,
  onClose
}: {
  onSelect: (id: string) => void
  onClose: () => void
}) {
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className="w-full text-left p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="text-sm font-medium truncate">
                {conversation.title || '[Untitled]'}
              </div>
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