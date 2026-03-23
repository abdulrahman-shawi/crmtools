"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

type EntryType = "product" | "category";
type DiscountType = "percentage" | "fixed";

interface ProductImage {
  id: string;
  name: string;
  url: string;
}

interface ProductEntry {
  id: string;
  type: "product";
  productName: string;
  price: number;
  quantity: number;
  wholesalePrice: number;
  hasDiscount: boolean;
  discountType: DiscountType | null;
  discountValue: number;
  images: ProductImage[];
}

interface CategoryEntry {
  id: string;
  type: "category";
  categoryName: string;
  categoryColor: string;
  categoryNotes: string;
}

type CatalogEntry = ProductEntry | CategoryEntry;

interface ProductFormState {
  entryType: EntryType;
  categoryName: string;
  categoryColor: string;
  categoryNotes: string;
  productName: string;
  price: string;
  quantity: string;
  wholesalePrice: string;
  hasDiscount: boolean;
  discountType: DiscountType;
  discountValue: string;
  images: ProductImage[];
}

const initialEntries: CatalogEntry[] = [
  {
    id: "cat_1",
    type: "category",
    categoryName: "إلكترونيات",
    categoryColor: "#2563eb",
    categoryNotes: "تصنيف المنتجات الإلكترونية.",
  },
  {
    id: "prd_1",
    type: "product",
    productName: "جهاز نقاط بيع",
    price: 1500,
    quantity: 20,
    wholesalePrice: 1300,
    hasDiscount: true,
    discountType: "percentage",
    discountValue: 10,
    images: [],
  },
];

const initialFormState: ProductFormState = {
  entryType: "product",
  categoryName: "",
  categoryColor: "#2563eb",
  categoryNotes: "",
  productName: "",
  price: "",
  quantity: "",
  wholesalePrice: "",
  hasDiscount: false,
  discountType: "percentage",
  discountValue: "",
  images: [],
};

/**
 * Converts catalog row to searchable text.
 */
function toSearchText(row: CatalogEntry): string {
  if (row.type === "category") {
    return `${row.categoryName} ${row.categoryColor} ${row.categoryNotes} تصنيف`;
  }

  return `${row.productName} ${row.price} ${row.quantity} ${row.wholesalePrice} ${row.discountType ?? ""} ${row.discountValue} منتج`;
}

/**
 * Creates image preview objects from selected files.
 */
function mapFilesToImages(files: File[]): ProductImage[] {
  return files.map((file) => ({
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    url: URL.createObjectURL(file),
  }));
}

/**
 * Manages CRM enterprise products and categories in one page.
 */
export function EnterpriseProductsManager() {
  const [rows, setRows] = useState<CatalogEntry[]>(initialEntries);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);

  const totals = useMemo(() => {
    const productsCount = rows.filter((row) => row.type === "product").length;
    const categoriesCount = rows.filter((row) => row.type === "category").length;
    const totalStock = rows
      .filter((row): row is ProductEntry => row.type === "product")
      .reduce((sum, row) => sum + row.quantity, 0);

    return {
      productsCount,
      categoriesCount,
      totalStock,
    };
  }, [rows]);

  const columns = useMemo<Column<CatalogEntry>[]>(
    () => [
      {
        header: "النوع",
        accessor: (row) => (row.type === "product" ? "منتج" : "تصنيف"),
      },
      {
        header: "الاسم",
        accessor: (row) => (row.type === "product" ? row.productName : row.categoryName),
      },
      {
        header: "التفاصيل",
        accessor: (row) =>
          row.type === "product"
            ? `صور: ${row.images.length}`
            : `اللون: ${row.categoryColor}`,
      },
      {
        header: "السعر",
        accessor: (row) => (row.type === "product" ? row.price.toLocaleString() : "-"),
      },
      {
        header: "الكمية",
        accessor: (row) => (row.type === "product" ? row.quantity : "-"),
      },
      {
        header: "سعر الجملة",
        accessor: (row) => (row.type === "product" ? row.wholesalePrice.toLocaleString() : "-"),
      },
      {
        header: "الخصم",
        accessor: (row) => {
          if (row.type === "category") {
            return "-";
          }

          if (!row.hasDiscount) {
            return "لا يوجد";
          }

          return row.discountType === "percentage"
            ? `${row.discountValue}%`
            : `${row.discountValue.toLocaleString()} ثابت`;
        },
      },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEditModal(row)}
              className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              title="تعديل"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  /**
   * Opens creation modal with clean state.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and maps selected row to form state.
   */
  function openEditModal(row: CatalogEntry) {
    if (row.type === "category") {
      setFormState({
        entryType: "category",
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        categoryNotes: row.categoryNotes,
        productName: "",
        price: "",
        quantity: "",
        wholesalePrice: "",
        hasDiscount: false,
        discountType: "percentage",
        discountValue: "",
        images: [],
      });
    } else {
      setFormState({
        entryType: "product",
        categoryName: "",
        categoryColor: "#2563eb",
        categoryNotes: "",
        productName: row.productName,
        price: String(row.price),
        quantity: String(row.quantity),
        wholesalePrice: String(row.wholesalePrice),
        hasDiscount: row.hasDiscount,
        discountType: row.discountType ?? "percentage",
        discountValue: row.hasDiscount ? String(row.discountValue) : "",
        images: row.images,
      });
    }

    setEditingId(row.id);
    setIsModalOpen(true);
  }

  /**
   * Handles multiple product image selection and preview generation.
   */
  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextImages = mapFilesToImages(files);
    setFormState((prev) => ({
      ...prev,
      images: [...prev.images, ...nextImages],
    }));

    event.target.value = "";
  }

  /**
   * Removes selected image from current form state.
   */
  function removeImage(imageId: string) {
    setFormState((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== imageId),
    }));
  }

  /**
   * Validates and saves category or product entry.
   */
  function handleSave() {
    if (formState.entryType === "category") {
      if (!formState.categoryName.trim()) {
        toast.error("اسم التصنيف مطلوب");
        return;
      }

      const categoryPayload: CategoryEntry = {
        id: editingId ?? `cat_${Date.now()}`,
        type: "category",
        categoryName: formState.categoryName.trim(),
        categoryColor: formState.categoryColor,
        categoryNotes: formState.categoryNotes.trim(),
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? categoryPayload : row)));
        toast.success("تم تعديل التصنيف");
      } else {
        setRows((prev) => [categoryPayload, ...prev]);
        toast.success("تمت إضافة التصنيف");
      }
    } else {
      if (!formState.productName.trim()) {
        toast.error("اسم المنتج مطلوب");
        return;
      }

      const price = Number(formState.price || 0);
      const quantity = Number(formState.quantity || 0);
      const wholesalePrice = Number(formState.wholesalePrice || 0);
      const discountValue = Number(formState.discountValue || 0);

      if (Number.isNaN(price) || price <= 0) {
        toast.error("سعر المنتج غير صحيح");
        return;
      }

      if (Number.isNaN(quantity) || quantity < 0) {
        toast.error("كمية المنتج غير صحيحة");
        return;
      }

      if (Number.isNaN(wholesalePrice) || wholesalePrice < 0) {
        toast.error("سعر الجملة غير صحيح");
        return;
      }

      if (formState.hasDiscount) {
        if (Number.isNaN(discountValue) || discountValue <= 0) {
          toast.error("قيمة الخصم غير صحيحة");
          return;
        }
      }

      const productPayload: ProductEntry = {
        id: editingId ?? `prd_${Date.now()}`,
        type: "product",
        productName: formState.productName.trim(),
        price,
        quantity,
        wholesalePrice,
        hasDiscount: formState.hasDiscount,
        discountType: formState.hasDiscount ? formState.discountType : null,
        discountValue: formState.hasDiscount ? discountValue : 0,
        images: formState.images,
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? productPayload : row)));
        toast.success("تم تعديل المنتج");
      } else {
        setRows((prev) => [productPayload, ...prev]);
        toast.success("تمت إضافة المنتج");
      }
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
  }

  /**
   * Deletes selected row after confirmation.
   */
  function handleDelete(row: CatalogEntry) {
    const confirmed = window.confirm("هل تريد حذف هذا السجل؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف السجل");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة المنتجات والتصنيفات"
        description="يمكنك إضافة منتج أو تصنيف من نفس الشاشة بنموذج ذكي حسب نوع الإدخال."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة منتج أو تصنيف
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد المنتجات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.productsCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد التصنيفات</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.categoriesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-orange-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي الكمية</p>
            <p className="text-3xl font-bold text-orange-600">{totals.totalStock}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="قائمة المنتجات والتصنيفات" description="بحث وتعديل وحذف من جدول موحد." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            dir="rtl"
            pageSize={8}
            totalCount={rows.length}
            currentPage={page}
            onPageChange={setPage}
            title="المنتجات والتصنيفات"
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل سجل" : "إضافة منتج أو تصنيف"}
        size="lg"
        footer={
          <>
            <Button onClick={handleSave}>{editingId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-slate-600">نوع الإضافة</p>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.entryType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  entryType: event.target.value as EntryType,
                }))
              }
            >
              <option value="product">منتج</option>
              <option value="category">تصنيف</option>
            </select>
          </div>

          {formState.entryType === "category" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="اسم التصنيف"
                value={formState.categoryName}
                onChange={(event) => setFormState((prev) => ({ ...prev, categoryName: event.target.value }))}
              />
              <div>
                <p className="mb-1 text-xs text-slate-600">لون التصنيف</p>
                <input
                  type="color"
                  className="h-10 w-full rounded-lg border border-slate-200 p-1"
                  value={formState.categoryColor}
                  onChange={(event) => setFormState((prev) => ({ ...prev, categoryColor: event.target.value }))}
                />
              </div>
              <textarea
                className="min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="ملاحظات التصنيف"
                value={formState.categoryNotes}
                onChange={(event) => setFormState((prev) => ({ ...prev, categoryNotes: event.target.value }))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="اسم المنتج"
                value={formState.productName}
                onChange={(event) => setFormState((prev) => ({ ...prev, productName: event.target.value }))}
              />
              <input
                type="number"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="سعر المنتج"
                value={formState.price}
                onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
              />
              <input
                type="number"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="كمية المنتج"
                value={formState.quantity}
                onChange={(event) => setFormState((prev) => ({ ...prev, quantity: event.target.value }))}
              />
              <input
                type="number"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="سعر الجملة"
                value={formState.wholesalePrice}
                onChange={(event) => setFormState((prev) => ({ ...prev, wholesalePrice: event.target.value }))}
              />

              <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={formState.hasDiscount}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        hasDiscount: event.target.checked,
                        discountValue: event.target.checked ? prev.discountValue : "",
                      }))
                    }
                  />
                  <span>هل هناك خصم على المنتج؟</span>
                </label>

                {formState.hasDiscount ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      value={formState.discountType}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          discountType: event.target.value as DiscountType,
                        }))
                      }
                    >
                      <option value="percentage">نسبة مئوية</option>
                      <option value="fixed">عدد ثابت</option>
                    </select>
                    <input
                      type="number"
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="قيمة الخصم"
                      value={formState.discountValue}
                      onChange={(event) => setFormState((prev) => ({ ...prev, discountValue: event.target.value }))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2 space-y-2 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-700">صور المنتج (يمكن اختيار أكثر من صورة)</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  <span>رفع الصور</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
                </label>

                {formState.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {formState.images.map((image) => (
                      <div key={image.id} className="rounded-lg border border-slate-200 p-2">
                        <img src={image.url} alt={image.name} className="h-20 w-full rounded-md object-cover" />
                        <p className="mt-1 truncate text-xs text-slate-600">{image.name}</p>
                        <button
                          type="button"
                          className="mt-1 text-xs text-red-600 hover:underline"
                          onClick={() => removeImage(image.id)}
                        >
                          حذف الصورة
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">لا توجد صور مرفوعة.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </AppModal>
    </section>
  );
}
