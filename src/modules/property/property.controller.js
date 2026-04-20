import {
  createPropertyService,
  getPropertiesService,
  getPropertyService,
  updatePropertyService,
  deletePropertyService,
  addUnitService,
  getPropertyUnitsService,
  updateUnitService,
  deleteUnitService
} from './property.service.js'

// Property Controllers
export async function createProperty(req, res) {
  try {
    const { name, location } = req.body
    const { organizationId, userId } = req.user
    
    if (!name || !location) {
      return res.status(400).json({ message: 'Name and location are required' })
    }
    
    const property = await createPropertyService(
      { name, location },
      organizationId,
      userId
    )
    
    res.status(201).json(property)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getProperties(req, res) {
  try {
    const { organizationId } = req.user
    const properties = await getPropertiesService(organizationId)
    
    const propertiesWithStats = properties.map(property => ({
      ...property,
      totalUnits: property.units.length,
      occupiedUnits: property.units.filter(u => u.status === 'occupied').length,
      vacantUnits: property.units.filter(u => u.status === 'vacant').length
    }))
    
    res.json(propertiesWithStats)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getProperty(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    
    const property = await getPropertyService(id, organizationId)
    
    res.json(property)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function updateProperty(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { name, location } = req.body
    
    const property = await updatePropertyService(id, organizationId, { name, location })
    
    res.json(property)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function deleteProperty(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    
    await deletePropertyService(id, organizationId)
    
    res.json({ message: 'Property deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Unit Controllers
export async function addUnit(req, res) {
  try {
    const { propertyId, unitNumber, rentAmount, depositAmount, notes, rentDueDay, gracePeriodDays } = req.body
    const { organizationId } = req.user
    
    if (!propertyId || !unitNumber || !rentAmount) {
      return res.status(400).json({ 
        message: 'propertyId, unitNumber, and rentAmount are required' 
      })
    }
    
    const unit = await addUnitService(
      { propertyId, unitNumber, rentAmount, depositAmount, notes, rentDueDay, gracePeriodDays },
      organizationId
    )
    
    res.status(201).json(unit)
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'Unit number already exists in this property' })
    } else {
      res.status(500).json({ message: error.message })
    }
  }
}

export async function getPropertyUnits(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    
    const units = await getPropertyUnitsService(id, organizationId)
    
    res.json(units)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function updateUnit(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { rentAmount, notes, status, rentDueDay, gracePeriodDays } = req.body
    
    const unit = await updateUnitService(id, organizationId, { 
      rentAmount, notes, status, rentDueDay, gracePeriodDays 
    })
    
    res.json(unit)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function deleteUnit(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    
    await deleteUnitService(id, organizationId)
    
    res.json({ message: 'Unit deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}