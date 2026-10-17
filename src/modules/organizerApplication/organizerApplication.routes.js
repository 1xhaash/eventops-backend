import express from 'express';
import {
    applyForOrganizer,
    getMyApplications,
    getAllApplications,
    reviewApplication
} from './organizerApplication.controller.js';

import { verifyToken, allowRoles } from '../../middleware/auth.middleware.js';
import {
    createApplicationSchema,
    reviewApplicationSchema,
    validateRequest
} from './organizerApplication.validation.js';

const router = express.Router();

// User / Participant Routes

// Submit application
router.post(
    '/api/organizer-applications',
    verifyToken,
    validateRequest(createApplicationSchema),
    applyForOrganizer
);

// Get my applications
router.get(
    '/api/organizer-applications/me',
    verifyToken,
    getMyApplications
);

// Admin Routes

// Get all applications
router.get(
    '/api/admin/organizer-applications',
    verifyToken,
    allowRoles('admin'),
    getAllApplications
);

// Approve or Reject application
router.patch(
    '/api/admin/organizer-applications/:id',
    verifyToken,
    allowRoles('admin'),
    validateRequest(reviewApplicationSchema),
    reviewApplication
);

export const organizerApplicationRoutes = router;
export default router;
