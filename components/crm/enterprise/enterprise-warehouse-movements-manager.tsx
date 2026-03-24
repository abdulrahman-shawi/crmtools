"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2, RotateCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface WarehouseRecord {
  id: string;
  name: string;
  country: string;
  notes: string;
  createdAt: string;
}

interface WarehouseAllocation {
  id: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

interface ProductEntry {
  id: string;
  productName: string;
  categoryName: string;
  price: number;
  wholesalePrice: number;
  warehouseAllocations: WarehouseAllocation[];
}

interface WarehouseMovement {
  id: string;
  productId: string;
  productName: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantity: number;
  notes: string;
  createdAt: string;
}

interface WarehouseInventoryRow {
  id: string;
  warehouseId: string;
  warehouseName: string;
  productsCount: number;
  totalQuantity: number;
}

interface TransferFormState {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
  notes: string;
}

const WAREHOUSES_STORAGE_KEY = "crm-enterprise-warehouses";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";
const MOVEMENTS_STORAGE_KEY = "crm-enterprise-warehouse-movements";

const initialTransferFormState: TransferFormState = {
  productId: "",
  fromWarehouseId: "",
  toWarehouseId: "",
  quantity: "",
  notes: "",
};

/**
 * Manages warehouse movements and inventory transfers.
 */
export function EnterpriseWarehouseMovementsManager() {
  const { user } = useAuth();

  // Permission checks
  const canCreate = can(user, RBAC_PERMISSIONS.flowsCreate);
  const canDelete = can(user, RBAC_PERMISSIONS.flowsDelete);

  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFormState, setTransferFormState] = useState<TransferFormState>(initialTransferFormState);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Load warehouses from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(WAREHOUSES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as WarehouseRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWarehouses(parsed);
      }
    } catch {
      // Keep defaults if local data is invalid.
    }
  }, []);

  // Load products catalog from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as ProductEntry[];
      if (Array.isArray(parsed)) {
        setProducts(parsed.filter((p) => p.id && "productName" in p));
      }
    } catch {
      setProducts([]);
    }
  }, []);

  // Load movements from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as WarehouseMovement[];
      if (Array.isArray(parsed)) {
        setMovements(parsed);
      }
    } catch {
      setMovements([]);
    }
  }, []);

  // Save movements to localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  }, [movements]);

  // Calculate warehouse inventory statistics
  const inventoryStats = useMemo<WarehouseInventoryRow[]>(() => {
    return warehouses.map((warehouse) => {
      const relatedProducts = products.filter((product) =>
        product.warehouseAllocations?.some((allocation) => allocation.warehouseId === warehouse.id)
      );

      const totalQuantity = relatedProducts.reduce((sum, product) => {
        const quantityInWarehouse = (product.warehouseAllocations ?? [])
          .filter((allocation) => allocation.warehouseId === warehouse.id)
          .reduce((innerSum, allocation) => innerSum + allocation.quantity, 0);

        return sum + quantityInWarehouse;
      }, 0);

      return {
        id: warehouse.id,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productsCount: relatedProducts.length,
        totalQuantity,
      };
    });
  }, [warehouses, products]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return products;
    }
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.categoryName.toLowerCase().includes(productSearchQuery.toLowerCase())
    );
  }, [products, productSearchQuery]);

  /**
   * Gets product details including name and warehouse allocations.
   */
  function getProductDetails(productId: string) {
    return products.find((p) => p.id === productId);
  }

  /**
   * Handles product selection from search dropdown.
   */
  function handleSelectProduct(productId: string) {
    setTransferFormState((prev) => ({
      ...prev,
      productId,
      fromWarehouseId: "",
    }));
    setProductSearchQuery("");
    setShowProductDropdown(false);
  }

  /**
   * Gets available quantity of product in a warehouse.
   */
  function getProductQuantityInWarehouse(productId: string, warehouseId: string): number {
    const product = getProductDetails(productId);
    if (!product) return 0;

    const allocation = product.warehouseAllocations?.find((a) => a.warehouseId === warehouseId);
    return allocation?.quantity ?? 0;
  }

  /**
   * Handles product transfer between warehouses.
   */
  function handleTransfer() {
    if (!canCreate) {
      toast.error("ليس لديك صلاحية لإضافة حركة صندوق");
      return;
    }

    if (!transferFormState.productId || !transferFormState.fromWarehouseId || !transferFormState.toWarehouseId) {
      toast.error("الرجاء تحديد المنتج والمخازن");
      return;
    }

    if (transferFormState.fromWarehouseId === transferFormState.toWarehouseId) {
      toast.error("مخزن المصدر والمقصد يجب أن يكونا مختلفين");
      return;
    }

    const quantity = Number(transferFormState.quantity || 0);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("الكمية غير صحيحة");
      return;
    }

    const availableQuantity = getProductQuantityInWarehouse(
      transferFormState.productId,
      transferFormState.fromWarehouseId
    );

    if (quantity > availableQuantity) {
      toast.error(`الكمية المتاحة في المخزن المصدر هي ${availableQuantity}`);
      return;
    }

    const product = getProductDetails(transferFormState.productId);
    const fromWarehouse = warehouses.find((w) => w.id === transferFormState.fromWarehouseId);
    const toWarehouse = warehouses.find((w) => w.id === transferFormState.toWarehouseId);

    if (!product || !fromWarehouse || !toWarehouse) {
      toast.error("بيانات غير صحيحة");
      return;
    }

    // Update product allocations
    const updatedProducts = products.map((p) => {
      if (p.id === transferFormState.productId) {
        return {
          ...p,
          warehouseAllocations: p.warehouseAllocations.map((allocation) => {
            if (allocation.warehouseId === transferFormState.fromWarehouseId) {
              return { ...allocation, quantity: allocation.quantity - quantity };
            }
            if (allocation.warehouseId === transferFormState.toWarehouseId) {
              return { ...allocation, quantity: allocation.quantity + quantity };
            }
            return allocation;
          }),
        };
      }
      return p;
    });

    // If toWarehouse doesn't have this product, add allocation
    const hasAllocationInToWarehouse = updatedProducts
      .find((p) => p.id === transferFormState.productId)
      ?.warehouseAllocations?.some((a) => a.warehouseId === transferFormState.toWarehouseId);

    if (!hasAllocationInToWarehouse) {
      const toUpdate = updatedProducts.find((p) => p.id === transferFormState.productId);
      if (toUpdate) {
        toUpdate.warehouseAllocations.push({
          id: `alloc_${Date.now()}`,
          warehouseId: transferFormState.toWarehouseId,
          warehouseName: toWarehouse.name,
          quantity,
        });
      }
    }

    setProducts(updatedProducts);
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(updatedProducts));

    // Record the movement
    const movement: WarehouseMovement = {
      id: `mov_${Date.now()}`,
      productId: transferFormState.productId,
      productName: product.productName,
      fromWarehouseId: transferFormState.fromWarehouseId,
      fromWarehouseName: fromWarehouse.name,
      toWarehouseId: transferFormState.toWarehouseId,
      toWarehouseName: toWarehouse.name,
      quantity,
      notes: transferFormState.notes,
      createdAt: new Date().toISOString(),
    };

    setMovements((prev) => [movement, ...prev]);
    toast.success("تم نقل المنتج بنجاح");
    setTransferFormState(initialTransferFormState);
    setIsTransferModalOpen(false);
  }

  /**
   * Deletes a movement record.
   */
  function handleDeleteMovement(movement: WarehouseMovement) {
    if (!canDelete) {
      toast.error("ليس لديك صلاحية لحذف حركات الصندوق");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف هذه الحركة؟");
    if (!confirmed) {
      return;
    }

    setMovements((prev) => prev.filter((m) => m.id !== movement.id));
    toast.success("تم حذف الحركة");
  }

  // Warehouse inventory columns
  const inventoryColumns = useMemo<Column<WarehouseInventoryRow>[]>(
    () => [
      { header: "اسم المخزن", accessor: "warehouseName" },
      { header: "عدد المنتجات", accessor: "productsCount" },
      { header: "إجمالي الكمية", accessor: "totalQuantity" },
    ],
    []
  );

  // Movements history columns
  const movementsColumns = useMemo<Column<WarehouseMovement>[]>(
    () => [
      { header: "المنتج", accessor: "productName" },
      {
        header: "من المخزن",
        accessor: (row) => (
          <div className="flex items-center gap-2">
            <span>{row.fromWarehouseName}</span>
          </div>
        ),
      },
      {
        header: "إلى المخزن",
        accessor: (row) => (
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span>{row.toWarehouseName}</span>
          </div>
        ),
      },
      { header: "الكمية", accessor: "quantity" },
      {
        header: "التاريخ",
        accessor: (row) => new Date(row.createdAt).toLocaleDateString("ar-SA"),
      },
      {
        header: "الإجراءات",
        accessor: (row) => (
          canDelete ? (
            <button
              onClick={() => handleDeleteMovement(row)}
              className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null
        ),
      },
    ],
    [canDelete]
  );

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="حركات الصندوق وانتقالات المخزون"
        description="إدارة انتقالات المنتجات والمواد بين المخازن المختلفة ومتابعة حركات المخزون."
      >
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsTransferModalOpen(true)}>
            إضافة نقل
          </Button>
        )}
      </SectionHeader>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي المخازن</p>
            <p className="text-3xl font-bold text-blue-600">{warehouses.length}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي المنتجات</p>
            <p className="text-3xl font-bold text-emerald-600">{products.length}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-amber-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد الحركات</p>
            <p className="text-3xl font-bold text-amber-600">{movements.length}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      {/* Warehouse Inventory Table */}
      <DynamicCard>
        <DynamicCard.Header title="جرد المخازن" description="ملخص الكميات والمنتجات بكل مخزن." />
        <DynamicCard.Content className="pt-4">
          <DataTable 
            columns={inventoryColumns} 
            data={inventoryStats} 
            pageSize={10}
            currentPage={inventoryPage}
            totalCount={inventoryStats.length}
            onPageChange={setInventoryPage}
          />
        </DynamicCard.Content>
      </DynamicCard>

      {/* Warehouse Allocations Details */}
      <DynamicCard>
        <DynamicCard.Header
          title="توزيع المنتجات على المخازن"
          description="عرض تفصيلي لوجود كل منتج في كل مخزن."
        />
        <DynamicCard.Content className="pt-4">
          <div className="space-y-6">
            {warehouses.length === 0 ? (
              <p className="text-center text-slate-500">لا توجد مخازن متاحة</p>
            ) : (
              warehouses.map((warehouse) => {
                const warehouseProducts = products.filter((product) =>
                  product.warehouseAllocations?.some((allocation) => allocation.warehouseId === warehouse.id)
                );

                return (
                  <div key={warehouse.id} className="rounded-lg border border-slate-200 p-4">
                    <h3 className="mb-3 font-semibold text-slate-800">{warehouse.name}</h3>
                    {warehouseProducts.length === 0 ? (
                      <p className="text-sm text-slate-500">لا توجد منتجات في هذا المخزن</p>
                    ) : (
                      <div className="space-y-2">
                        {warehouseProducts.map((product) => {
                          const allocation = product.warehouseAllocations?.find(
                            (a) => a.warehouseId === warehouse.id
                          );

                          return (
                            <div key={product.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{product.productName}</p>
                                <p className="text-xs text-slate-500">{product.categoryName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-blue-600">الكمية: {allocation?.quantity ?? 0}</p>
                                <p className="text-xs text-slate-500">السعر: {product.price.toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      {/* Movements History */}
      <DynamicCard>
        <DynamicCard.Header title="سجل الحركات" description="تاريخ انتقالات المخزون بين المخازن." />
        <DynamicCard.Content className="pt-4">
          {movements.length === 0 ? (
            <p className="text-center text-slate-500">لا توجد حركات بعد</p>
          ) : (
            <DataTable 
              columns={movementsColumns} 
              data={movements} 
              pageSize={10}
              currentPage={movementsPage}
              totalCount={movements.length}
              onPageChange={setMovementsPage}
            />
          )}
        </DynamicCard.Content>
      </DynamicCard>

      {/* Transfer Modal */}
      <AppModal
        title="نقل المنتج بين المخازن"
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferFormState(initialTransferFormState);
          setProductSearchQuery("");
          setShowProductDropdown(false);
        }}
      >
        <div className="space-y-4">
          {/* Product Selection with Search */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-800 mb-2">المنتج</label>
            <input
              type="text"
              placeholder="ابحث عن المنتج..."
              value={productSearchQuery}
              onChange={(event) => {
                setProductSearchQuery(event.target.value);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            />
            
            {/* Dropdown List */}
            {showProductDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500">لا توجد منتجات مطابقة</div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product.id)}
                      className="w-full text-right px-3 py-2 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-800">{product.productName}</div>
                      <div className="text-xs text-slate-500">{product.categoryName}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Show selected product */}
            {transferFormState.productId && !productSearchQuery && (
              <div className="mt-2 text-sm text-blue-600">
                ✓ المنتج المختار: {getProductDetails(transferFormState.productId)?.productName}
              </div>
            )}
          </div>

          {/* Source Warehouse Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">مخزن المصدر</label>
            <select
              value={transferFormState.fromWarehouseId}
              onChange={(event) =>
                setTransferFormState((prev) => ({
                  ...prev,
                  fromWarehouseId: event.target.value,
                }))
              }
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">اختر المخزن الأول</option>
              {transferFormState.productId &&
                products
                  .find((p) => p.id === transferFormState.productId)
                  ?.warehouseAllocations?.map((allocation) => (
                    <option key={allocation.warehouseId} value={allocation.warehouseId}>
                      {allocation.warehouseName} (متاح: {allocation.quantity})
                    </option>
                  ))}
            </select>
          </div>

          {/* Destination Warehouse Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">مخزن القصد</label>
            <select
              value={transferFormState.toWarehouseId}
              onChange={(event) =>
                setTransferFormState((prev) => ({
                  ...prev,
                  toWarehouseId: event.target.value,
                }))
              }
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">اختر المخزن الثاني</option>
              {warehouses
                .filter((w) => w.id !== transferFormState.fromWarehouseId)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              الكمية
              {transferFormState.fromWarehouseId && transferFormState.productId && (
                <span className="text-xs text-blue-600">
                  {" "}
                  (متاح:{" "}
                  {getProductQuantityInWarehouse(
                    transferFormState.productId,
                    transferFormState.fromWarehouseId
                  )})
                </span>
              )}
            </label>
            <input
              type="number"
              min="1"
              value={transferFormState.quantity}
              onChange={(event) =>
                setTransferFormState((prev) => ({
                  ...prev,
                  quantity: event.target.value,
                }))
              }
              placeholder="أدخل الكمية"
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">ملاحظات</label>
            <textarea
              value={transferFormState.notes}
              onChange={(event) =>
                setTransferFormState((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              placeholder="أضف ملاحظات إضافية"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleTransfer} className="flex-1">
              <RotateCw className="h-4 w-4" />
              نقل المنتج
            </Button>
            <Button
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferFormState(initialTransferFormState);
              }}
              variant="secondary"
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
