import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

import { env } from "./env.js"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export { prisma }
