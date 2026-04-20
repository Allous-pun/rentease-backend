import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTenant(tenantId) {
  try {
    // Delete payments
    await prisma.payment.deleteMany({
      where: { tenantId }
    })
    
    // Delete rent charges
    await prisma.rentCharge.deleteMany({
      where: { tenantId }
    })
    
    // Reset or delete credit
    await prisma.tenantCredit.deleteMany({
      where: { tenantId }
    })
    
    console.log(`Cleaned up data for tenant ${tenantId}`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run with your tenant ID
cleanupTenant('cmnxqxp9p0003g3l0v9nf6x38')