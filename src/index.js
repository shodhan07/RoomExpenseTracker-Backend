import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

dotenv.config();
const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // allow your frontend
  credentials: true
}));

app.get('/', (req,res)=>res.json({status:'ok'}));
app.use('/api/auth', authRoutes);
app.use('/api', expenseRoutes);

const port = process.env.PORT || 4000;

testConnection()
  .then(()=> {
    app.listen(port, () => console.log(`API listening on ${port}`));
  })
  .catch((err)=>{
    console.error('DB connection failed:', err);
    process.exit(1);
  });