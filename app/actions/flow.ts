'use server'

import { prisma } from '@/lib/db'
import { ulid } from 'ulid'

interface FlowData {
  id?: string;  // Optional ID for existing conversations
  nodes: any[];
  edges: any[];
  timestamp: string;
  metadata: {
    version: string;
    exportType: string;
  }
}

export async function getConversations() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        title: true,

        updatedAt: true
      }
    })
    return { success: true, conversations }
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return { success: false, error: 'Failed to fetch conversations' }
  }
}

export async function saveFlow(flowData: FlowData) {
  try {
    const id = flowData.id || ulid()

    const conversation = await prisma.conversation.upsert({
      where: {
        id: id,
      },
      update: {
        flowData: flowData,
        title: flowData.nodes[1]?.data?.input?.slice(0, 50) || '[Empty Flow]',
        updatedAt: new Date(),
      },
      create: {
        id: id,
        flowData: flowData,
        title: flowData.nodes[1]?.data?.input?.slice(0, 50) || '[Empty Flow]',
      },
    })

    return { success: true, id: conversation.id }
  } catch (error) {
    console.error('Error saving flow:', error)
    return { success: false, error: 'Failed to save flow' }
  }
}

export async function getConversationFlow(id: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        flowData: true,
        title: true,
      }
    })

    if (!conversation) {
      return { success: false, error: 'Conversation not found' }
    }

    return { success: true, conversation }
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return { success: false, error: 'Failed to fetch conversation' }
  }
} 