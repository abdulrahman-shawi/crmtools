"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import toast from "react-hot-toast";
import { 
  MoreVertical, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Inbox,
  Download,
  Upload,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils"; // تأكد من وجود هذا المسار في مشروعك
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { matchesSearch } from "@/lib/search";

// --- Types ---

export interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "danger";
}

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  rowKey?: keyof T | ((item: T) => string | number); // أضف هذا السطر
  columns: Column<T>[];
  actindir?:boolean;
  dir?: "rtl" | "ltr";
  actions?: TableAction<T>[];
  isLoading?: boolean;
  totalCount: number;  
  pageSize: number;    
  currentPage: number; 
  onPageChange: (page: number) => void;
  title?: string;
  enableSearch?: boolean;
  enableImport?: boolean;
  enableExport?: boolean;
  /** دالة اختيارية لاستخراج نص قابل للبحث من كل صف (مفيدة للتسميات المحسوبة كالعربية) */
  getRowSearchText?: (row: T) => string;
}

/**
 * DataTable: مكون عرض البيانات المتقدم
 * يدعم التقسيم (Pagination) التلقائي من جهة العميل
 */
export function DataTable<T extends { id: string | number }>({
  data,
  rowKey,
  actindir,
  dir = "ltr",
  columns,
  actions,
  isLoading,
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  title = "Table",
  enableSearch = true,
  enableImport = true,
  enableExport = true,
  getRowSearchText,
}: DataTableProps<T>) {
  /**
   * Extracts plain text from a React node to make rendered labels searchable.
   */
  const extractNodeText = (node: React.ReactNode): string => {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map((part) => extractNodeText(part)).join(" ");

    if (React.isValidElement(node)) {
      const elementType = typeof node.type === "string" ? node.type : "component";
      if (["button", "input", "select", "option", "textarea", "svg", "path"].includes(elementType)) {
        return "";
      }

      const props = node.props as { children?: React.ReactNode };
      return extractNodeText(props.children);
    }

    return "";
  };

  /**
   * Builds extra searchable text from table columns for one row.
   */
  const getColumnSearchText = (item: T): string => {
    return columns
      .map((column) => {
        if (typeof column.accessor === "function") {
          return extractNodeText(column.accessor(item));
        }

        const value = item[column.accessor];
        return value == null ? "" : String(value);
      })
      .join(" ");
  };

  const { user } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [importedData, setImportedData] = useState<T[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImportedData(null);
  }, [data]);

  const canSearch = enableSearch && can(user, RBAC_PERMISSIONS.dataSearch);
  const canExport = enableExport && can(user, RBAC_PERMISSIONS.dataExport);
  const canImport = enableImport && can(user, RBAC_PERMISSIONS.dataImport);

  const sourceData = importedData ?? data;
  
  // 1. حساب إجمالي الصفحات
  const filteredData = useMemo(() => {
    if (!canSearch || !searchText.trim()) {
      return sourceData;
    }

    return sourceData.filter((item) => {
      const rawText = JSON.stringify(item);
      const columnText = getColumnSearchText(item);
      const extraText = getRowSearchText ? getRowSearchText(item) : "";
      return matchesSearch(`${rawText} ${columnText} ${extraText}`, searchText);
    });
  }, [sourceData, canSearch, searchText, getRowSearchText, columns]);

  const effectiveTotal = filteredData.length;
  const totalPages = useMemo(() => Math.ceil(effectiveTotal / pageSize), [effectiveTotal, pageSize]);
  const getRowKey = (item: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(item);
    if (rowKey && item[rowKey]) return item[rowKey] as string | number;
    return item.id || index; // القيمة الافتراضية
  };
  // 2. منطق القص (Slice) لعرض صفحة واحدة فقط من المصفوفة
  const paginatedData = useMemo(() => {
    // إذا كانت البيانات المرسلة هي بالفعل صفحة واحدة من السيرفر، لا داعي للقص
    // لكن بما أنك ترسل مصفوفة كاملة، سنقوم بقصها هنا
    const safePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize, totalPages]);

  const canNextPage = currentPage < totalPages;
  const canPrevPage = currentPage > 1;

  /**
   * Converts array of objects into a CSV string.
   */
  const toCsv = (rows: T[]) => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const escapeCell = (value: unknown) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const csvRows = rows.map((row) =>
      headers.map((header) => escapeCell((row as Record<string, unknown>)[header])).join(",")
    );

    return [headers.join(","), ...csvRows].join("\n");
  };

  /**
   * Triggers browser download from text content.
   */
  const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * Exports filtered data as JSON.
   */
  const exportJson = () => {
    downloadTextFile(JSON.stringify(filteredData, null, 2), `${title}.json`, "application/json;charset=utf-8");
    toast.success("تم تصدير JSON");
  };

  /**
   * Exports filtered data as CSV with .xls extension for Excel compatibility.
   */
  const exportExcelCompatible = () => {
    const csv = toCsv(filteredData);
    if (!csv) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    downloadTextFile(`\uFEFF${csv}`, `${title}.xls`, "application/vnd.ms-excel;charset=utf-8");
    toast.success("تم تصدير Excel");
  };

  /**
   * Opens print dialog as PDF export fallback.
   */
  const exportPdf = () => {
    const headers = columns.map((column) =>
      typeof column.header === "string" ? column.header : "Column"
    );

    const rows = filteredData
      .map((item) =>
        columns.map((column) => {
          if (typeof column.accessor === "function") {
            return "-";
          }
          return String(item[column.accessor] ?? "-");
        })
      )
      .map((row) => `<tr>${row.map((cell) => `<td style=\"padding:8px;border:1px solid #ddd\">${cell}</td>`).join("")}</tr>`)
      .join("");

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} PDF</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;" dir="rtl">
          <h2>${title}</h2>
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>${headers.map((header) => `<th style=\"padding:8px;border:1px solid #ddd;background:#f8f8f8\">${header}</th>`).join("")}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success("تم فتح نافذة تصدير PDF");
  };

  /**
   * Handles JSON or CSV/XLS import and replaces displayed table data.
   */
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: unknown;

      if (file.name.toLowerCase().endsWith(".json")) {
        parsed = JSON.parse(text);
      } else if (
        file.name.toLowerCase().endsWith(".csv") ||
        file.name.toLowerCase().endsWith(".xls") ||
        file.name.toLowerCase().endsWith(".xlsx")
      ) {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          throw new Error("File has no rows");
        }
        const headers = lines[0].split(",").map((header) => header.replace(/^"|"$/g, "").trim());
        const rows = lines.slice(1).map((line) => {
          const values = line.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] ?? "";
          });
          return row;
        });
        parsed = rows;
      } else {
        toast.error("صيغة الملف غير مدعومة. استخدم JSON أو CSV/XLS");
        return;
      }

      if (!Array.isArray(parsed)) {
        toast.error("الملف يجب أن يحتوي على مصفوفة بيانات");
        return;
      }

      setImportedData(parsed as T[]);
      onPageChange(1);
      toast.success("تم استيراد البيانات");
    } catch (error) {
      toast.error("فشل استيراد الملف");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4" dir={dir}>
      {(canSearch || canExport || canImport) && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
          {canSearch ? (
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="بحث داخل الجدول..."
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  onPageChange(1);
                }}
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {canExport && (
              <>
                <button
                  onClick={exportJson}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> JSON
                </button>
                <button
                  onClick={exportExcelCompatible}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Excel
                </button>
                <button
                  onClick={exportPdf}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> PDF
                </button>
              </>
            )}

            {canImport && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".json,.csv,.xls,.xlsx"
                  onChange={handleImportFile}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <Upload className="h-4 w-4" /> استيراد
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn("p-4 text-start font-bold text-slate-900 dark:text-slate-100", col.className)}>
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="w-3.5 h-3.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />}
                  </div>
                </th>
              ))}
              {actions && <th className="p-4 w-20 text-center text-slate-900 dark:text-slate-100 font-bold">الإجراءات</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => (
                <tr key={getRowKey(item, idx)} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn("p-4 text-start text-slate-600 dark:text-slate-400 whitespace-nowrap", col.className)}>
                      {typeof col.accessor === "function" 
                        ? col.accessor(item) 
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  
                  {actions && (
                    <td className="p-4 w-20 text-center">
                      <ActionMenu actions={actions} item={item} actiondir={actindir} />
                    </td>
                  )}
                </tr>
              ))
            ) : !isLoading && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Inbox className="w-12 h-12 stroke-[1.5]" />
                    <p className="text-base">لم يتم العثور على أي بيانات حالياً</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination Controls --- */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-2 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-500">
          إظهار <span className="font-semibold">{paginatedData.length}</span> من أصل <span className="font-semibold">{effectiveTotal}</span> نتيجة
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-sm text-slate-500">
            الصفحة {currentPage} من {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canPrevPage || isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canNextPage || isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// مكون قائمة الإجراءات
function ActionMenu<T>({ actions, item  , actiondir}: { actions: TableAction<T>[], item: T , actiondir?:boolean }) {
  return (
    <div className="">
      {actiondir === true ? (
        <div className="flex items-center gap-2">
          {actions.map((e , i) => (
            <button key={i} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all" onClick={() =>  e.onClick(item)}>{e.icon}</button>
          ))}
        </div>
      ):(
        <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all">
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" className="min-w-[140px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-lg z-50">
          {actions.map((action, idx) => (
            <DropdownMenu.Item
              key={idx}
              onClick={() => action.onClick(item)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-md outline-none",
                action.variant === "danger" ? "text-red-500 focus:bg-red-50" : "text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800"
              )}
            >
              {action.icon}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
      )}
    </div>
  );
}