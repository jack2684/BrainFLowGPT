'use server'

import OpenAI from 'openai'
import { ChatMessage } from '@/types/chat'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
})

export async function getAIResponse(input: string, context: ChatMessage[] = []) {

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Maintain context from previous messages and provide relevant responses. Reponse should be breakdown of the topic as structured as possible, in markdown format, with bullet points or numbered lists. Please bold each of the bullet points or numbered lists. Your response should be concise and to the point. If you are unsure of the answer, say so. You response will be part of larger conversation that will be used to generate a flowchart.'
      },
      ...context,
      { role: 'user', content: input }
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any[],
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
    })

    return response.choices[0]?.message?.content || 'No response generated'
  } catch (error) {
    console.error('Error in getAIResponse:', error)
    throw error
  }
}
