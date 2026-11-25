import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const Pagination = ({
    pagination,
    page: propPage,
    limit: propLimit,
    total: propTotal,
    totalPages: propTotalPages,
    onPageChange,
    onLimitChange,
    itemName = 'items',
    pageSizeOptions = [10, 25, 50, 100],
    className = ''
}) => {
    // Support either pagination object or direct props
    const page = pagination?.page ?? propPage ?? 1;
    const limit = pagination?.limit ?? propLimit ?? 10;
    const total = pagination?.total ?? propTotal ?? 0;
    const totalPages = pagination?.totalPages ?? propTotalPages ?? Math.max(1, Math.ceil(total / (limit || 10)));

    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = page === i;
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange && onPageChange(i)}
                    className={clsx(
                        "min-w-8 h-8 px-2.5 flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer",
                        isActive
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/40 shadow-2xs"
                            : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5"
                    )}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className={clsx("flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 border-t border-gray-100 dark:border-white/5 bg-transparent", className)}>
            {/* Left: Showing X–Y of Z items */}
            <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                    {start}–{end}
                </span>{' '}
                of{' '}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                    {total}
                </span>{' '}
                {itemName}
            </div>

            {/* Right: Rows per page + Prev/Next + Page buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Rows per page selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        Rows per page
                    </span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            const newLimit = Number(e.target.value);
                            if (onLimitChange) {
                                onLimitChange(newLimit);
                            } else if (onPageChange) {
                                onPageChange(1);
                            }
                        }}
                        className="text-xs sm:text-sm font-semibold rounded-lg border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-gray-700 dark:text-slate-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                        onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                        {renderPageNumbers()}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
                    >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
