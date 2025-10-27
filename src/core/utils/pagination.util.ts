// ============================================
// core/utils/pagination.util.ts - NEW
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export class PaginationUtil {
  /**
   * Calculate pagination offset
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build pagination meta
   */
  static buildMeta(
    page: number,
    limit: number,
    totalItems: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Build paginated response
   */
  static buildResponse<T>(
    data: T[],
    page: number,
    limit: number,
    totalItems: number
  ): PaginatedResponse<T> {
    return {
      data,
      meta: this.buildMeta(page, limit, totalItems),
    };
  }

  /**
   * Validate and normalize pagination params
   */
  static normalizePaginationParams(params: PaginationParams): {
    page: number;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = this.calculateOffset(page, limit);
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    return { page, limit, offset, sortBy, sortOrder };
  }

  /**
   * Build SQL ORDER BY clause
   */
  static buildOrderByClause(
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
    allowedColumns: string[] = []
  ): string {
    // Security: Only allow whitelisted columns
    if (allowedColumns.length > 0 && !allowedColumns.includes(sortBy)) {
      sortBy = allowedColumns[0]; // Default to first allowed column
    }

    return `ORDER BY ${sortBy} ${sortOrder}`;
  }

  /**
   * Build SQL pagination clause
   */
  static buildPaginationClause(offset: number, limit: number): string {
    return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  }
}
