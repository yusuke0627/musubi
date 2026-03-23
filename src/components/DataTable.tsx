"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultVisibility?: VisibilityState;
  rowIdPrefix?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultVisibility = {},
  rowIdPrefix,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      {/* Column Selector */}
      <div className="flex justify-end px-6 py-2">
        <div className="relative">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>📊 Columns</span>
            <svg
              className={`w-4 h-4 transition-transform ${showColumnSelector ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {showColumnSelector && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b pb-2">
                Toggle Columns
              </p>
              {table.getAllLeafColumns().map((column) => {
                return (
                  <label
                    key={column.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={(e) => column.toggleVisibility(!!e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {column.id.replace(/_/g, " ")}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer select-none hover:bg-gray-100 transition-colors group"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        
                        {header.column.getCanSort() && (
                          <span className="text-gray-300 group-hover:text-blue-400 transition-colors">
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? " ↕️"}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  id={rowIdPrefix ? `${rowIdPrefix}-${(row.original as any).id}` : undefined}
                  className="hover:bg-gray-50 transition-colors text-sm scroll-mt-24"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
