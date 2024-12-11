import { useState, useCallback } from 'react'
import { createMessage } from '@/lib/openai'
import { Node, Edge } from 'reactflow'
import { saveFlow } from '@/app/actions/flow'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface FlowExport {
  nodes: Node[]
  edges: Edge[]
  timestamp: string
  metadata: {
    version: string
    exportType: string
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const downloadChatAsJson = useCallback(() => {
    try {
      const chatData = {
        messages: messages,
        timestamp: new Date().toISOString(),
        metadata: {
          version: '1.0',
          exportType: 'chat_conversation'
        }
      }

      const jsonString = JSON.stringify(chatData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chat-export-${new Date().toISOString()}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading chat:', err)
      setError('Failed to download chat history')
    }
  }, [messages])

  const downloadFlowAsJson = useCallback((nodes: Node[], edges: Edge[]) => {
    try {
      // Clean up the nodes data to ensure proper serialization
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: {
          input: node.data.input,
          response: node.data.response,
          height: node.data.height
        }
      }))

      const flowData: FlowExport = {
        nodes: cleanNodes,
        edges: edges,
        timestamp: new Date().toISOString(),
        metadata: {
          version: '1.0',
          exportType: 'flow_conversation'
        }
      }

      const jsonString = JSON.stringify(flowData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `flow-export-${new Date().toISOString()}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading flow:', err)
      setError('Failed to download flow')
    }
  }, [])

  const importFlowFromJson = useCallback((file: File): Promise<FlowExport> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string)

          // Validate the imported data structure
          if (!jsonData.nodes || !jsonData.edges || !jsonData.metadata) {
            throw new Error('Invalid flow data structure')
          }

          if (jsonData.metadata.exportType !== 'flow_conversation') {
            throw new Error('Invalid flow file type')
          }

          resolve(jsonData as FlowExport)
        } catch (err) {
          reject(new Error('Failed to parse flow file'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read flow file'))
      }

      reader.readAsText(file)
    })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true)
    setError(null)

    const userMessage = createMessage('user', content)
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Handle the streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantMessage += chunk

        // Update the messages with the current chunk
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
            newMessages[newMessages.length - 1].content = assistantMessage
          } else {
            newMessages.push(createMessage('assistant', assistantMessage))
          }
          return newMessages
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const saveFlowToDb = useCallback(async (nodes: Node[], edges: Edge[]) => {
    try {
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: {
          input: node.data.input,
          response: node.data.response,
          height: node.data.height
        }
      }))

      const flowData = {
        id: conversationId,
        nodes: cleanNodes,
        edges: edges,
        timestamp: new Date().toISOString(),
        metadata: {
          version: '1.0',
          exportType: 'flow_conversation'
        }
      }

      const result = await saveFlow({
        ...flowData,
        id: flowData.id || undefined
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      if (!conversationId) {
        setConversationId(result.id)
      }

      return result.id
    } catch (err) {
      console.warn('Error saving flow:', err)
      throw new Error('Failed to save flow to database')
    }
  }, [conversationId])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    downloadChatAsJson,
    downloadFlowAsJson,
    importFlowFromJson,
    saveFlowToDb,
    conversationId,
  }
}
