import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const Pagination = ({ pagination, onPageChange }) => {
    const { page, limit, total, totalPages } = pagination;

    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={clsx(
                        "w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all text-sm",
                        page === i
                            ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30 ring-2 ring-primary-600 ring-offset-2"
                            : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200"
                    )}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-400">
                Showing <span className="text-gray-900 font-black">{(page - 1) * limit + 1}</span> to <span className="text-gray-900 font-black">{Math.min(page * limit, total)}</span> of <span className="text-gray-900 font-black">{total}</span> items
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 bg-white rounded-xl border border-gray-200 text-gray-400 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-100 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-gray-200 transition-all shadow-sm"
                >
                    <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-2 mx-1">
                    {renderPageNumbers()}
                </div>

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 bg-white rounded-xl border border-gray-200 text-gray-400 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-100 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-gray-200 transition-all shadow-sm"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
