import app from './app.js'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const PORT = process.env.PORT || 3000

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:8080', 'https://rentease-kenya-home.vercel.app'],
  credentials: true
}))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})