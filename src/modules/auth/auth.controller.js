import { registerUser, loginUser, getMe } from './auth.service.js'

export async function register(req, res) {
  const { orgName, name, phone, email, password } = req.body

  if (!orgName || !name || !phone || !password) {
    return res.status(400).json({
      message: 'orgName, name, phone, password are required'
    })
  }

  const phoneRegex = /^\+254\d{9}$/
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message: 'Phone must be in +254XXXXXXXXX format'
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters'
    })
  }

  try {
    const result = await registerUser({
      orgName,
      name,
      phone,
      email,
      password
    })

    return res.status(201).json(result)
  } catch (err) {
    return res.status(409).json({
      message: err.message
    })
  }
}

export async function login(req, res) {
  const { phone, email, password } = req.body

  if (!password || (!phone && !email)) {
    return res.status(400).json({
      message: 'Provide (phone or email) and password'
    })
  }

  try {
    const result = await loginUser({
      phone,
      email,
      password
    })

    return res.status(200).json(result)
  } catch (err) {
    console.error("LOGIN ERROR:", err.message)

    return res.status(401).json({
      message: err.message
    })
  }
}

export async function me(req, res) {
  try {
    const user = await getMe(req.user.userId)

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      })
    }

    return res.json(user)
  } catch (err) {
    return res.status(500).json({
      message: 'Server error'
    })
  }
}