import Joi from 'joi';

export const createApplicationSchema = Joi.object({
    organizationName: Joi.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Organization name cannot be empty',
        'string.min': 'Organization name must be at least 2 characters',
        'string.max': 'Organization name cannot exceed 100 characters',
        'any.required': 'Organization name is required'
    })
});

export const reviewApplicationSchema = Joi.object({
    status: Joi.string().valid('approved', 'rejected').required().messages({
        'any.only': 'Status must be either approved or rejected',
        'any.required': 'Status is required'
    }),
    reviewNotes: Joi.string().trim().max(500).allow('', null).messages({
        'string.max': 'Review notes cannot exceed 500 characters'
    })
});

export const validateRequest = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(({ message, path }) => ({
                message,
                field: path.join('.')
            }))
        });
    }

    req.body = value;
    next();
};
