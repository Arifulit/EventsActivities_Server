import { Response } from 'express';
import { Payment } from '../models/payment.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/role.middleware';

export const getHostPayments = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Only hosts or admins can view host payments
    if (req.user.role !== UserRole.HOST && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Host role required.', 403);
    }

    const query: any = { hostId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('eventId', 'title date')
      .populate('bookingId', 'status paymentStatus bookingDate')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    return paginatedResponse(res, payments, page, limit, total, 'Payments retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getHostEarningsSummary = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.user.role !== UserRole.HOST && req.user.role !== UserRole.ADMIN) {
      return errorResponse(res, 'Access denied. Host role required.', 403);
    }

    const [summary] = await Payment.aggregate([
      { $match: { hostId: req.user._id } },
      {
        $group: {
          _id: null,
          totalReceived: {
            $sum: {
              $cond: [ { $eq: ['$status', 'succeeded'] }, '$amount', 0 ]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [ { $in: ['$status', ['pending', 'processing']] }, 1, 0 ]
            }
          },
          refundTotal: {
            $sum: {
              $cond: [ { $eq: ['$status', 'refunded'] }, '$refundAmount', 0 ]
            }
          },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    const last30Days = await Payment.aggregate([
      {
        $match: {
          hostId: req.user._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' }
        }
      }
    ]);

    return successResponse(
      res,
      {
        totalReceived: summary?.totalReceived || 0,
        paymentCount: summary?.paymentCount || 0,
        pendingCount: summary?.pendingCount || 0,
        refundTotal: summary?.refundTotal || 0,
        last30DaysReceived: last30Days[0]?.amount || 0
      },
      'Earnings summary retrieved successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
