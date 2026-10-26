const { PrismaClient } = require('@prisma/client')
const { randomBytes, scryptSync } = require('crypto')

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString('hex')}`
}

async function main() {
  const email = 'admin@celsia.com'
  const password = 'CELSIA2024'
  const nombre = 'Administrador CELSIA'
  
  try {
    // Eliminar si existe
    await prisma.usuario.deleteMany({ where: { email } }).catch(() => {})
    
    // Crear nuevo usuario
    const usuario = await prisma.usuario.create({
      data: {
        email,
        nombre,
        rol: 'ADMIN',
        passwordHash: hashPassword(password),
        activo: true,
      },
    })
    
    console.log(`✅ Usuario creado:`)
    console.log(`   Email: ${email}`)
    console.log(`   Contraseña: ${password}`)
    console.log(`   Rol: ADMIN`)
    console.log(`   ID: ${usuario.id}`)
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

main().finally(() => prisma.$disconnect())
