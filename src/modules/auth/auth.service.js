import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma.js'

function signToken(userId, organizationId, role) {
  return jwt.sign(
    { userId, organizationId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export async function registerUser({ orgName, name, phone, email, password }) {
  const existing = await prisma.user.findFirst({ where: { phone } })
  if (existing) throw new Error('Phone already registered')

  const hashed = await bcrypt.hash(password, 10)

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      users: {
        create: {
          name,
          phone,
          email: email || null,
          role: 'landlord',
          password: hashed,
        },
      },
    },
    include: { users: true },
  })

  const user = org.users[0]
  const token = signToken(user.id, org.id, user.role)

  return {
    user: { id: user.id, name: user.name, role: user.role },
    organization: { id: org.id, name: org.name },
    token,
  }
}

export async function loginUser({ phone, email, password }) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        phone ? { phone } : {},
        email ? { email } : {},
      ],
      isDeleted: false,
    },
    include: { organization: true },
  })

  if (!user || !user.password) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Invalid credentials')

  const token = signToken(user.id, user.organizationId, user.role)

  return {
    user: { id: user.id, name: user.name, role: user.role },
    organization: { id: user.organization.id, name: user.organization.name },
    token,
  }
}

export async function getMe(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, phone: true, email: true, role: true,
      organization: { select: { id: true, name: true } },
    },
  })
}