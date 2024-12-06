'use server'

import { prisma } from '@/lib/db'
import { ulid } from 'ulid'

export async function saveFlow(flowData: any) {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        id: ulid(),
        flowData: flowData,
        title: 'Untitled Flow', // You can make this parameter optional
      },
    })
    return { success: true, id: conversation.id }
  } catch (error) {
    console.error('Error saving flow:', error)
    return { success: false, error: 'Failed to save flow' }
  }
} 