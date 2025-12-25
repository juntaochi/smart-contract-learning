import { Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import { isAddress } from 'viem';

/**
 * Validation rules for transfer queries
 */
export const validateTransferQuery = [
    param('address')
        .notEmpty()
        .withMessage('Address is required')
        .custom((value) => {
            if (!isAddress(value)) {
                throw new Error('Invalid Ethereum address');
            }
            return true;
        }),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('tokenAddress')
        .optional()
        .custom((value) => {
            if (value && !isAddress(value)) {
                throw new Error('Invalid token address');
            }
            return true;
        }),

    query('fromTimestamp')
        .optional()
        .isISO8601()
        .withMessage('fromTimestamp must be a valid ISO 8601 date')
        .toDate(),

    query('toTimestamp')
        .optional()
        .isISO8601()
        .withMessage('toTimestamp must be a valid ISO 8601 date')
        .toDate(),

    query('sortBy')
        .optional()
        .isIn(['blockNumber', 'blockTimestamp'])
        .withMessage('sortBy must be either blockNumber or blockTimestamp'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('order must be either asc or desc'),
];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: 'param' in err ? err.param : 'unknown',
                message: err.msg,
            })),
        });
    }

    next();
};
