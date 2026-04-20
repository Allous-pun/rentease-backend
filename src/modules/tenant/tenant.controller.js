import {
  addTenantService,
  getTenantsService,
  getTenantService,
  updateTenantService,
  moveOutTenantService,
  deleteTenantService
} from './tenant.service.js'

export async function addTenant(req, res) {
  try {
    const { name, phone, leaseStart, rentDueDay, notes, unitId } = req.body
    const { organizationId } = req.user

    if (!name || !phone || !leaseStart || !rentDueDay || !unitId) {
      return res.status(400).json({
        message: 'name, phone, leaseStart, rentDueDay, and unitId are required'
      })
    }

    const tenant = await addTenantService(
      { name, phone, leaseStart, rentDueDay, notes, unitId },
      organizationId
    )

    res.status(201).json(tenant)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function getTenants(req, res) {
  try {
    const { organizationId } = req.user
    const tenants = await getTenantsService(organizationId)

    // Format response with unit and property info
    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      phone: tenant.phone,
      leaseStart: tenant.leaseStart,
      rentDueDay: tenant.rentDueDay,
      status: tenant.status,
      notes: tenant.notes,
      createdAt: tenant.createdAt,
      unit: {
        id: tenant.unit.id,
        unitNumber: tenant.unit.unitNumber,
        rentAmount: tenant.unit.rentAmount,
        status: tenant.unit.status,
        property: {
          id: tenant.unit.property.id,
          name: tenant.unit.property.name,
          location: tenant.unit.property.location
        }
      }
    }))

    res.json(formattedTenants)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getTenant(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    const tenant = await getTenantService(id, organizationId)

    const formattedTenant = {
      id: tenant.id,
      name: tenant.name,
      phone: tenant.phone,
      leaseStart: tenant.leaseStart,
      rentDueDay: tenant.rentDueDay,
      status: tenant.status,
      notes: tenant.notes,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      unit: {
        id: tenant.unit.id,
        unitNumber: tenant.unit.unitNumber,
        rentAmount: tenant.unit.rentAmount,
        status: tenant.unit.status,
        rentDueDay: tenant.unit.rentDueDay,
        gracePeriodDays: tenant.unit.gracePeriodDays,
        property: {
          id: tenant.unit.property.id,
          name: tenant.unit.property.name,
          location: tenant.unit.property.location
        }
      }
    }

    res.json(formattedTenant)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function updateTenant(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { name, phone, rentDueDay, notes } = req.body

    const tenant = await updateTenantService(
      id,
      organizationId,
      { name, phone, rentDueDay, notes }
    )

    res.json(tenant)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function moveOutTenant(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    const tenant = await moveOutTenantService(id, organizationId)

    res.json({
      message: 'Tenant moved out successfully',
      tenant
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function deleteTenant(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    await deleteTenantService(id, organizationId)

    res.json({ message: 'Tenant deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}