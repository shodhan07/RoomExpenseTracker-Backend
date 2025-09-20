import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

dotenv.config();
const app = express();

// Parse allowed origins from env
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like Postman or mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: Origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', expenseRoutes);

// Start server after DB connection
const port = process.env.PORT || 4000;

testConnection()
  .then(() => {
    app.listen(port, () => console.log(`API listening on ${port}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
