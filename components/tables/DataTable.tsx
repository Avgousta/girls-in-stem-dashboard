// DataTable is a server-compatible table — no render functions passed as props.
// Each page renders its own rows directly. This component handles
// search, sort and pagination purely on the client side.
'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', overflow: 'hidden' }}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {title && <h2 className="text-base font-semibold" style={{ color: '#F0EEFF' }}>{title}</h2>}
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
                <td colSpan={headers.length} className="text-center py-12"
                  style={{ color: 'rgba(240,238,255,0.35)' }}>
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
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" style={{ color: 'rgba(240,238,255,0.6)' }} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = i + Math.max(1, Math.min(page - 2, totalPages - 4));
              return (
                <button key={n} onClick={() => setPage(n)}
                  className="w-7 h-7 text-xs rounded font-medium"
                  style={page === n
                    ? { background: '#7C3AED', color: 'white' }
                    : { color: 'rgba(240,238,255,0.6)' }}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" style={{ color: 'rgba(240,238,255,0.6)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
