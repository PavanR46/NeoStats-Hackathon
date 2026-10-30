import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import userRoutes from './routes/user.routes';
import taskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import escalationRoutes from './routes/escalation.routes';
import { errorHandler, AppError } from './middlewares/error.middleware';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Root greeting endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'NeoStats API Server',
    version: '1.0.0',
    status: 'online',
    health: '/api/health',
    auth: '/api/auth',
    projects: '/api/projects',
    users: '/api/users',
    tasks: '/api/tasks',
    comments: '/api/comments',
    notifications: '/api/notifications',
    activity: '/api/activity',
  });
});

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/escalations', escalationRoutes);

// Catch 404 for unknown endpoints
app.use((_req, _res, next) => {
  next(new AppError('Endpoint not found', 404));
});

// Central Error Handler
app.use(errorHandler);

export default app;
