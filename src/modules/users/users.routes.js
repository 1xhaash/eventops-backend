import { Router } from 'express';
import { signup, verifyEmail, login, getProfile, updateProfile } from './users.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { validate, signupSchema, loginSchema, updateProfileSchema } from './users.validation.js';

const userRoutes = Router();

userRoutes.post('/api/auth/signup', validate(signupSchema), signup);
userRoutes.get('/api/auth/verify-email', verifyEmail);
userRoutes.post('/api/auth/login', validate(loginSchema), login);

userRoutes.get('/api/users/me', verifyToken, getProfile);
userRoutes.put('/api/users/me', verifyToken, validate(updateProfileSchema), updateProfile);

export { userRoutes };