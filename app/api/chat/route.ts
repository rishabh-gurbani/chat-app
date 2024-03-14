import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { createChat, createMessage, getChat } from '@/server/actions'
import { encodingForModel } from 'js-tiktoken'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { kv } from '@vercel/kv'
import { Ratelimit } from '@upstash/ratelimit'

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

  // if (previewToken) {
  //   console.log('Using preview token')
  //   genAI.apiKey = previewToken
  // }

  let chat = await getChat(json.id, userId)
  const id = json.id ?? nanoid()
  if (!chat) {
    const title = json.messages[0].content.substring(0, 100)
    chat = await createChat(title, id, userId)
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: kv,
      // rate limit to 1 request per 30 seconds for a conversation
      limiter: Ratelimit.slidingWindow(1, '30s')
    })

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${id}`
    )

    if (!success) {
      return new Response(
        'You have reached your request limit. Try again after a while',
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      )
    }
  } else {
    console.log(
      'KV_REST_API_URL and KV_REST_API_TOKEN env vars not found, not rate limiting...'
    )
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: {
      credits: true
    }
  })

  if (!user) {
    return new Response('Internal error', {
      status: 500
    })
  }

  const { credits } = user

  if (credits <= 0.1) {
    return new Response('Not enough credits', {
      status: 404
    })
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

  const encoder = encodingForModel('gpt-3.5-turbo')

  const geminiStream = await genAI
    .getGenerativeModel({ model: 'gemini-pro' })
    .generateContentStream(buildGoogleGenAIPrompt(messages))

  const stream = GoogleGenerativeAIStream(geminiStream, {
    async onCompletion(completion: string) {
      await createMessage(
        messages[messages.length - 1].content,
        chat!.id,
        userId
      )
      await createMessage(completion, chat!.id, '0')
      const tokensConsumed =
        (encoder.encode(messages.slice(-1)[0].content).length +
          encoder.encode(completion).length) /
        1000

      await db
        .update(users)
        .set({ credits: credits - tokensConsumed })
        .where(eq(users.id, userId))

      console.log(
        `Remaining Credits: ${credits} - ${tokensConsumed} = ${
          credits - tokensConsumed
        }`
      )
    }
  })

  return new StreamingTextResponse(stream)
}
