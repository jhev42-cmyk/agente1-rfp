// Aplica las migraciones pendientes solo en el deploy de producción de Vercel. Los deploys de
// preview y los builds locales no tocan la base (comparten DATABASE_URL con producción).
const { execSync } = require('child_process')

if (process.env.VERCEL_ENV === 'production') {
  execSync('prisma migrate deploy', { stdio: 'inherit' })
} else {
  console.log(`Migraciones omitidas (VERCEL_ENV=${process.env.VERCEL_ENV || 'local'}): solo se aplican en producción.`)
}
