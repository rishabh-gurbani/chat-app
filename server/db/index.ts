import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

// neonConfig.fetchConnectionCache = true;

const sql = neon("postgresql://rishabh.gurbani23:f1Wqvihd3nxR@ep-lively-silence-03035979-pooler.ap-southeast-1.aws.neon.tech/main?sslmode=require")
// const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
