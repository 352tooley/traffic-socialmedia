import React from 'react';
import './DataTable.css';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  highlightRow?: (item: T) => boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  highlightRow,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="data-table">
        <div className="data-table__empty">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table">
      <div className="data-table__wrapper">
        <table className="data-table__table">
          <thead className="data-table__header">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} data-align={col.align || 'left'}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table__body">
            {data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={`data-table__row ${
                  highlightRow?.(item) ? 'data-table__row--highlight' : ''
                }`}
              >
                {columns.map((col) => (
                  <td 
                    key={String(col.key)} 
                    className="data-table__cell"
                    data-label={col.header}
                    data-align={col.align || 'left'}
                  >
                    {col.render ? col.render(item) : item[col.key as keyof T]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
