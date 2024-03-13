'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'

import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
import { formatChat } from '@/lib/utils'
import { conversationUsersJoin, conversations, messages } from './db/schema'
import { and, eq, inArray } from 'drizzle-orm'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const chats = await db.query.conversationUsersJoin.findMany({
      columns: { userId: true, conversationId: true },
      where: (c, { eq }) => eq(c.userId, userId),
      with: {
        conversation: {
          with: {
            messages: true
          }
        }
      }
    })

    const sortedChats: typeof chats = [...chats].sort((a, b) => {
      const aLastMessage = a.conversation.messages.slice(-1)[0]
      const bLastMessage = b.conversation.messages.slice(-1)[0]

      if (!aLastMessage && !bLastMessage) {
        return 0
      }

      if (!aLastMessage) {
        return 1
      }

      if (!bLastMessage) {
        return -1
      }

      return bLastMessage.createdAt.getTime() - aLastMessage.createdAt.getTime()
    })

    const res = sortedChats.map(c => formatChat(c, userId))
    return res as Chat[]
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const chat = await db.query.conversationUsersJoin.findFirst({
    where: (c, { eq }) => and(eq(c.conversationId, id), eq(c.userId, userId)),
    columns: { userId: true, conversationId: true },
    with: {
      conversation: {
        with: {
          messages: true
        }
      }
    }
  })
  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  chat.conversation.messages.sort((a, b) => {
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return formatChat(chat, userId)
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()
  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }
  const uid = (
    await db.query.conversationUsersJoin.findFirst({
      where: (c, { eq }) =>
        and(eq(c.conversationId, id), eq(c.userId, session.user.id)),
      columns: { userId: true }
    })
  )?.userId

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await db.delete(conversations).where(eq(conversations.id, id))

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats = await db.query.conversationUsersJoin.findMany({
    columns: { userId: true, conversationId: true },
    where: (c, { eq }) => eq(c.userId, session.user.id)
  })
  if (!chats.length) {
    return redirect('/')
  }

  const chatIds = chats.map(chat => chat.conversationId)
  await db.delete(conversations).where(inArray(conversations.id, chatIds))

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  // const chat = await kv.hgetall<Chat>(`chat:${id}`)
  const c = await db.query.conversationUsersJoin.findFirst({
    where: (c, { eq }) => eq(c.conversationId, id),
    columns: { userId: true, conversationId: true },
    with: {
      conversation: {
        with: {
          messages: true
        }
      }
    }
  })

  const chat = formatChat(c)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await getChat(id, session.user.id)

  if (!chat || chat.userId !== session.user.id) {
    return {
      error: 'Something went wrong'
    }
  }

  // const payload = {
  //   ...chat,
  //   sharePath: `/share/${chat.id}`
  // }

  // await kv.hmset(`chat:${chat.id}`, payload)

  // return payload

  const sharePath = `/share/${chat.id}`

  const payload = await db
    .update(conversations)
    .set({ sharePath })
    .where(eq(conversations.id, id))
    .returning()

  const c = await db.query.conversationUsersJoin.findFirst({
    where: (c, { eq }) => eq(c.conversationId, id),
    columns: { userId: true, conversationId: true },
    with: {
      conversation: {
        with: {
          messages: true
        }
      }
    }
  })
  return formatChat(c)
}

export async function createChat(title: string, id: string, userId: string) {
  const path = `/chat/${id}`
  await db.insert(conversations).values({
    id,
    title,
    path
  })
  await addUserToConversation(id, userId)
  return await getChat(id, userId)
}

export async function addUserToConversation(
  conversationId: string,
  userId: string
) {
  await db.insert(conversationUsersJoin).values({
    conversationId,
    userId
  })
}

export async function inviteUserToConversation(
  conversationId: string,
  inviteeEmail: string
) {
  const user = await auth()
  if (!user) return {status:false, message:'You not logged in'}
  const users = await db.query.conversationUsersJoin.findMany({
    columns: {
      userId: true
    },
    where: (c, { eq }) => eq(c.conversationId, conversationId)
  })
  const conversationUsers = users.map(user => user.userId)
  if (!conversationUsers.includes(user.user.id)) {
    return {status:false, message:'You are not authorised'}
  }

  const inviteeId = await db.query.users.findFirst({
    columns: {
      id: true
    },
    where: (u, { eq }) => eq(u.email, inviteeEmail)
  })

  if (!inviteeId) {
    return {status:false, message:'User does not exist'}
  }

  addUserToConversation(conversationId, inviteeId.id)
  return {status:true, message:'User added succesfully'}
}

export async function createMessage(
  content: string,
  chatId: string,
  userId: string
) {
  await db.insert(messages).values({
    content,
    conversationId: chatId,
    userId
  })
}
