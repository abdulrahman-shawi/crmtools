"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { isColumnVisible, isFieldRequired, readGeneralPageSettings, type GeneralPageRule } from "@/lib/crm-general-settings";

type EntryType = "product" | "category";
type DiscountType = "percentage" | "fixed";
type CatalogFilter = "product" | "category";

interface WarehouseOption {
  id: string;
  name: string;
  country: string;
  notes: string;
}

interface ProductImage {
  id: string;
  name: string;
  url: string;
}

interface VariantPrice {
  id: string;
  name: string;
  price: number;
  hex?: string;
}

interface WarehouseAllocation {
  id: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

interface ProductEntry {
  id: string;
  type: "product";
  createdAt: string;
  productName: string;
  categoryName: string;
  notes: string;
  price: number;
  quantity: number;
  wholesalePrice: number;
  hasDiscount: boolean;
  discountType: DiscountType | null;
  discountValue: number;
  colors: VariantPrice[];
  sizes: VariantPrice[];
  warehouseAllocations: WarehouseAllocation[];
  images: ProductImage[];
}

interface CategoryEntry {
  id: string;
  type: "category";
  createdAt: string;
  categoryName: string;
  categoryColor: string;
  categoryNotes: string;
  categoryWarehouseId: string;
}

type CatalogEntry = ProductEntry | CategoryEntry;

interface ProductFormState {
  entryType: EntryType;
  createdAt: string;
  categoryName: string;
  categoryColor: string;
  categoryNotes: string;
  categoryWarehouseId: string;
  productName: string;
  productCategoryName: string;
  notes: string;
  price: string;
  quantity: string;
  wholesalePrice: string;
  hasDiscount: boolean;
  discountType: DiscountType;
  discountValue: string;
  colorHex: string;
  colorName: string;
  colorPrice: string;
  colors: VariantPrice[];
  sizeName: string;
  sizePrice: string;
  sizes: VariantPrice[];
  allocationWarehouseId: string;
  allocationQuantity: string;
  warehouseAllocations: WarehouseAllocation[];
  images: ProductImage[];
}

const WAREHOUSES_STORAGE_KEY = "crm-enterprise-warehouses";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";

const defaultWarehouses: WarehouseOption[] = [
  { id: "wh_1", name: "مخزن الرياض الرئيسي", country: "SA", notes: "المخزن الرئيسي" },
  { id: "wh_2", name: "مخزن جدة", country: "SA", notes: "المنطقة الغربية" },
  { id: "wh_3", name: "مخزن دبي", country: "AE", notes: "فرع الإمارات" },
];

const initialEntries: CatalogEntry[] = [
  {
    id: "cat_1",
    type: "category",
    createdAt: "2026-03-21",
    categoryName: "إلكترونيات",
    categoryColor: "#2563eb",
    categoryNotes: "تصنيف المنتجات الإلكترونية.",
    categoryWarehouseId: "wh_1",
  },
  {
    id: "prd_1",
    type: "product",
    createdAt: "2026-03-22",
    productName: "جهاز نقاط بيع",
    categoryName: "إلكترونيات",
    notes: "مناسب للمحلات ونقاط البيع الصغيرة والمتوسطة.",
    price: 1500,
    quantity: 20,
    wholesalePrice: 1300,
    hasDiscount: true,
    discountType: "percentage",
    discountValue: 10,
    colors: [
      { id: "prd_1_color_1", name: "أسود", price: 1500, hex: "#111827" },
      { id: "prd_1_color_2", name: "أبيض", price: 1550, hex: "#f8fafc" },
    ],
    sizes: [
      { id: "prd_1_size_1", name: "صغير", price: 1450 },
      { id: "prd_1_size_2", name: "كبير", price: 1600 },
    ],
    warehouseAllocations: [
      { id: "alloc_1", warehouseId: "wh_1", warehouseName: "مخزن الرياض الرئيسي", quantity: 12 },
      { id: "alloc_2", warehouseId: "wh_2", warehouseName: "مخزن جدة", quantity: 8 },
    ],
    images: [],
  },
];

const today = new Date().toISOString().slice(0, 10);

const initialFormState: ProductFormState = {
  entryType: "product",
  createdAt: today,
  categoryName: "",
  categoryColor: "#2563eb",
  categoryNotes: "",
  categoryWarehouseId: "",
  productName: "",
  productCategoryName: "",
  notes: "",
  price: "",
  quantity: "",
  wholesalePrice: "",
  hasDiscount: false,
  discountType: "percentage",
  discountValue: "",
  colorHex: "#2563eb",
  colorName: "",
  colorPrice: "",
  colors: [],
  sizeName: "",
  sizePrice: "",
  sizes: [],
  allocationWarehouseId: "",
  allocationQuantity: "",
  warehouseAllocations: [],
  images: [],
};

/**
 * Converts row data into searchable text for table search.
 */
function toSearchText(row: CatalogEntry): string {
  if (row.type === "category") {
    return `${row.categoryName} ${row.categoryColor} ${row.categoryNotes} ${row.createdAt}`;
  }

  return `${row.productName} ${row.categoryName} ${row.notes} ${row.price} ${row.quantity} ${row.createdAt} ${row.warehouseAllocations
    .map((allocation) => `${allocation.warehouseName} ${allocation.quantity}`)
    .join(" ")}`;
}

/**
 * Creates image preview objects for uploaded product images.
 */
function mapFilesToImages(files: File[]): ProductImage[] {
  return files.map((file) => ({
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    url: URL.createObjectURL(file),
  }));
}

/**
 * Builds a color or size variant with price.
 */
function buildVariant(name: string, price: number, prefix: string, hex?: string): VariantPrice {
  return {
    id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    price,
    hex,
  };
}

/**
 * Checks if date is between optional from/to boundaries.
 */
function isDateInRange(targetDate: string, fromDate: string, toDate: string): boolean {
  if (fromDate && targetDate < fromDate) {
    return false;
  }

  if (toDate && targetDate > toDate) {
    return false;
  }

  return true;
}

/**
 * Manages CRM enterprise products and categories with warehouse distribution.
 */
export function EnterpriseProductsManager() {
  const [rows, setRows] = useState<CatalogEntry[]>(initialEntries);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>(defaultWarehouses);
  const [isCatalogHydrated, setIsCatalogHydrated] = useState(false);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("product");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [pageSettings, setPageSettings] = useState<GeneralPageRule | null>(null);

  useEffect(() => {
    const settings = readGeneralPageSettings("products");
    setPageSettings(settings);
  }, []);

  const { user } = useAuth();
  const canCreate = can(user, RBAC_PERMISSIONS.productsCreate);
  const canEdit   = can(user, RBAC_PERMISSIONS.productsEdit);
  const canDelete = can(user, RBAC_PERMISSIONS.productsDelete);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(WAREHOUSES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as WarehouseOption[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWarehouses(parsed);
      }
    } catch {
      // Keep default warehouses when storage is invalid.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as CatalogEntry[];
      if (Array.isArray(parsed)) {
        setRows(parsed);
      }
    } catch {
      // Keep defaults when catalog storage is invalid.
    } finally {
      setIsCatalogHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isCatalogHydrated) {
      return;
    }

    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(rows));
  }, [rows, isCatalogHydrated]);

  const selectedProduct = useMemo(
    () => rows.find((row): row is ProductEntry => row.type === "product" && row.id === selectedProductId) ?? null,
    [rows, selectedProductId]
  );

  const categoryOptions = useMemo(
    () => rows.filter((row): row is CategoryEntry => row.type === "category"),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const typeFiltered = rows.filter((row) => row.type === catalogFilter);

    return typeFiltered.filter((row) => {
      if (!isDateInRange(row.createdAt, dateFrom, dateTo)) {
        return false;
      }

      if (warehouseFilter === "all") {
        return true;
      }

      if (row.type === "category") {
        return row.categoryWarehouseId === warehouseFilter;
      }

      return row.warehouseAllocations.some((allocation) => allocation.warehouseId === warehouseFilter);
    });
  }, [rows, catalogFilter, dateFrom, dateTo, warehouseFilter]);

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
    () => {
    const baseColumns: Array<Column<CatalogEntry> & { keyName: string }> = [
      {
        keyName: "type",
        header: "النوع",
        accessor: (row) => (row.type === "product" ? "منتج" : "تصنيف"),
      },
      {
        keyName: "name",
        header: "الاسم",
        accessor: (row) =>
          row.type === "product" ? (
            <button
              type="button"
              onClick={() => setSelectedProductId(row.id)}
              className="font-semibold text-blue-700 hover:underline"
            >
              {row.productName}
            </button>
          ) : (
            row.categoryName
          ),
      },
      {
        keyName: "details",
        header: "التفاصيل",
        accessor: (row) =>
          row.type === "product"
            ? `ألوان: ${row.colors.length} | قياسات: ${row.sizes.length} | مخازن: ${row.warehouseAllocations.length}`
            : `لون: ${row.categoryColor}`,
      },
      {
        keyName: "createdAt",
        header: "التاريخ",
        accessor: (row) => row.createdAt,
      },
      {
        keyName: "price",
        header: "السعر",
        accessor: (row) => (row.type === "product" ? row.price.toLocaleString() : "-"),
      },
      {
        keyName: "quantity",
        header: "الكمية",
        accessor: (row) => (row.type === "product" ? row.quantity : "-"),
      },
      {
        keyName: "categoryName",
        header: "التصنيف",
        accessor: (row) => (row.type === "product" ? row.categoryName || "-" : "-"),
      },
      {
        keyName: "warehouse",
        header: "المستودع",
        accessor: (row) => {
          if (row.type === "category") {
            return warehouses.find((warehouse) => warehouse.id === row.categoryWarehouseId)?.name ?? "-";
          }

          return row.warehouseAllocations.map((allocation) => allocation.warehouseName).join("، ");
        },
      },
      {
        keyName: "actions",
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => openEditModal(row)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                title="تعديل"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row)}
                className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ];

    if (!pageSettings) {
      return baseColumns.map(({ keyName: _keyName, ...column }) => column);
    }

    return baseColumns
      .filter((column) => column.keyName === "actions" || isColumnVisible(pageSettings, column.keyName))
      .map(({ keyName: _keyName, ...column }) => column);
  }, [warehouses, canEdit, canDelete, pageSettings]);

  /**
   * Opens create modal with fresh state.
   */
  function openCreateModal() {
    if (!canCreate) {
      toast.error("ليس لديك صلاحية لإضافة منتجات");
      return;
    }
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and maps existing row values to form state.
   */
  function openEditModal(row: CatalogEntry) {
    if (!canEdit) {
      toast.error("ليس لديك صلاحية لتعديل المنتجات");
      return;
    }
    if (row.type === "category") {
      setFormState({
        entryType: "category",
        createdAt: row.createdAt,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        categoryNotes: row.categoryNotes,
        categoryWarehouseId: row.categoryWarehouseId,
        productName: "",
        productCategoryName: "",
        notes: "",
        price: "",
        quantity: "",
        wholesalePrice: "",
        hasDiscount: false,
        discountType: "percentage",
        discountValue: "",
        colorHex: "#2563eb",
        colorName: "",
        colorPrice: "",
        colors: [],
        sizeName: "",
        sizePrice: "",
        sizes: [],
        allocationWarehouseId: "",
        allocationQuantity: "",
        warehouseAllocations: [],
        images: [],
      });
    } else {
      setFormState({
        entryType: "product",
        createdAt: row.createdAt,
        categoryName: "",
        categoryColor: "#2563eb",
        categoryNotes: "",
        categoryWarehouseId: "",
        productName: row.productName,
        productCategoryName: row.categoryName,
        notes: row.notes,
        price: String(row.price),
        quantity: String(row.quantity),
        wholesalePrice: String(row.wholesalePrice),
        hasDiscount: row.hasDiscount,
        discountType: row.discountType ?? "percentage",
        discountValue: row.hasDiscount ? String(row.discountValue) : "",
        colorHex: "#2563eb",
        colorName: "",
        colorPrice: "",
        colors: row.colors,
        sizeName: "",
        sizePrice: "",
        sizes: row.sizes,
        allocationWarehouseId: "",
        allocationQuantity: "",
        warehouseAllocations: row.warehouseAllocations,
        images: row.images,
      });
    }

    setEditingId(row.id);
    setIsModalOpen(true);
  }

  /**
   * Handles multiple image selection with preview generation.
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
   * Removes one image from form state.
   */
  function removeImage(imageId: string) {
    setFormState((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== imageId),
    }));
  }

  /**
   * Adds one color option with dedicated price.
   */
  function addColorOption() {
    const name = formState.colorName.trim();
    const price = Number(formState.colorPrice || 0);

    if (!name) {
      toast.error("اسم اللون مطلوب");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      toast.error("سعر اللون غير صحيح");
      return;
    }

    setFormState((prev) => ({
      ...prev,
      colorHex: "#2563eb",
      colorName: "",
      colorPrice: "",
      colors: [...prev.colors, buildVariant(name, price, "color", formState.colorHex)],
    }));
  }

  /**
   * Adds one size option with dedicated price.
   */
  function addSizeOption() {
    const name = formState.sizeName.trim();
    const price = Number(formState.sizePrice || 0);

    if (!name) {
      toast.error("اسم القياس مطلوب");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      toast.error("سعر القياس غير صحيح");
      return;
    }

    setFormState((prev) => ({
      ...prev,
      sizeName: "",
      sizePrice: "",
      sizes: [...prev.sizes, buildVariant(name, price, "size")],
    }));
  }

  /**
   * Adds allocation entry to distribute same product across warehouses.
   */
  function addWarehouseAllocation() {
    if (!formState.allocationWarehouseId) {
      toast.error("اختر مستودعًا أولاً");
      return;
    }

    const quantity = Number(formState.allocationQuantity || 0);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("كمية المستودع غير صحيحة");
      return;
    }

    const warehouse = warehouses.find((item) => item.id === formState.allocationWarehouseId);
    if (!warehouse) {
      toast.error("المستودع المحدد غير موجود");
      return;
    }

    const alreadyExists = formState.warehouseAllocations.some(
      (allocation) => allocation.warehouseId === warehouse.id
    );

    if (alreadyExists) {
      toast.error("تمت إضافة هذا المستودع مسبقًا");
      return;
    }

    setFormState((prev) => ({
      ...prev,
      allocationWarehouseId: "",
      allocationQuantity: "",
      warehouseAllocations: [
        ...prev.warehouseAllocations,
        {
          id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          quantity,
        },
      ],
    }));
  }

  /**
   * Removes one warehouse allocation from current product.
   */
  function removeWarehouseAllocation(allocationId: string) {
    setFormState((prev) => ({
      ...prev,
      warehouseAllocations: prev.warehouseAllocations.filter((allocation) => allocation.id !== allocationId),
    }));
  }

  /**
   * Removes one color option.
   */
  function removeColorOption(variantId: string) {
    setFormState((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color.id !== variantId),
    }));
  }

  /**
   * Removes one size option.
   */
  function removeSizeOption(variantId: string) {
    setFormState((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((size) => size.id !== variantId),
    }));
  }

  /**
   * Saves category or product after validating entered fields.
   */
  function handleSave() {
    if (formState.entryType === "category") {
      const categoryChecks = [
        {
          key: "categoryName",
          valid: Boolean(formState.categoryName.trim()),
          message: "اسم التصنيف مطلوب",
        },
        {
          key: "categoryWarehouseId",
          valid: Boolean(formState.categoryWarehouseId),
          message: "اختر مستودع التصنيف",
        },
      ];

      for (const check of categoryChecks) {
        if (isFieldRequired(pageSettings, check.key) && !check.valid) {
          toast.error(check.message);
          return;
        }
      }

      if (!formState.categoryName.trim()) {
        toast.error("اسم التصنيف مطلوب");
        return;
      }

      if (!formState.categoryWarehouseId) {
        toast.error("اختر مستودع التصنيف");
        return;
      }

      const categoryPayload: CategoryEntry = {
        id: editingId ?? `cat_${Date.now()}`,
        type: "category",
        createdAt: formState.createdAt || today,
        categoryName: formState.categoryName.trim(),
        categoryColor: formState.categoryColor,
        categoryNotes: formState.categoryNotes.trim(),
        categoryWarehouseId: formState.categoryWarehouseId,
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? categoryPayload : row)));
        toast.success("تم تعديل التصنيف");
      } else {
        setRows((prev) => [categoryPayload, ...prev]);
        toast.success("تمت إضافة التصنيف");
      }
    } else {
      const productChecks = [
        {
          key: "productName",
          valid: Boolean(formState.productName.trim()),
          message: "اسم المنتج مطلوب",
        },
        {
          key: "productCategoryName",
          valid: Boolean(formState.productCategoryName.trim()),
          message: "تصنيف المنتج مطلوب",
        },
      ];

      for (const check of productChecks) {
        if (isFieldRequired(pageSettings, check.key) && !check.valid) {
          toast.error(check.message);
          return;
        }
      }

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

      if (formState.hasDiscount && (Number.isNaN(discountValue) || discountValue <= 0)) {
        toast.error("قيمة الخصم غير صحيحة");
        return;
      }

      const allocatedTotal = formState.warehouseAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (allocatedTotal !== quantity) {
        toast.error("يجب أن يساوي مجموع كميات المستودعات كمية المنتج");
        return;
      }

      const productPayload: ProductEntry = {
        id: editingId ?? `prd_${Date.now()}`,
        type: "product",
        createdAt: formState.createdAt || today,
        productName: formState.productName.trim(),
        categoryName: formState.productCategoryName.trim(),
        notes: formState.notes.trim(),
        price,
        quantity,
        wholesalePrice,
        hasDiscount: formState.hasDiscount,
        discountType: formState.hasDiscount ? formState.discountType : null,
        discountValue: formState.hasDiscount ? discountValue : 0,
        colors: formState.colors,
        sizes: formState.sizes,
        warehouseAllocations: formState.warehouseAllocations,
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
   * Deletes a row after user confirmation.
   */
  function handleDelete(row: CatalogEntry) {
    if (!canDelete) {
      toast.error("ليس لديك صلاحية لحذف المنتجات");
      return;
    }
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
        description="يمكنك توزيع نفس المنتج على أكثر من مستودع مع فلاتر بحسب التاريخ والمستودع."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCatalogFilter("product");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              catalogFilter === "product" ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-700"
            }`}
          >
            عرض المنتجات
          </button>
          <button
            type="button"
            onClick={() => {
              setCatalogFilter("category");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              catalogFilter === "category" ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-700"
            }`}
          >
            عرض التصنيفات
          </button>
          {canCreate && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
              إضافة منتج أو تصنيف
            </Button>
          )}
        </div>
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
        <DynamicCard.Header
          title={catalogFilter === "product" ? "قائمة المنتجات" : "قائمة التصنيفات"}
          description="فلترة حسب التاريخ والمستودع مع بحث وتعديل وحذف."
        />
        <DynamicCard.Content className="space-y-3 pt-4">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={warehouseFilter}
              onChange={(event) => {
                setWarehouseFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">كل المستودعات</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={filteredRows}
            dir="rtl"
            pageSize={8}
            totalCount={filteredRows.length}
            currentPage={page}
            onPageChange={setPage}
            title={catalogFilter === "product" ? "المنتجات" : "التصنيفات"}
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل سجل" : "إضافة منتج أو تصنيف"}
        size="xl"
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
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
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.createdAt}
              onChange={(event) => setFormState((prev) => ({ ...prev, createdAt: event.target.value }))}
            />
          </div>

          {formState.entryType === "category" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="اسم التصنيف"
                value={formState.categoryName}
                onChange={(event) => setFormState((prev) => ({ ...prev, categoryName: event.target.value }))}
              />
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={formState.categoryWarehouseId}
                onChange={(event) => setFormState((prev) => ({ ...prev, categoryWarehouseId: event.target.value }))}
              >
                <option value="">اختر المستودع</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
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
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={formState.productCategoryName}
                onChange={(event) => setFormState((prev) => ({ ...prev, productCategoryName: event.target.value }))}
              >
                <option value="">اختر التصنيف</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.categoryName}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
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
              <textarea
                className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="ملاحظات المنتج"
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              />

              <div className="space-y-3 rounded-lg border border-slate-200 p-3 md:col-span-2">
                <p className="text-sm font-semibold text-slate-700">ألوان المنتج مع السعر</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_180px_auto]">
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-200 p-1"
                    value={formState.colorHex}
                    onChange={(event) => setFormState((prev) => ({ ...prev, colorHex: event.target.value }))}
                  />
                  <input
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="اسم اللون"
                    value={formState.colorName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, colorName: event.target.value }))}
                  />
                  <input
                    type="number"
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="سعر اللون"
                    value={formState.colorPrice}
                    onChange={(event) => setFormState((prev) => ({ ...prev, colorPrice: event.target.value }))}
                  />
                  <Button type="button" onClick={addColorOption}>إضافة لون</Button>
                </div>

                {formState.colors.length > 0 ? (
                  <div className="space-y-2">
                    {formState.colors.map((color) => (
                      <div key={color.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: color.hex ?? "#2563eb" }} />
                          <span>{color.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{color.price.toLocaleString()}</span>
                          <button type="button" className="text-red-600 hover:underline" onClick={() => removeColorOption(color.id)}>
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">لا توجد ألوان مضافة.</p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-3 md:col-span-2">
                <p className="text-sm font-semibold text-slate-700">قياسات المنتج مع السعر</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
                  <input
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="اسم القياس"
                    value={formState.sizeName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, sizeName: event.target.value }))}
                  />
                  <input
                    type="number"
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="سعر القياس"
                    value={formState.sizePrice}
                    onChange={(event) => setFormState((prev) => ({ ...prev, sizePrice: event.target.value }))}
                  />
                  <Button type="button" onClick={addSizeOption}>إضافة قياس</Button>
                </div>

                {formState.sizes.length > 0 ? (
                  <div className="space-y-2">
                    {formState.sizes.map((size) => (
                      <div key={size.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{size.name}</span>
                        <div className="flex items-center gap-3">
                          <span>{size.price.toLocaleString()}</span>
                          <button type="button" className="text-red-600 hover:underline" onClick={() => removeSizeOption(size.id)}>
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">لا توجد قياسات مضافة.</p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-3 md:col-span-2">
                <p className="text-sm font-semibold text-slate-700">توزيع المنتج على المستودعات</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    value={formState.allocationWarehouseId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, allocationWarehouseId: event.target.value }))}
                  >
                    <option value="">اختر المستودع</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="الكمية"
                    value={formState.allocationQuantity}
                    onChange={(event) => setFormState((prev) => ({ ...prev, allocationQuantity: event.target.value }))}
                  />
                  <Button type="button" onClick={addWarehouseAllocation}>إضافة مستودع</Button>
                </div>

                {formState.warehouseAllocations.length > 0 ? (
                  <div className="space-y-2">
                    {formState.warehouseAllocations.map((allocation) => (
                      <div key={allocation.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{allocation.warehouseName}</span>
                        <div className="flex items-center gap-3">
                          <span>الكمية: {allocation.quantity}</span>
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
                            onClick={() => removeWarehouseAllocation(allocation.id)}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">لم يتم توزيع المنتج على مستودعات بعد.</p>
                )}
              </div>

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

      <AppModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProductId(null)}
        title={selectedProduct ? `تفاصيل المنتج: ${selectedProduct.productName}` : "تفاصيل المنتج"}
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setSelectedProductId(null)}>
            إغلاق
          </Button>
        }
      >
        {selectedProduct ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
              <p>اسم المنتج: <span className="font-semibold">{selectedProduct.productName}</span></p>
              <p>التصنيف: <span className="font-semibold">{selectedProduct.categoryName || "غير محدد"}</span></p>
              <p>التاريخ: <span className="font-semibold">{selectedProduct.createdAt}</span></p>
              <p>السعر: <span className="font-semibold">{selectedProduct.price.toLocaleString()}</span></p>
              <p>سعر الجملة: <span className="font-semibold">{selectedProduct.wholesalePrice.toLocaleString()}</span></p>
              <p>الكمية: <span className="font-semibold">{selectedProduct.quantity}</span></p>
              <p>
                الخصم: <span className="font-semibold">{selectedProduct.hasDiscount ? (selectedProduct.discountType === "percentage" ? `${selectedProduct.discountValue}%` : `${selectedProduct.discountValue} ثابت`) : "لا يوجد"}</span>
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">الملاحظات</p>
              <p className="text-sm text-slate-600">{selectedProduct.notes || "لا توجد ملاحظات"}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">الألوان</p>
                {selectedProduct.colors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProduct.colors.map((color) => (
                      <div key={color.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: color.hex ?? "#2563eb" }} />
                          <span>{color.name}</span>
                        </div>
                        <span>{color.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد ألوان.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">القياسات</p>
                {selectedProduct.sizes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProduct.sizes.map((size) => (
                      <div key={size.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{size.name}</span>
                        <span>{size.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد قياسات.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">توزيع المستودعات</p>
              {selectedProduct.warehouseAllocations.length > 0 ? (
                <div className="space-y-2">
                  {selectedProduct.warehouseAllocations.map((allocation) => (
                    <div key={allocation.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{allocation.warehouseName}</span>
                      <span>الكمية: {allocation.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا يوجد توزيع مستودعات لهذا المنتج.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">صور المنتج</p>
              {selectedProduct.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {selectedProduct.images.map((image) => (
                    <div key={image.id} className="rounded-lg border border-slate-200 p-2">
                      <img src={image.url} alt={image.name} className="h-24 w-full rounded-md object-cover" />
                      <p className="mt-1 truncate text-xs text-slate-600">{image.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد صور للمنتج.</p>
              )}
            </div>
          </div>
        ) : null}
      </AppModal>
    </section>
  );
}
