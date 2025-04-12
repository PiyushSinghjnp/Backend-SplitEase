import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import protectedRoutes from './routes/protectedRoutes';
import friendRoutes from './routes/friendRoutes';
// import groupRoutes from './routes/groupRoutes';
import searchRoutes from './routes/searchRoutes';
import { group } from 'console';
// import { authenticateToken } from './middlewares/authMiddleware';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', friendRoutes);
app.use('/api/v1/users', searchRoutes);
app.use('/api/v1/protected', protectedRoutes);
// app.use('/api/v1/group', groupRoutes); 
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
