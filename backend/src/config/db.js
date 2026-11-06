const mongoose = require('mongoose')

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in the environment')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  })

  return mongoose.connection
}

function getDBStatus() {
  return connectionStates[mongoose.connection.readyState] || 'unknown'
}

module.exports = { connectDB, getDBStatus }
