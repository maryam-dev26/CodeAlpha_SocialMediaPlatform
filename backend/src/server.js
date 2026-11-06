require('dotenv').config()

const app = require('./app')
const { connectDB } = require('./config/db')

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    await connectDB()
    console.log('MongoDB connected')

    app.listen(PORT, () => {
      console.log(`Vynkverse API listening on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`)
    process.exit(1)
  }
}

startServer()
