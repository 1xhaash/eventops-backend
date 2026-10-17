import mongoose from 'mongoose';
import { organizerApplicationModel } from '../../../db/models/organizerApplicationModel.js';
import { userModel } from '../../../db/models/users.model.js';

/**
 * @desc   Submit an application to become an Organizer
 * @route  POST /api/organizer-applications
 * @access Private (User)
 */
export const applyForOrganizer = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { organizationName } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        if (user.verificationToken) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before applying'
            });
        }

        if (
            user.role === 'admin' ||
            (user.role === 'organizer' && user.status === 'approved')
        ) {
            return res.status(400).json({
                success: false,
                message: `You are already registered as an ${user.role}`
            });
        }

        const isEligibleApplicant =
            (user.role === 'user' && user.status === 'approved') ||
            (user.role === 'organizer' && user.status === 'pending');

        if (!isEligibleApplicant) {
            return res.status(403).json({
                success: false,
                message: 'Verify your email and account before applying'
            });
        }

        const existingPending = await organizerApplicationModel.findOne({
            user: userId,
            status: 'pending'
        });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending organizer application under review'
            });
        }

        const newApplication = await organizerApplicationModel.create({
            user: userId,
            organizationName,
            status: 'pending'
        });

        return res.status(201).json({
            success: true,
            message: 'Organizer application submitted successfully',
            data: newApplication
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending organizer application under review'
            });
        }
        next(err);
    }
};

/**
 * @desc   Get the logged-in user's own applications
 * @route  GET /api/organizer-applications/me
 * @access Private (User)
 */
export const getMyApplications = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const applications = await organizerApplicationModel
            .find({ user: userId })
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Applications retrieved successfully',
            data: applications
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc   Get organizer applications for Admin review
 * @route  GET /api/admin/organizer-applications
 * @access Private (Admin only)
 */
export const getAllApplications = async (req, res, next) => {
    try {
        const { status } = req.query;

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 20)
        );

        const skip = (page - 1) * limit;

        const allowedStatuses = ['pending', 'approved', 'rejected'];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status filter',
                allowedStatuses
            });
        }

        const filter = {};

        if (status) {
            filter.status = status;
        }

        const total = await organizerApplicationModel.countDocuments(filter);

        const applications = await organizerApplicationModel
            .find(filter)
            .populate('user', 'name email role status')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: 'Organizer applications retrieved successfully',
            data: applications,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc   Approve or reject an organizer application
 * @route  PATCH /api/admin/organizer-applications/:id
 * @access Private (Admin only)
 */
export const reviewApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;
        const adminId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application ID format'
            });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either approved or rejected'
            });
        }

        const application = await organizerApplicationModel.findById(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Organizer application not found'
            });
        }

        if (application.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'This application has already been reviewed'
            });
        }

        const applicant = await userModel.findById(application.user);

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Applicant user not found'
            });
        }

        application.status = status;
        application.reviewedBy = adminId;
        application.reviewedAt = new Date();

        if (reviewNotes !== undefined) {
            application.reviewNotes = reviewNotes;
        }

        if (status === 'approved') {
            applicant.role = 'organizer';
            applicant.status = 'approved';

            await applicant.save();
        }

        await application.save();

        const populatedApplication = await organizerApplicationModel
            .findById(application._id)
            .populate('user', 'name email role status')
            .populate('reviewedBy', 'name email');

        return res.status(200).json({
            success: true,
            message: `Application has been ${status} successfully`,
            data: populatedApplication
        });
    } catch (err) {
        next(err);
    }
};

export default {
    applyForOrganizer,
    getMyApplications,
    getAllApplications,
    reviewApplication
};
