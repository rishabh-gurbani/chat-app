import { archiveExpiredConversations } from '@/server/actions'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const rooms = await archiveExpiredConversations()

  return Response.json({ success: true, rooms })
}
