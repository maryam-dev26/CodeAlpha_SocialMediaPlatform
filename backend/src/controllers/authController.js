import jwt from 'jsonwebtoken'

import User from '../models/User.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { toSafeUser } from '../utils/user.js'
import { loginSchema, registerSchema } from '../validators/authValidator.js'

const validationErrorResponse = (error) => ({
  message: 'Validation failed',
  errors: error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  })),
})

const duplicateKeyResponse = (error) => {
  const field = Object.keys(error.keyPattern || {})[0]

  if (field === 'email') {
    return { message: 'Email is already registered' }
  }

  if (field === 'username') {
    return { message: 'Username is already taken' }
  }

  return { message: 'An account with those details already exists' }
}

export const register = async (req, res) => {
  const result = registerSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  const { name, username, email, password } = result.data

  try {
    const existingEmail = await User.exists({ email })
    if (existingEmail) {
      return res.status(409).json({ message: 'Email is already registered' })
    }

    const existingUsername = await User.exists({ username })
    if (existingUsername) {
      return res.status(409).json({ message: 'Username is already taken' })
    }

    const hashedPassword = await hashPassword(password)

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
    })

    return res.status(201).json({
      message: 'Registration successful',
      user: toSafeUser(user),
    })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json(duplicateKeyResponse(error))
    }

    return res.status(500).json({ message: 'Registration failed' })
  }
}

export const login = async (req, res) => {
  const result = loginSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  const { email, password } = result.data

  try {
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: 'Server authentication is not configured' })
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const passwordMatches = await comparePassword(password, user.password)

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: toSafeUser(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' })
  }
}

export const getCurrentUser = async (req, res) =>
  res.status(200).json({ user: req.user })
