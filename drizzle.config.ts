import { type Config } from 'drizzle-kit';

export default {
  schema: './server/db/schema.ts',
  driver: 'pg',
  out: './server/db/migrations/',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  tablesFilter: ['*'],
} satisfies Config;
