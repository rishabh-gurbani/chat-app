import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  doublePrecision,
  bigserial,
  index,
  varchar
} from 'drizzle-orm/pg-core'
import type { AdapterAccount } from '@auth/core/adapters'
import { relations } from 'drizzle-orm'

export const users = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  credits: doublePrecision('credits').notNull().default(20)
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state')
  },
  account => ({
    compoundKey: primaryKey(account.provider, account.providerAccountId)
  })
)

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull()
})

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull()
  },
  vt => ({
    compoundKey: primaryKey(vt.identifier, vt.token)
  })
)

export const conversations = pgTable('conversation', {
  id: varchar('id').notNull().primaryKey(),
  title: varchar('title').notNull().default(''),
  sharePath: text('sharePath'),
  path: text('path').notNull().default(''),
  createdAt: timestamp('createdAt').notNull().defaultNow()
})

export const conversationUsersJoin = pgTable(
  'conversationUsersJoin',
  {
    conversationId: varchar('conversationId')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { enum: ['accepted', 'pending'] })
      .notNull()
      .default('pending')
  },
  join => {
    return {
      pk: primaryKey({ columns: [join.conversationId, join.userId] }),
      convoIdx: index('convoIdx').on(join.conversationId),
      userIdx: index('userIdx').on(join.userId)
    }
  }
)

export const messages = pgTable(
  'message',
  {
    id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
    content: text('content').notNull().default(''),
    conversationId: varchar('conversationId')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('createdAt').notNull().defaultNow()
  },
  message => {
    return {
      userMsgIdx: index('userMsgIdx').on(message.userId),
      conversationIdx: index('conversationIdx').on(message.conversationId)
    }
  }
)

export const userRelations = relations(users, ({ one, many }) => {
  return {
    conversations: many(conversationUsersJoin), // many to many
    messages: many(messages) // one to many
  }
})

export const conversationRelations = relations(conversations, ({ many }) => {
  return {
    users: many(conversationUsersJoin), // many to many
    messages: many(messages) // one to many
  }
})

export const messageRelations = relations(messages, ({ one, many }) => {
  return {
    conversation: one(conversations, {
      fields: [messages.conversationId],
      references: [conversations.id]
    }), // one to one
    user: one(users, {
      fields: [messages.userId],
      references: [users.id]
    }) // one to one
  }
})

export const conversationUsersJoinRelations = relations(
  conversationUsersJoin,
  ({ one }) => {
    return {
      conversation: one(conversations, {
        fields: [conversationUsersJoin.conversationId],
        references: [conversations.id]
      }), // one to one
      user: one(users, {
        fields: [conversationUsersJoin.userId],
        references: [users.id]
      }) // one to one
    }
  }
)
