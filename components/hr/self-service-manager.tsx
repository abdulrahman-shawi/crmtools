"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Bell, Download, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import type { EmployeeDocument, Payslip } from "@/lib/types/hr";

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

  /**
   * Opens announcement create modal.
   */
  function openCreateAnnouncement() {
    setEditingAnnouncementId(null);
    setAnnouncementForm(initialAnnouncementForm);
    setAnnouncementModal(true);
  }

  /**
   * Opens announcement edit modal.
   */
  function openEditAnnouncement(item: AnnouncementItem) {
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
    const confirmed = window.confirm(`هل تريد حذف الإعلان ${item.title}؟`);
    if (!confirmed) return;

    setAnnouncements((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("تم حذف الإعلان");
  }

  /**
   * Opens document create modal.
   */
  function openCreateDocument() {
    setEditingDocumentId(null);
    setDocumentForm(initialDocumentForm);
    setDocumentModal(true);
  }

  /**
   * Opens document edit modal.
   */
  function openEditDocument(item: EmployeeDocument) {
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
    const confirmed = window.confirm("هل تريد حذف هذه الوثيقة؟");
    if (!confirmed) return;

    setDocuments((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("تم حذف الوثيقة");
  }

  /**
   * Opens payslip create modal.
   */
  function openCreatePayslip() {
    setEditingPayslipId(null);
    setPayslipForm(initialPayslipForm);
    setPayslipModal(true);
  }

  /**
   * Opens payslip edit modal.
   */
  function openEditPayslip(item: Payslip) {
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Bell className="h-5 w-5 text-blue-600" />
            إعلانات الشركة
          </h3>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateAnnouncement}>
            إضافة إعلان
          </Button>
        </div>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <DynamicCard key={announcement.id} className="border-l-4 border-l-blue-500 bg-blue-50/50">
              <DynamicCard.Content className="flex items-start justify-between gap-4 py-3">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{announcement.title}</p>
                  <p className="text-sm text-slate-600">{announcement.message}</p>
                  <p className="text-xs text-slate-500">{announcement.date}</p>
                </div>
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
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePayslip}>
            إضافة قسيمة
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {payslips.map((payslip) => (
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
                  <button
                    onClick={() => openEditPayslip(payslip)}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deletePayslip(payslip)}
                    className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </DynamicCard.Content>
            </DynamicCard>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">الوثائق الشخصية</h3>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateDocument}>
            إضافة وثيقة
          </Button>
        </div>
        <div className="space-y-2">
          {documents.map((doc) => {
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
