
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db';

import authRoutes from './routes/authRoutes';
import syncRoutes from './routes/syncRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import healthRoutes from './routes/healthRoutes';
import groupRoutes from './routes/groupRoutes';
import seedRoutes from './routes/seedRoutes';

dotenv.config();

connectDB();

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/seed', seedRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
