import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../../utils/db';
import { normalizeAddress } from '../../utils/helpers';
import { validateTransferQuery, handleValidationErrors } from '../middleware/validator';
import { config } from '../../config';

const router = Router();
const prisma = getPrismaClient();

/**
 * GET /api/transfers/:address
 * Get transfer history for a specific address
 */
router.get(
    '/:address',
    validateTransferQuery,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { address } = req.params;
            const {
                page = 1,
                limit = 20,
                tokenAddress,
                fromTimestamp,
                toTimestamp,
                sortBy = 'blockNumber',
                order = 'desc',
            } = req.query;

            const normalizedAddress = normalizeAddress(address);
            const skip = (Number(page) - 1) * Number(limit);

            // Build where clause
            const where: any = {
                OR: [
                    { from: normalizedAddress },
                    { to: normalizedAddress },
                ],
            };

            // Filter by token address if provided
            if (tokenAddress) {
                where.tokenAddress = normalizeAddress(tokenAddress as string);
            }

            // Filter by timestamp range if provided
            if (fromTimestamp || toTimestamp) {
                where.blockTimestamp = {};
                if (fromTimestamp) {
                    where.blockTimestamp.gte = new Date(fromTimestamp as string);
                }
                if (toTimestamp) {
                    where.blockTimestamp.lte = new Date(toTimestamp as string);
                }
            }

            // Get total count
            const total = await prisma.transfer.count({ where });

            // Get transfers
            const transfers = await prisma.transfer.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: {
                    [sortBy as string]: order,
                },
            });

            // Format response
            const formattedTransfers = transfers.map(transfer => {
                const type = transfer.from === normalizedAddress ? 'outgoing' : 'incoming';
                let category = 'transfer';

                const to = transfer.to.toLowerCase();
                const from = transfer.from.toLowerCase();
                const bankAddresses = config.bankAddresses;

                if (bankAddresses.includes(to)) {
                    category = 'deposit';
                } else if (bankAddresses.includes(from)) {
                    category = 'withdrawal';
                }

                return {
                    id: transfer.id,
                    transactionHash: transfer.transactionHash,
                    blockNumber: transfer.blockNumber.toString(),
                    blockTimestamp: transfer.blockTimestamp.toISOString(),
                    tokenAddress: transfer.tokenAddress,
                    from: transfer.from,
                    to: transfer.to,
                    value: transfer.value,
                    direction: type,
                    category,
                };
            });

            res.json({
                success: true,
                data: {
                    transfers: formattedTransfers,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit)),
                    },
                },
            });

        } catch (error) {
            console.error('Error fetching transfers:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/transfers/:address/summary
 * Get transfer summary statistics for an address
 */
router.get(
    '/:address/summary',
    validateTransferQuery,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { address } = req.params;
            const { tokenAddress } = req.query;

            const normalizedAddress = normalizeAddress(address);

            // Build where clause
            const baseWhere: any = {};
            if (tokenAddress) {
                baseWhere.tokenAddress = normalizeAddress(tokenAddress as string);
            }

            // Get counts
            const [totalSent, totalReceived, uniqueTokens] = await Promise.all([
                prisma.transfer.count({
                    where: { ...baseWhere, from: normalizedAddress },
                }),
                prisma.transfer.count({
                    where: { ...baseWhere, to: normalizedAddress },
                }),
                prisma.transfer.groupBy({
                    by: ['tokenAddress'],
                    where: {
                        OR: [
                            { from: normalizedAddress },
                            { to: normalizedAddress },
                        ],
                    },
                }),
            ]);

            res.json({
                success: true,
                data: {
                    address: normalizedAddress,
                    totalSent,
                    totalReceived,
                    totalTransfers: totalSent + totalReceived,
                    uniqueTokens: uniqueTokens.length,
                },
            });

        } catch (error) {
            console.error('Error fetching summary:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
