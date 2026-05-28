// DataTable is a server-compatible table — no render functions passed as props.
// Each page renders its own rows directly. This component handles
// search, sort and pagination purely on the client side.
'use client';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

export interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
}

interface Props {
  // rows are pre-rendered — each row is an array of ReactNode cells
  headers: Column[];
  rows: React.ReactNode[][];
  rowKeys: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  actions?: React.ReactNode;
  title?: string;
}

export default function DataTable({
  headers, rows, rowKeys,
  searchable = false,
  searchPlaceholder = 'Search…',
  pageSize = 20,
  emptyMessage = 'No records found.',
  actions,
  title,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(rows.length / pageSize);
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  const pagedKeys = rowKeys.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          {title && <h2 className="text-base font-semibold text-gray-800">{title}</h2>}
          {actions && <div className="flex items-center gap-3 ml-auto">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              {headers.map(col => (
                <th key={col.key} className={cn('whitespace-nowrap', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-12 text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : paged.map((row, i) => (
              <tr key={pagedKeys[i]}>
                {row.map((cell, ci) => (
                  <td key={`${pagedKeys[i]}-${ci}`} className={headers[ci]?.className}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = i + Math.max(1, Math.min(page - 2, totalPages - 4));
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={cn('w-7 h-7 text-xs rounded font-medium',
                    page === n ? 'bg-brand-800 text-white' : 'hover:bg-gray-200 text-gray-600')}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
