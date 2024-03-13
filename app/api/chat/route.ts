import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { createChat, createMessage, getChat } from '@/server/actions'

export const runtime = 'edge'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

const buildGoogleGenAIPrompt = (messages: Message[]) => ({
  contents: messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }]
    }))
})

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    console.log('Using preview token')
    genAI.apiKey = previewToken
  }

  // const res = await openai.chat.completions.create({
  //   model: 'gpt-3.5-turbo',
  //   messages,
  //   temperature: 0.7,
  //   stream: true
  // })

  // const stream = OpenAIStream(res, {
  //   async onCompletion(completion) {
  //     let chat = await getChat(json.id, userId)
  //     if (!chat) {
  //       const title = json.messages[0].content.substring(0, 100)
  //       const id = json.id ?? nanoid()
  //       chat = await createChat(title, id, userId)
  //     }
  //     await createMessage(messages[messages.length - 1].content, chat!.id, userId)
  //     await createMessage(completion, chat!.id, "0")
  //   }
  // })

  const geminiStream = await genAI
    .getGenerativeModel({ model: 'gemini-pro' })
    .generateContentStream(buildGoogleGenAIPrompt(messages))

  const stream = GoogleGenerativeAIStream(geminiStream, {
    async onCompletion(completion: string) {
      let chat = await getChat(json.id, userId)
      if (!chat) {
        const title = json.messages[0].content.substring(0, 100)
        const id = json.id ?? nanoid()
        chat = await createChat(title, id, userId)
      }
      await createMessage(
        messages[messages.length - 1].content,
        chat!.id,
        userId
      )
      await createMessage(completion, chat!.id, '0')
    }
  })

  return new StreamingTextResponse(stream)
}
