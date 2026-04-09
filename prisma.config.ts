import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Migrations cần kết nối trực tiếp (port 5432), không qua PgBouncer (port 6543)
const migrationUrl = (env('DATABASE_URL') || '').replace(':6543/', ':5432/').replace('?pgbouncer=true', '')

export default defineConfig({
  datasource: {
    url: migrationUrl,
  },
})