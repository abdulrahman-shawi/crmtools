"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Bell, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import type { EmployeeDocument, Payslip } from "@/lib/types/hr";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { matchesSearch } from "@/lib/search";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  date: string;
}

interface SelfServiceManagerProps {
  initialPayslips: Payslip[];
  initialDocuments: EmployeeDocument[];
  initialAnnouncements: AnnouncementItem[];
}

interface AnnouncementFormState {
  title: string;
  message: string;
  date: string;
}

interface DocumentFormState {
  documentType: EmployeeDocument["documentType"];
  expiryDate: string;
  status: EmployeeDocument["status"];
}

interface PayslipFormState {
  employeeId: string;
  month: string;
  generatedDate: string;
  url: string;
}

const initialAnnouncementForm: AnnouncementFormState = {
  title: "",
  message: "",
  date: "",
};

const initialDocumentForm: DocumentFormState = {
  documentType: "other",
  expiryDate: "",
  status: "valid",
};

const initialPayslipForm: PayslipFormState = {
  employeeId: "emp_001",
  month: "",
  generatedDate: "",
  url: "",
};

/**
 * Manages self-service page entities with full CRUD.
 */
export function SelfServiceManager({
  initialPayslips,
  initialDocuments,
  initialAnnouncements,
}: SelfServiceManagerProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [documents, setDocuments] = useState<EmployeeDocument[]>(initialDocuments);
  const [payslips, setPayslips] = useState<Payslip[]>(initialPayslips);

  const [announcementModal, setAnnouncementModal] = useState(false);
  const [documentModal, setDocumentModal] = useState(false);
  const [payslipModal, setPayslipModal] = useState(false);

  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingPayslipId, setEditingPayslipId] = useState<string | null>(null);

  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(initialAnnouncementForm);
  const [documentForm, setDocumentForm] = useState<DocumentFormState>(initialDocumentForm);
  const [payslipForm, setPayslipForm] = useState<PayslipFormState>(initialPayslipForm);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypeLabel: Record<EmployeeDocument["documentType"], string> = {
    id: "هوية",
    passport: "جواز سفر",
    contract: "عقد عمل",
    other: "أخرى",
  };

  const statusInfo = {
    valid: { color: "bg-green-50 border-l-green-500", icon: "✅", label: "صالحة" },
    "expiring-soon": {
      color: "bg-yellow-50 border-l-yellow-500",
      icon: "⏰",
      label: "تقاربت من الانتهاء",
    },
    expired: { color: "bg-red-50 border-l-red-500", icon: "❌", label: "منتهية" },
  };

  const expiredDocs = useMemo(() => documents.filter((d) => d.status === "expired"), [documents]);
  const expiringDocs = useMemo(() => documents.filter((d) => d.status === "expiring-soon"), [documents]);

  const canManageAnnouncements = can(user, RBAC_PERMISSIONS.announcementsManage);
  const canManageDocuments = can(user, RBAC_PERMISSIONS.documentsManage);
  const canManagePayslips = can(user, RBAC_PERMISSIONS.payslipsManage);
  const canSearchData = can(user, RBAC_PERMISSIONS.dataSearch);
  const canExportData = can(user, RBAC_PERMISSIONS.dataExport);
  const canImportData = can(user, RBAC_PERMISSIONS.dataImport);

  const filteredAnnouncements = useMemo(() => {
    if (!canSearchData || !searchQuery.trim()) return announcements;
    return announcements.filter((item) => matchesSearch(JSON.stringify(item), searchQuery));
  }, [announcements, canSearchData, searchQuery]);

  const filteredDocuments = useMemo(() => {
    if (!canSearchData || !searchQuery.trim()) return documents;
    return documents.filter((item) =>
      matchesSearch(
        `${JSON.stringify(item)} ${docTypeLabel[item.documentType]} ${statusInfo[item.status].label}`,
        searchQuery
      )
    );
  }, [documents, canSearchData, searchQuery]);

  const filteredPayslips = useMemo(() => {
    if (!canSearchData || !searchQuery.trim()) return payslips;
    return payslips.filter((item) => matchesSearch(JSON.stringify(item), searchQuery));
  }, [payslips, canSearchData, searchQuery]);

  /**
   * Converts list of records to CSV string.
   */
  function toCsv(records: Record<string, unknown>[]) {
    if (!records.length) return "";
    const headers = Object.keys(records[0]);
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = records.map((record) => headers.map((header) => escapeCell(record[header])).join(","));
    return [headers.join(","), ...lines].join("\n");
  }

  /**
   * Downloads a text payload as file.
   */
  function downloadTextFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports self-service datasets as JSON.
   */
  function exportJson() {
    const payload = {
      announcements,
      documents,
      payslips,
    };
    downloadTextFile(JSON.stringify(payload, null, 2), "self-service.json", "application/json;charset=utf-8");
    toast.success("تم تصدير JSON");
  }

  /**
   * Exports flattened self-service data as Excel-compatible CSV.
   */
  function exportExcel() {
    const rows: Record<string, unknown>[] = [
      ...announcements.map((item) => ({ section: "announcements", ...item })),
      ...documents.map((item) => ({ section: "documents", ...item })),
      ...payslips.map((item) => ({ section: "payslips", ...item })),
    ];

    const csv = toCsv(rows);
    if (!csv) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    downloadTextFile(`\uFEFF${csv}`, "self-service.xls", "application/vnd.ms-excel;charset=utf-8");
    toast.success("تم تصدير Excel");
  }

  /**
   * Prints all self-service data as a PDF-friendly page.
   */
  function exportPdf() {
    const windowRef = window.open("", "_blank", "width=1024,height=768");
    if (!windowRef) {
      toast.error("تعذر فتح نافذة PDF");
      return;
    }

    const block = (title: string, records: unknown[]) => `
      <h3>${title}</h3>
      <pre style="background:#f8f8f8;padding:12px;border:1px solid #ddd;white-space:pre-wrap">${JSON.stringify(records, null, 2)}</pre>
    `;

    windowRef.document.write(`
      <html>
        <body dir="rtl" style="font-family:Arial;padding:20px">
          <h2>Self Service Data</h2>
          ${block("Announcements", announcements)}
          ${block("Documents", documents)}
          ${block("Payslips", payslips)}
        </body>
      </html>
    `);
    windowRef.document.close();
    windowRef.focus();
    windowRef.print();
    toast.success("تم فتح تصدير PDF");
  }

  /**
   * Imports JSON or CSV/XLS payload and updates page datasets.
   */
  async function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const text = await file.text();
    try {
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".json")) {
        const parsed = JSON.parse(text) as {
          announcements?: AnnouncementItem[];
          documents?: EmployeeDocument[];
          payslips?: Payslip[];
        };

        if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements);
        if (Array.isArray(parsed.documents)) setDocuments(parsed.documents);
        if (Array.isArray(parsed.payslips)) setPayslips(parsed.payslips);
        toast.success("تم استيراد البيانات");
        return;
      }

      if (lowerName.endsWith(".csv") || lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          toast.error("ملف Excel فارغ");
          return;
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

        const importedAnnouncements = rows
          .filter((row) => row.section === "announcements")
          .map((row) => ({
            id: row.id || `announce_${Date.now()}`,
            title: row.title || "",
            message: row.message || "",
            date: row.date || "",
          }));

        const importedDocuments = rows
          .filter((row) => row.section === "documents")
          .map((row) => ({
            id: row.id || `doc_${Date.now()}`,
            employeeId: row.employeeId || "emp_001",
            documentType: (row.documentType as EmployeeDocument["documentType"]) || "other",
            expiryDate: row.expiryDate || "",
            status: (row.status as EmployeeDocument["status"]) || "valid",
          }));

        const importedPayslips = rows
          .filter((row) => row.section === "payslips")
          .map((row) => ({
            id: row.id || `slip_${Date.now()}`,
            employeeId: row.employeeId || "emp_001",
            month: row.month || "",
            generatedDate: row.generatedDate || "",
            url: row.url || "",
          }));

        if (importedAnnouncements.length) setAnnouncements(importedAnnouncements);
        if (importedDocuments.length) setDocuments(importedDocuments);
        if (importedPayslips.length) setPayslips(importedPayslips);

        toast.success("تم استيراد بيانات Excel");
        return;
      }

      toast.error("صيغة الملف غير مدعومة");
    } catch {
      toast.error("فشل استيراد الملف");
    }
  }

  /**
   * Opens announcement create modal.
   */
  function openCreateAnnouncement() {
    if (!canManageAnnouncements) {
      toast.error("لا تملك صلاحية إدارة الإعلانات");
      return;
    }
    setEditingAnnouncementId(null);
    setAnnouncementForm(initialAnnouncementForm);
    setAnnouncementModal(true);
  }

  /**
   * Opens announcement edit modal.
   */
  function openEditAnnouncement(item: AnnouncementItem) {
    if (!canManageAnnouncements) {
      toast.error("لا تملك صلاحية إدارة الإعلانات");
      return;
    }
    setEditingAnnouncementId(item.id);
    setAnnouncementForm({
      title: item.title,
      message: item.message,
      date: item.date,
    });
    setAnnouncementModal(true);
  }

  /**
   * Saves announcement data.
   */
  function saveAnnouncement() {
    if (!canManageAnnouncements) {
      toast.error("لا تملك صلاحية إدارة الإعلانات");
      return;
    }
    if (!announcementForm.title.trim() || !announcementForm.message.trim() || !announcementForm.date) {
      toast.error("يرجى تعبئة بيانات الإعلان");
      return;
    }

    if (editingAnnouncementId) {
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === editingAnnouncementId
            ? {
                ...item,
                title: announcementForm.title.trim(),
                message: announcementForm.message.trim(),
                date: announcementForm.date,
              }
            : item
        )
      );
      toast.success("تم تعديل الإعلان");
    } else {
      setAnnouncements((prev) => [
        {
          id: `announce_${Date.now()}`,
          title: announcementForm.title.trim(),
          message: announcementForm.message.trim(),
          date: announcementForm.date,
        },
        ...prev,
      ]);
      toast.success("تمت إضافة الإعلان");
    }

    setAnnouncementModal(false);
    setEditingAnnouncementId(null);
    setAnnouncementForm(initialAnnouncementForm);
  }

  /**
   * Deletes announcement.
   */
  function deleteAnnouncement(item: AnnouncementItem) {
    if (!canManageAnnouncements) {
      toast.error("لا تملك صلاحية إدارة الإعلانات");
      return;
    }
    const confirmed = window.confirm(`هل تريد حذف الإعلان ${item.title}؟`);
    if (!confirmed) return;

    setAnnouncements((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("تم حذف الإعلان");
  }

  /**
   * Opens document create modal.
   */
  function openCreateDocument() {
    if (!canManageDocuments) {
      toast.error("لا تملك صلاحية إدارة الوثائق");
      return;
    }
    setEditingDocumentId(null);
    setDocumentForm(initialDocumentForm);
    setDocumentModal(true);
  }

  /**
   * Opens document edit modal.
   */
  function openEditDocument(item: EmployeeDocument) {
    if (!canManageDocuments) {
      toast.error("لا تملك صلاحية إدارة الوثائق");
      return;
    }
    setEditingDocumentId(item.id);
    setDocumentForm({
      documentType: item.documentType,
      expiryDate: item.expiryDate,
      status: item.status,
    });
    setDocumentModal(true);
  }

  /**
   * Saves document data.
   */
  function saveDocument() {
    if (!canManageDocuments) {
      toast.error("لا تملك صلاحية إدارة الوثائق");
      return;
    }
    if (!documentForm.expiryDate) {
      toast.error("يرجى إدخال تاريخ الانتهاء");
      return;
    }

    if (editingDocumentId) {
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === editingDocumentId
            ? {
                ...item,
                documentType: documentForm.documentType,
                expiryDate: documentForm.expiryDate,
                status: documentForm.status,
              }
            : item
        )
      );
      toast.success("تم تعديل الوثيقة");
    } else {
      setDocuments((prev) => [
        {
          id: `doc_${Date.now()}`,
          employeeId: "emp_001",
          documentType: documentForm.documentType,
          expiryDate: documentForm.expiryDate,
          status: documentForm.status,
        },
        ...prev,
      ]);
      toast.success("تمت إضافة الوثيقة");
    }

    setDocumentModal(false);
    setEditingDocumentId(null);
    setDocumentForm(initialDocumentForm);
  }

  /**
   * Deletes document entry.
   */
  function deleteDocument(item: EmployeeDocument) {
    if (!canManageDocuments) {
      toast.error("لا تملك صلاحية إدارة الوثائق");
      return;
    }
    const confirmed = window.confirm("هل تريد حذف هذه الوثيقة؟");
    if (!confirmed) return;

    setDocuments((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("تم حذف الوثيقة");
  }

  /**
   * Opens payslip create modal.
   */
  function openCreatePayslip() {
    if (!canManagePayslips) {
      toast.error("لا تملك صلاحية إدارة القسائم");
      return;
    }
    setEditingPayslipId(null);
    setPayslipForm(initialPayslipForm);
    setPayslipModal(true);
  }

  /**
   * Opens payslip edit modal.
   */
  function openEditPayslip(item: Payslip) {
    if (!canManagePayslips) {
      toast.error("لا تملك صلاحية إدارة القسائم");
      return;
    }
    setEditingPayslipId(item.id);
    setPayslipForm({
      employeeId: item.employeeId,
      month: item.month,
      generatedDate: item.generatedDate,
      url: item.url,
    });
    setPayslipModal(true);
  }

  /**
   * Saves payslip data.
   */
  function savePayslip() {
    if (!canManagePayslips) {
      toast.error("لا تملك صلاحية إدارة القسائم");
      return;
    }
    if (!payslipForm.month.trim() || !payslipForm.generatedDate || !payslipForm.url.trim()) {
      toast.error("يرجى تعبئة بيانات القسيمة");
      return;
    }

    if (editingPayslipId) {
      setPayslips((prev) =>
        prev.map((item) =>
          item.id === editingPayslipId
            ? {
                ...item,
                employeeId: payslipForm.employeeId.trim(),
                month: payslipForm.month.trim(),
                generatedDate: payslipForm.generatedDate,
                url: payslipForm.url.trim(),
              }
            : item
        )
      );
      toast.success("تم تعديل القسيمة");
    } else {
      setPayslips((prev) => [
        {
          id: `slip_${Date.now()}`,
          employeeId: payslipForm.employeeId.trim(),
          month: payslipForm.month.trim(),
          generatedDate: payslipForm.generatedDate,
          url: payslipForm.url.trim(),
        },
        ...prev,
      ]);
      toast.success("تمت إضافة القسيمة");
    }

    setPayslipModal(false);
    setEditingPayslipId(null);
    setPayslipForm(initialPayslipForm);
  }

  /**
   * Deletes payslip entry.
   */
  function deletePayslip(item: Payslip) {
    if (!canManagePayslips) {
      toast.error("لا تملك صلاحية إدارة القسائم");
      return;
    }
    const confirmed = window.confirm(`هل تريد حذف قسيمة ${item.month}؟`);
    if (!confirmed) return;

    setPayslips((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("تم حذف القسيمة");
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="الخدمة الذاتية"
        description="تحميل القسائم، تحديث البيانات، والإعلانات الداخلية."
      />

      {(canSearchData || canExportData || canImportData) && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
          {canSearchData ? (
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 pr-9 pl-3 text-sm"
                placeholder="بحث داخل الصفحة..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {canExportData && (
              <>
                <button onClick={exportJson} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                  JSON
                </button>
                <button onClick={exportExcel} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                  Excel
                </button>
                <button onClick={exportPdf} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                  PDF
                </button>
              </>
            )}
            {canImportData && (
              <>
                <input ref={fileInputRef} type="file" className="hidden" accept=".json,.csv,.xls,.xlsx" onChange={importData} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700"
                >
                  <Upload className="h-4 w-4" /> استيراد
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Bell className="h-5 w-5 text-blue-600" />
            إعلانات الشركة
          </h3>
          {canManageAnnouncements && (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateAnnouncement}>
              إضافة إعلان
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => (
            <DynamicCard key={announcement.id} className="border-l-4 border-l-blue-500 bg-blue-50/50">
              <DynamicCard.Content className="flex items-start justify-between gap-4 py-3">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{announcement.title}</p>
                  <p className="text-sm text-slate-600">{announcement.message}</p>
                  <p className="text-xs text-slate-500">{announcement.date}</p>
                </div>
                {canManageAnnouncements && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditAnnouncement(announcement)}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement)}
                      className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </DynamicCard.Content>
            </DynamicCard>
          ))}
        </div>
      </div>

      {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
        <DynamicCard className="border-l-4 border-l-red-500 bg-red-50/50">
          <DynamicCard.Header title="⚠️ الوثائق المنتهية/المقاربة للانتهاء" description="يرجى تحديث الوثائق المنتهية" />
          <DynamicCard.Content className="space-y-2">
            {expiredDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-red-100 p-3">
                <span className="text-sm font-semibold text-red-700">
                  ❌ {docTypeLabel[doc.documentType]} - انتهت في {doc.expiryDate}
                </span>
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            ))}
            {expiringDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-yellow-100 p-3">
                <span className="text-sm font-semibold text-yellow-700">
                  ⏰ {docTypeLabel[doc.documentType]} - تنتهي في {doc.expiryDate}
                </span>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
            ))}
          </DynamicCard.Content>
        </DynamicCard>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">قسائم الراتب</h3>
          {canManagePayslips && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePayslip}>
            إضافة قسيمة
          </Button>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredPayslips.map((payslip) => (
            <DynamicCard key={payslip.id} className="transition-all hover:shadow-md">
              <DynamicCard.Content className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{payslip.month}</p>
                  <p className="text-xs text-slate-500">{payslip.generatedDate}</p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={payslip.url}
                    className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    download
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </a>
                  {canManagePayslips && (
                  <button
                    onClick={() => openEditPayslip(payslip)}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  )}
                  {canManagePayslips && (
                  <button
                    onClick={() => deletePayslip(payslip)}
                    className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  )}
                </div>
              </DynamicCard.Content>
            </DynamicCard>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">الوثائق الشخصية</h3>
          {canManageDocuments && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateDocument}>
            إضافة وثيقة
          </Button>
          )}
        </div>
        <div className="space-y-2">
          {filteredDocuments.map((doc) => {
            const status = statusInfo[doc.status];
            return (
              <DynamicCard key={doc.id} className={`border-l-4 ${status.color}`}>
                <DynamicCard.Content className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {status.icon} {docTypeLabel[doc.documentType]}
                    </p>
                    <p className="text-xs text-slate-600">ينتهي: {doc.expiryDate} ({status.label})</p>
                  </div>
                  {canManageDocuments && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditDocument(doc)}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc)}
                      className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  )}
                </DynamicCard.Content>
              </DynamicCard>
            );
          })}
        </div>
      </div>

      <DynamicCard className="bg-gradient-to-br from-slate-50 to-slate-100">
        <DynamicCard.Header title="تحديث بيانات الحساب" description="يمكنك تحديث رقم الهاتف والعنوان والبيانات الشخصية" />
        <DynamicCard.Content className="space-y-3 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">رقم الهاتف</label>
              <input type="tel" placeholder="أدخل رقم الهاتف" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
              <input type="email" placeholder="أدخل البريد الإلكتروني" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">العنوان</label>
              <input type="text" placeholder="أدخل العنوان" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">إلغاء</button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">حفظ التغييرات</button>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={announcementModal}
        onClose={() => setAnnouncementModal(false)}
        title={editingAnnouncementId ? "تعديل إعلان" : "إضافة إعلان"}
        size="md"
        footer={
          <>
            <Button onClick={saveAnnouncement}>{editingAnnouncementId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setAnnouncementModal(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="عنوان الإعلان"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <textarea
            className="min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="محتوى الإعلان"
            value={announcementForm.message}
            onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, message: e.target.value }))}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={announcementForm.date}
            onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        isOpen={documentModal}
        onClose={() => setDocumentModal(false)}
        title={editingDocumentId ? "تعديل وثيقة" : "إضافة وثيقة"}
        size="md"
        footer={
          <>
            <Button onClick={saveDocument}>{editingDocumentId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setDocumentModal(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={documentForm.documentType}
            onChange={(e) =>
              setDocumentForm((prev) => ({ ...prev, documentType: e.target.value as EmployeeDocument["documentType"] }))
            }
          >
            <option value="id">هوية</option>
            <option value="passport">جواز سفر</option>
            <option value="contract">عقد عمل</option>
            <option value="other">أخرى</option>
          </select>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={documentForm.status}
            onChange={(e) =>
              setDocumentForm((prev) => ({ ...prev, status: e.target.value as EmployeeDocument["status"] }))
            }
          >
            <option value="valid">صالحة</option>
            <option value="expiring-soon">تقاربت من الانتهاء</option>
            <option value="expired">منتهية</option>
          </select>
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
            value={documentForm.expiryDate}
            onChange={(e) => setDocumentForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        isOpen={payslipModal}
        onClose={() => setPayslipModal(false)}
        title={editingPayslipId ? "تعديل قسيمة" : "إضافة قسيمة"}
        size="md"
        footer={
          <>
            <Button onClick={savePayslip}>{editingPayslipId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setPayslipModal(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الموظف (employeeId)"
            value={payslipForm.employeeId}
            onChange={(e) => setPayslipForm((prev) => ({ ...prev, employeeId: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الشهر"
            value={payslipForm.month}
            onChange={(e) => setPayslipForm((prev) => ({ ...prev, month: e.target.value }))}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={payslipForm.generatedDate}
            onChange={(e) => setPayslipForm((prev) => ({ ...prev, generatedDate: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="رابط الملف"
            value={payslipForm.url}
            onChange={(e) => setPayslipForm((prev) => ({ ...prev, url: e.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
