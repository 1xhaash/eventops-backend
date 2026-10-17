import Joi from 'joi';

export const signupSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .pattern(/^[A-Za-z\u0600-\u06FF]+(?:[ '\-][A-Za-z\u0600-\u06FF]+)*$/)
        .custom((value, helpers) => {
            const words = value.trim().split(/\s+/).filter(Boolean);
            if (words.length < 2) {
                return helpers.message('Please enter your full name (first and last name)');
            }
            return value;
        })
        .required()
        .messages({
            'string.empty': 'Name is required',
            'string.min': 'Name must be at least 3 characters',
            'string.max': 'Name cannot exceed 30 characters',
            'string.pattern.base': 'Name can only contain letters, spaces, hyphens and apostrophes'
        }),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .custom((value, helpers) => {
        
            const invalidDomains = ['gami.com', 'gamil.com', 'gmai.com', 'hotmai.com', 'outloo.com'];
            const domain = value.split('@')[1];

            if (invalidDomains.includes(domain)) {
                return helpers.message('Did you mean gmail.com or hotmail.com? Please check your email domain.');
            }

            return value;
        })
        .required()
        .messages({
            'string.email': 'Please enter a valid email address',
            'string.empty': 'Email is required'
        }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.empty': 'Password is required'
    }),
    role: Joi.string().valid('user', 'organizer').default('user').messages({
        'any.only': 'Role must be either user or organizer'
    })
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please enter a valid email address',
        'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
});


export const updateProfileSchema = Joi.object({
    name: Joi.string().min(3).max(30).optional().messages({
        'string.min': 'Name must be at least 3 characters',
        'string.max': 'Name cannot exceed 30 characters'
    })
});

export const validate = (schema) => {
    return (req, res, next) => {
        const inputData = {
            ...req.body,
            ...req.params,
            ...req.query
        };

        const { error } = schema.validate(inputData, { 
            abortEarly: false,
            allowUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: errorMessages
            });
        }

        next();
    };
};