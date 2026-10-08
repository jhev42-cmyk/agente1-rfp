import { PrismaClient } from '@prisma/client'

// Una sola instancia por proceso (en desarrollo, Next recarga módulos y abriría conexiones de más).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Las transacciones de escritura (ej. generar cientos de postes) pueden pasar de los 5 s por
// defecto cuando la base responde lento: se les da más margen.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 20000 },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
