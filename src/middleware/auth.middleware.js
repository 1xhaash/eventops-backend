import jwt from 'jsonwebtoken';
import { userModel } from '../../db/models/users.model.js';

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'SecretKey123'
        );

        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        return next(err);
    }
};

export const verifyTokenIfPresent = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next();
    }

    return verifyToken(req, res, next);
};

export const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
};

export const verifyOrganizer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'You must be logged in'
        });
    }
    if (req.user.role !== 'organizer') {
        return res.status(403).json({
            success: false,
            message: 'Only organizers can manage events'
        });
    }

    if (req.user.status !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Your organizer account is not approved yet'
        });
    }
    next();
};

export const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "You must be logged in" });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Access denied: Admins only" });
    }
    next();
};

export const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 409;
        message = 'This value already exists';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Database validation failed';
    } else if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {
        statusCode = 400;
        message = 'Invalid JSON format';
    }

    if (statusCode >= 500) {
        message = 'Internal Server Error';
    }

    return res.status(statusCode).json({
        success: false,
        message
    });
};
