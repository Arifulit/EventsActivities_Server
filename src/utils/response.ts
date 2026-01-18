import { Response } from 'express';

export const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res: Response, message: string, statusCode: number = 500, error?: any) => {
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Add error details if provided
  if (error) {
    if (typeof error === 'object' && error.errors) {
      response.errors = error.errors;
    } else if (process.env.NODE_ENV === 'development') {
      response.error = error;
    }
  }

  return res.status(statusCode).json(response);
};

export const paginatedResponse = (res: Response, data: any[], page: number, limit: number, total: number, message: string = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    timestamp: new Date().toISOString()
  });
};