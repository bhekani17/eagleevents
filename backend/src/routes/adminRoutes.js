import express from 'express';
import { registerAdmin, loginAdmin, getAdminProfile, logoutAdmin } from '../controllers/adminAuthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication routes
router.post('/auth/signup', registerAdmin);
router.post('/auth/login', loginAdmin);
router.get('/auth/me', protect, getAdminProfile);
router.post('/auth/logout', protect, logoutAdmin);

export default router;
