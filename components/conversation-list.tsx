'use client'

import { useEffect, useState } from 'react'
import { getConversations, deleteConversation } from '@/app/actions/flow'
import { format } from 'date-fns'
import { X, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Conversation {
  id: string
  title: string
  updatedAt: Date
  lastModifiedAt: Date
}

export function ConversationList({
  onSelect,
  onClose,
  refreshTrigger = 0
}: {
  onSelect: (id: string) => void
  onClose: () => void
  refreshTrigger?: number
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadConversations = async () => {
    setLoading(true)
    const result = await getConversations()
    if (result.success) {
      setConversations(result.conversations)
    }
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeleting(id)
    try {
      const result = await deleteConversation(id)
      if (result.success) {
        await loadConversations()
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
    setDeleting(null)
  }

  useEffect(() => {
    loadConversations()
  }, [refreshTrigger])

  return (
    <div className="w-64 h-full border-l border-gray-200 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">History</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadConversations}
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="p-4">Loading conversations...</div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className="w-full text-left p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
              >
                <div className="text-sm font-medium truncate">
                  {conversation.title || '[Untitled]'}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(conversation.lastModifiedAt || conversation.updatedAt), 'MMM d, yyyy HH:mm:ss')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(e, conversation.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  disabled={deleting === conversation.id}
                >
                  <Trash2 className={`h-3 w-3 text-red-500 ${deleting === conversation.id ? 'animate-spin' : ''}`} />
                </Button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 