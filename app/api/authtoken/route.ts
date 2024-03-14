import { auth } from '@/auth'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'
// export const runtime = 'edge'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', {
      status: 401
    })
  }
  const { user } = session
  const token = jwt.sign(
    { userId: user.id, username: user.name },
    process.env.JWT_SECRET!,
    {
      expiresIn: '1h' // Set the desired expiration time
    }
  )
  return Response.json({ token })
}
