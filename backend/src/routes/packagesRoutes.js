import express from 'express';
import { 
  getAllPackages, 
  getFeaturedPackages,
  createPackage, 
  updatePackage, 
  deletePackage,
} from '../controllers/packagesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required - for customer frontend)
router.get('/', getAllPackages);                 // GET /api/packages
router.get('/featured', getFeaturedPackages);    // GET /api/packages/featured


// Protected routes (authentication required - admin only)
router.post('/', protect, createPackage);      // POST /api/package
router.put('/:id', protect, updatePackage);    // PUT /api/packages/:id  
router.delete('/:id', protect, deletePackage); // DELETE /api/packages/:id

export default router;