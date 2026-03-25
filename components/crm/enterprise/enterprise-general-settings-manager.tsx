"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Settings2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { GENERAL_SETTINGS_UPDATED_EVENT } from "@/lib/crm-general-settings";

type FieldType = "text" | "number" | "date" | "email" | "phone" | "textarea" | "select";

interface SiteSection {
  id: string;
  title: string;
  description: string;
  isVisible: boolean;
  displayOrder: number;
}

interface FieldRule {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  isRequired: boolean;
  isVisible: boolean;
}

interface TableColumnRule {
  id: string;
  key: string;
  label: string;
  isRequired: boolean;
  isVisible: boolean;
}

interface PageRule {
  id: string;
  slug: string;
  title: string;
  description: string;
  isEnabled: boolean;
  showInNavigation: boolean;
  fields: FieldRule[];
  tableColumns: TableColumnRule[];
}

interface WebsiteGeneralSettings {
  sections: SiteSection[];
  pages: PageRule[];
  updatedAt: string;
}

const GENERAL_SETTINGS_STORAGE_KEY = "crm-enterprise-general-settings";

const fieldTypeOptions: FieldType[] = ["text", "number", "date", "email", "phone", "textarea", "select"];

const defaultSections: SiteSection[] = [
  { id: "section_home", title: "الرئيسية", description: "قسم Hero والمحتوى التعريفي الأول.", isVisible: true, displayOrder: 1 },
  { id: "section_about", title: "من نحن", description: "تعريف المؤسسة والرؤية والرسالة.", isVisible: true, displayOrder: 2 },
  { id: "section_services", title: "الخدمات", description: "عرض الخدمات الأساسية والتفاصيل.", isVisible: true, displayOrder: 3 },
  { id: "section_contact", title: "تواصل معنا", description: "بيانات التواصل والنموذج.", isVisible: true, displayOrder: 4 },
  { id: "section_policies", title: "السياسات", description: "سياسة الخصوصية والشروط والأحكام.", isVisible: true, displayOrder: 5 },
];

const defaultPages: PageRule[] = [
  {
    id: "page_home",
    slug: "home",
    title: "الصفحة الرئيسية",
    description: "واجهة الموقع والعناصر الأساسية للزائر.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "home_f_title", key: "heroTitle", label: "عنوان رئيسي", type: "text", isRequired: true, isVisible: true },
      { id: "home_f_subtitle", key: "heroSubtitle", label: "عنوان فرعي", type: "textarea", isRequired: true, isVisible: true },
      { id: "home_f_cta", key: "heroCta", label: "زر CTA", type: "text", isRequired: true, isVisible: true },
    ],
    tableColumns: [
      { id: "home_c_title", key: "title", label: "العنوان", isRequired: true, isVisible: true },
      { id: "home_c_status", key: "status", label: "الحالة", isRequired: true, isVisible: true },
      { id: "home_c_updated", key: "updatedAt", label: "آخر تحديث", isRequired: true, isVisible: true },
    ],
  },
  {
    id: "page_services",
    slug: "services",
    title: "الخدمات",
    description: "تعريف الخدمة، السعر، والميزات.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "srv_f_name", key: "serviceName", label: "اسم الخدمة", type: "text", isRequired: true, isVisible: true },
      { id: "srv_f_price", key: "servicePrice", label: "السعر", type: "number", isRequired: true, isVisible: true },
      { id: "srv_f_desc", key: "serviceDescription", label: "الوصف", type: "textarea", isRequired: true, isVisible: true },
    ],
    tableColumns: [
      { id: "srv_c_name", key: "serviceName", label: "الخدمة", isRequired: true, isVisible: true },
      { id: "srv_c_price", key: "price", label: "السعر", isRequired: true, isVisible: true },
      { id: "srv_c_active", key: "isActive", label: "مفعلة", isRequired: true, isVisible: true },
    ],
  },
  {
    id: "page_contact",
    slug: "contact",
    title: "تواصل معنا",
    description: "إدارة حقول التواصل والاستفسارات.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "con_f_name", key: "fullName", label: "الاسم الكامل", type: "text", isRequired: true, isVisible: true },
      { id: "con_f_email", key: "email", label: "البريد الإلكتروني", type: "email", isRequired: true, isVisible: true },
      { id: "con_f_phone", key: "phone", label: "رقم الجوال", type: "phone", isRequired: false, isVisible: true },
      { id: "con_f_message", key: "message", label: "الرسالة", type: "textarea", isRequired: true, isVisible: true },
    ],
    tableColumns: [
      { id: "con_c_name", key: "fullName", label: "الاسم", isRequired: true, isVisible: true },
      { id: "con_c_email", key: "email", label: "البريد", isRequired: true, isVisible: true },
      { id: "con_c_phone", key: "phone", label: "الجوال", isRequired: false, isVisible: true },
      { id: "con_c_created", key: "createdAt", label: "تاريخ الطلب", isRequired: true, isVisible: true },
    ],
  },
  {
    id: "page_customers",
    slug: "customers",
    title: "CRM - العملاء",
    description: "التحكم في حقول وأعمدة صفحة العملاء.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "cus_f_company", key: "companyName", label: "اسم الشركة", type: "text", isRequired: true, isVisible: true },
      { id: "cus_f_contact", key: "contactPersons", label: "مسؤول التواصل", type: "text", isRequired: true, isVisible: true },
      { id: "cus_f_country", key: "country", label: "الدولة", type: "text", isRequired: true, isVisible: true },
      { id: "cus_f_city", key: "city", label: "المدينة", type: "text", isRequired: true, isVisible: true },
      { id: "cus_f_phone", key: "phone", label: "رقم التواصل", type: "phone", isRequired: true, isVisible: true },
      { id: "cus_f_industry", key: "industry", label: "القطاع", type: "text", isRequired: false, isVisible: true },
      { id: "cus_f_email", key: "email", label: "البريد", type: "email", isRequired: false, isVisible: true },
    ],
    tableColumns: [
      { id: "cus_c_company", key: "companyName", label: "الشركة", isRequired: true, isVisible: true },
      { id: "cus_c_size", key: "companySize", label: "الحجم", isRequired: false, isVisible: true },
      { id: "cus_c_industry", key: "industry", label: "القطاع", isRequired: false, isVisible: true },
      { id: "cus_c_contact", key: "contactPersons", label: "مسؤول التواصل", isRequired: true, isVisible: true },
      { id: "cus_c_country", key: "country", label: "البلد", isRequired: false, isVisible: true },
      { id: "cus_c_city", key: "city", label: "المدينة", isRequired: false, isVisible: true },
      { id: "cus_c_phone", key: "phone", label: "رقم التواصل", isRequired: true, isVisible: true },
      { id: "cus_c_status", key: "status", label: "الحالة", isRequired: false, isVisible: true },
      { id: "cus_c_tier", key: "tier", label: "التصنيف", isRequired: false, isVisible: true },
      { id: "cus_c_value", key: "annualValue", label: "القيمة السنوية", isRequired: false, isVisible: true },
    ],
  },
  {
    id: "page_orders",
    slug: "orders",
    title: "CRM - الطلبات",
    description: "التحكم في حقول وأعمدة صفحة الطلبات.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "ord_f_receiver", key: "receiverName", label: "اسم المستلم", type: "text", isRequired: true, isVisible: true },
      { id: "ord_f_phone", key: "receiverPhone", label: "رقم المستلم", type: "phone", isRequired: true, isVisible: true },
      { id: "ord_f_city", key: "receiverCity", label: "مدينة المستلم", type: "text", isRequired: true, isVisible: true },
      { id: "ord_f_delivery", key: "deliveryNotes", label: "ملاحظات التوصيل", type: "textarea", isRequired: false, isVisible: true },
    ],
    tableColumns: [
      { id: "ord_c_no", key: "orderNo", label: "رقم الطلب", isRequired: true, isVisible: true },
      { id: "ord_c_invoice", key: "invoiceNo", label: "رقم الفاتورة", isRequired: false, isVisible: true },
      { id: "ord_c_customer", key: "customerName", label: "العميل", isRequired: true, isVisible: true },
      { id: "ord_c_date", key: "date", label: "التاريخ", isRequired: false, isVisible: true },
      { id: "ord_c_total", key: "total", label: "المجموع", isRequired: true, isVisible: true },
      { id: "ord_c_shipping", key: "shippingCost", label: "الشحن", isRequired: false, isVisible: true },
      { id: "ord_c_status", key: "status", label: "الحالة", isRequired: true, isVisible: true },
    ],
  },
  {
    id: "page_products",
    slug: "products",
    title: "CRM - المنتجات",
    description: "التحكم في حقول وأعمدة صفحة المنتجات والتصنيفات.",
    isEnabled: true,
    showInNavigation: true,
    fields: [
      { id: "prd_f_name", key: "productName", label: "اسم المنتج", type: "text", isRequired: true, isVisible: true },
      { id: "prd_f_category", key: "productCategoryName", label: "تصنيف المنتج", type: "text", isRequired: false, isVisible: true },
      { id: "prd_f_catname", key: "categoryName", label: "اسم التصنيف", type: "text", isRequired: true, isVisible: true },
      { id: "prd_f_wh", key: "categoryWarehouseId", label: "مستودع التصنيف", type: "text", isRequired: true, isVisible: true },
    ],
    tableColumns: [
      { id: "prd_c_type", key: "type", label: "النوع", isRequired: true, isVisible: true },
      { id: "prd_c_name", key: "name", label: "الاسم", isRequired: true, isVisible: true },
      { id: "prd_c_details", key: "details", label: "التفاصيل", isRequired: false, isVisible: true },
      { id: "prd_c_date", key: "createdAt", label: "التاريخ", isRequired: false, isVisible: true },
      { id: "prd_c_price", key: "price", label: "السعر", isRequired: false, isVisible: true },
      { id: "prd_c_qty", key: "quantity", label: "الكمية", isRequired: false, isVisible: true },
      { id: "prd_c_category", key: "categoryName", label: "التصنيف", isRequired: false, isVisible: true },
      { id: "prd_c_wh", key: "warehouse", label: "المستودع", isRequired: false, isVisible: true },
    ],
  },
];

/**
 * Builds the default settings object.
 */
function createDefaultSettings(): WebsiteGeneralSettings {
  return {
    sections: defaultSections,
    pages: defaultPages,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a unique id with semantic prefix.
 */
function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Returns a safe clone for editable page state.
 */
function clonePage(page: PageRule): PageRule {
  return {
    ...page,
    fields: page.fields.map((field) => ({ ...field })),
    tableColumns: page.tableColumns.map((column) => ({ ...column })),
  };
}

/**
 * General settings manager for website sections, pages and table requirements.
 */
export function EnterpriseGeneralSettingsManager() {
  const [settings, setSettings] = useState<WebsiteGeneralSettings>(createDefaultSettings);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<PageRule | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WebsiteGeneralSettings;
        if (Array.isArray(parsed.sections) && Array.isArray(parsed.pages)) {
          setSettings(parsed);
        }
      }
    } catch {
      toast.error("تعذر تحميل إعدادات الموقع، تم استخدام القيم الافتراضية");
    } finally {
      setIsHydrated(true);
      setHasLoadedSettings(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(GENERAL_SETTINGS_UPDATED_EVENT));
  }, [settings, hasLoadedSettings]);

  const enabledPagesCount = useMemo(
    () => settings.pages.filter((page) => page.isEnabled).length,
    [settings.pages]
  );

  const requiredFieldsCount = useMemo(
    () => settings.pages.reduce((sum, page) => sum + page.fields.filter((field) => field.isRequired).length, 0),
    [settings.pages]
  );

  const requiredColumnsCount = useMemo(
    () => settings.pages.reduce((sum, page) => sum + page.tableColumns.filter((column) => column.isRequired).length, 0),
    [settings.pages]
  );

  /**
   * Persists current settings in browser localStorage.
   */
  function handleSaveSettings() {
    setSettings((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
    }));
    toast.success("تم حفظ الإعدادات العامة بنجاح");
  }

  /**
   * Restores settings to the default template.
   */
  function handleResetSettings() {
    const defaultState = createDefaultSettings();
    setSettings(defaultState);
    toast.success("تمت استعادة الإعدادات الافتراضية");
  }

  /**
   * Updates a single section item in state.
   */
  function updateSection(sectionId: string, updater: (section: SiteSection) => SiteSection) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  }

  /**
   * Adds a new website section with default values.
   */
  function addSection() {
    setSettings((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: createId("section"),
          title: "قسم جديد",
          description: "وصف القسم",
          isVisible: true,
          displayOrder: prev.sections.length + 1,
        },
      ],
    }));
  }

  /**
   * Removes a section from the configuration.
   */
  function removeSection(sectionId: string) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  }

  /**
   * Opens modal in edit mode for a selected page.
   */
  function openPageEditor(page: PageRule) {
    setEditingPageId(page.id);
    setEditingPage(clonePage(page));
    setIsPageModalOpen(true);
  }

  /**
   * Applies modal edits back to the main pages list.
   */
  function savePageEditor() {
    if (!editingPageId || !editingPage) {
      return;
    }

    if (!editingPage.title.trim()) {
      toast.error("عنوان الصفحة مطلوب");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => (page.id === editingPageId ? editingPage : page)),
      updatedAt: new Date().toISOString(),
    }));

    setIsPageModalOpen(false);
    setEditingPageId(null);
    setEditingPage(null);
    toast.success("تم تحديث إعدادات الصفحة");
  }

  /**
   * Updates one field rule inside the page editor.
   */
  function updateEditingField(fieldId: string, updater: (field: FieldRule) => FieldRule) {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        fields: prev.fields.map((field) => (field.id === fieldId ? updater(field) : field)),
      };
    });
  }

  /**
   * Adds a new field rule to the page editor.
   */
  function addEditingField() {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            id: createId("field"),
            key: "newField",
            label: "حقل جديد",
            type: "text",
            options: [],
            isRequired: false,
            isVisible: true,
          },
        ],
      };
    });
  }

  /**
   * Removes a field rule from the page editor.
   */
  function removeEditingField(fieldId: string) {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        fields: prev.fields.filter((field) => field.id !== fieldId),
      };
    });
  }

  /**
   * Updates one table column rule inside the page editor.
   */
  function updateEditingColumn(columnId: string, updater: (column: TableColumnRule) => TableColumnRule) {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        tableColumns: prev.tableColumns.map((column) => (column.id === columnId ? updater(column) : column)),
      };
    });
  }

  /**
   * Adds a new table column rule to the page editor.
   */
  function addEditingColumn() {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        tableColumns: [
          ...prev.tableColumns,
          {
            id: createId("column"),
            key: "newColumn",
            label: "عمود جديد",
            isRequired: false,
            isVisible: true,
          },
        ],
      };
    });
  }

  /**
   * Removes a table column rule from the page editor.
   */
  function removeEditingColumn(columnId: string) {
    setEditingPage((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        tableColumns: prev.tableColumns.filter((column) => column.id !== columnId),
      };
    });
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="الإعدادات العامة للموقع"
        description="حدد الأقسام الرئيسية والصفحات المعروضة فقط."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleResetSettings}>
            استعادة الافتراضي
          </Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveSettings}>
            حفظ الإعدادات
          </Button>
        </div>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الأقسام الرئيسية</p>
            <p className="text-3xl font-bold text-slate-900">{settings.sections.length}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الصفحات المفعلة</p>
            <p className="text-3xl font-bold text-emerald-600">{enabledPagesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header
          title="الأقسام الرئيسية للموقع"
          description="يمكنك إضافة/حذف الأقسام وتحديد ظهورها وترتيبها."
          icon={<Settings2 className="h-5 w-5" />}
          action={
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addSection}>
              إضافة قسم
            </Button>
          }
        />
        <DynamicCard.Content className="space-y-3">
          {settings.sections
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((section) => (
              <div key={section.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-12">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs text-slate-500">اسم القسم</label>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    value={section.title}
                    onChange={(event) =>
                      updateSection(section.id, (prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="mb-1 block text-xs text-slate-500">الوصف</label>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    value={section.description}
                    onChange={(event) =>
                      updateSection(section.id, (prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">الترتيب</label>
                  <input
                    type="number"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    value={section.displayOrder}
                    onChange={(event) =>
                      updateSection(section.id, (prev) => ({
                        ...prev,
                        displayOrder: Number(event.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.isVisible}
                      onChange={(event) =>
                        updateSection(section.id, (prev) => ({
                          ...prev,
                          isVisible: event.target.checked,
                        }))
                      }
                    />
                    ظاهر
                  </label>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50"
                    title="حذف القسم"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header
          title="إعدادات الصفحات"
          description="تحكم في ظهور كل صفحة ضمن النظام والقائمة."
        />
        <DynamicCard.Content className="space-y-3">
          {settings.pages.map((page) => (
            <div key={page.id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{page.title}</p>
                  <p className="text-sm text-slate-600">{page.description}</p>
                  <p className="text-xs text-slate-500">/{page.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={page.isEnabled}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          pages: prev.pages.map((item) =>
                            item.id === page.id ? { ...item, isEnabled: event.target.checked } : item
                          ),
                        }))
                      }
                    />
                    مفعلة
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={page.showInNavigation}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          pages: prev.pages.map((item) =>
                            item.id === page.id ? { ...item, showInNavigation: event.target.checked } : item
                          ),
                        }))
                      }
                    />
                    في القائمة
                  </label>
                </div>
              </div>
            </div>
          ))}
        </DynamicCard.Content>
      </DynamicCard>

      {!isHydrated && (
        <p className="text-xs text-slate-500">جاري تحميل الإعدادات المخزنة...</p>
      )}
      {isHydrated && settings.updatedAt && (
        <p className="text-xs text-slate-500">آخر حفظ: {new Date(settings.updatedAt).toLocaleString("ar-SA")}</p>
      )}
    </section>
  );
}
