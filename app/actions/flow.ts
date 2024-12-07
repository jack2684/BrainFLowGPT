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

export async function saveFlow(flowData: FlowData) {
  try {
    // If flowData has an id, it's an update; otherwise, create new
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