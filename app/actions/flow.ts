'use server'

import { prisma } from '@/lib/db'
import { ulid } from 'ulid'

interface FlowData {
  id?: string;
  nodes: any[];
  edges: any[];
  timestamp: string;
  metadata: {
    version: string;
    exportType: string;
  }
}

export async function getConversations() {
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
}

export async function saveFlow(flowData: FlowData) {
  // Check if the flow is empty (no nodes)
  if (!flowData.nodes || flowData.nodes.length === 0) {
    return { success: false, error: 'Cannot save empty flow' }
  }

  const id = flowData.id || ulid()

  const conversation = await prisma.conversation.upsert({
    where: {
      id: id,
    },
    update: {
      id: id,
      flow_data: flowData,
      title: flowData.nodes[1]?.data?.input?.slice(0, 50) || '[Empty Flow]',
      updatedAt: new Date(),
    },
    create: {
      id: id,
      flow_data: flowData,
      title: flowData.nodes[1]?.data?.input?.slice(0, 50) || '[Empty Flow]',
    },
  })

  return { success: true, id: conversation.id }
}

export async function getConversationFlow(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      flow_data: true,
      title: true,
    }
  })

  if (!conversation) {
    return { success: false, error: 'Conversation not found' }
  }

  return { success: true, conversation }
}

export async function deleteConversation(id: string) {
  await prisma.conversation.delete({
    where: {
      id: id,
    },
  })

  return { success: true }
} 