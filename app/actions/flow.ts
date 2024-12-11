'use server'

import { prisma } from '@/lib/db'
import pino from 'pino';
import { ulid } from 'ulid'
const logger = pino()

interface FlowData extends Record<string, any> {
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
  const flowTitle = flowData.nodes[1]?.data?.input?.slice(0, 50);
  if (!flowData.nodes || flowData.nodes.length === 0 || !flowTitle || flowTitle.length === 0) {
    return { success: false, error: 'Cannot save empty flow' }
  }

  logger.info(`the name to save is: ${flowTitle}`)

  const id = flowData.id || ulid()

  const conversation = await prisma.conversation.upsert({
    where: {
      id: id,
    },
    update: {
      id: id,
      flowData: flowData,
      title: flowTitle || '[Empty Flow]',
      updatedAt: new Date(),
      userId: 'anonymous'
    },
    create: {
      id: id,
      flowData: flowData,
      title: flowTitle || '[Empty Flow]',
      userId: 'anonymous'
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
      flowData: true,
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