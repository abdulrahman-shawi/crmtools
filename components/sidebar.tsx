"use client";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/utils";
import { 
  BarChart2, Users, ChevronRight, ChevronLeft,
  Download,
  LogOut,
  CreditCard,
  LayoutGrid,
  TrendingUp,
  UserCog,
  CalendarDays,
  Wallet,
  ShieldCheck,
  BriefcaseBusiness,
  Building2,
  Boxes,
  Activity,
  Tags,
  ClipboardList,
  Receipt,
  WalletCards,
  Warehouse,
  Truck,
  FileSpreadsheet,
  Undo2,
  KanbanSquare,
  ListTodo
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

type MenuItem = {
  icon: any;
  label: string;
  href: string;
};

type MenuGroup = {
  group: string;
  items: MenuItem[];
};

/**
 * Narrows filtered menu candidates into concrete MenuItem objects.
 */
const isMenuItem = (item: MenuItem | false | null | undefined): item is MenuItem => Boolean(item);


export const Sidebar = ({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (val: boolean) => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // التقاط beforeinstallprompt event والكشف عن iOS
  useEffect(() => {
    // كشف iOS
    const isAppleOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    setIsIOS(isAppleOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast.error("لا يمكن تثبيت التطبيق في الوقت الحالي");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast.success("تم تثبيت التطبيق بنجاح!");
      setCanInstall(false);
      setDeferredPrompt(null);
    } else {
      toast.error("تم إلغاء التثبيت");
    }
  };

  const handleIOSInstall = () => {
    toast.custom((t) => (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-w-xs text-right">
        <p className="font-bold text-slate-900 dark:text-white mb-2">تثبيت على iPhone</p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside mb-3">
          <li>اضغط على زر المشاركة <span className="inline-block">⬆️</span></li>
          <li>اختر "أضف إلى شاشتك الرئيسية"</li>
          <li>اضغط "إضافة"</li>
        </ol>
        <button 
          onClick={() => toast.dismiss(t.id)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          حسناً
        </button>
      </div>
    ), { duration: 5000, position: "top-center" });
  };
  // تنظيم الروابط في مجموعات لسهولة القراءة
  const menuGroups: MenuGroup[] = user ? [
    {
      group: "الرئيسية",
      items: [
        { icon: LayoutGrid, label: "لوحة التحكم", href: "/dashboard" },
        (user && hasAnyPermission(user, ["viewCustomers", "addCustomers", "editCustomers", "deleteCustomers"])) &&
        { icon: Users, label: "العملاء", href: "/dashboard/customers" },
      ].filter(isMenuItem)
    },
    {
      group: "المبيعات والاشتراكات",
      items : [
        (user && hasAnyPermission(user, ["viewAnalytics"])) &&
        { icon: BarChart2, label: "المؤشرات", href: "/dashboard" },
        (user && hasAnyPermission(user, ["viewOrders", "addOrders", "editOrders", "deleteOrders", "viewAnalytics"])) &&
        { icon: TrendingUp, label: "المبيعات", href: "/dashboard/sales" },
        { icon: CreditCard, label: "الاشتراكات", href: "/dashboard/subscriptions" },
].filter(isMenuItem) // هذا السطر هو الأهم: يقوم بحذف أي قيمة false من المصفوفة
    },
    {
      group: "الموارد البشرية",
      items: [
        { icon: UserCog, label: "نظرة عامة", href: "/dashboard/hr" },
        { icon: Users, label: "الموظفون", href: "/dashboard/hr/employees" },
        { icon: ShieldCheck, label: "صلاحيات الفريق", href: "/dashboard/hr/team-permissions" },
        { icon: CalendarDays, label: "الحضور", href: "/dashboard/hr/attendance" },
        { icon: Wallet, label: "الرواتب", href: "/dashboard/hr/payroll" },
        { icon: BriefcaseBusiness, label: "التوظيف", href: "/dashboard/hr/recruitment" },
        { icon: CalendarDays, label: "الإجازات", href: "/dashboard/hr/leaves" },
        { icon: TrendingUp, label: "الأداء", href: "/dashboard/hr/performance" },
        { icon: Users, label: "التدريب", href: "/dashboard/hr/training" },
        { icon: UserCog, label: "الخدمة الذاتية", href: "/dashboard/hr/self-service" },
        { icon: Download, label: "التنبيهات", href: "/dashboard/hr/notifications" },
      ].filter(isMenuItem),
    },
    {
      group: "CRM متقدم",
      items: [
        { icon: LayoutGrid, label: "نظرة عامة CRM", href: "/dashboard/crm-enterprise" },
        { icon: Building2, label: "إضافة العملاء", href: "/dashboard/crm-enterprise/customers" },
        { icon: Boxes, label: "المنتجات و التصنيفات", href: "/dashboard/crm-enterprise/products" },
        { icon: ClipboardList, label: "الطلبات", href: "/dashboard/crm-enterprise/orders" },
        { icon: Receipt, label: "المصاريف", href: "/dashboard/crm-enterprise/expenses" },
        { icon: WalletCards, label: "حركة الصندوق", href: "/dashboard/crm-enterprise/cash-movements" },
        { icon: Warehouse, label: "المخازن", href: "/dashboard/crm-enterprise/warehouses" },
        { icon: Truck, label: "شركات الشحن", href: "/dashboard/crm-enterprise/shipping-companies" },
        { icon: KanbanSquare, label: "الفرص البيعية", href: "/dashboard/crm-enterprise/opportunities" },
        { icon: Undo2, label: "المرتجعات", href: "/dashboard/crm-enterprise/returns" },
        { icon: ListTodo, label: "مهام الفرق", href: "/dashboard/crm-enterprise/tasks" },
      ],
    },
  ].filter(group => group.items.length > 0) : [];

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
      toast.success("نراك قريباً!");
    } catch (error) {
        toast.error("حدث خطأ أثناء محاولة تسجيل الخروج");
    }
};
  return (
    <aside className={`
        fixed md:sticky top-0 right-0 h-screen z-[70] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800
        flex flex-col shadow-2xl md:shadow-none no-scrollbar
        ${isCollapsed 
          ? "w-[280px] translate-x-full md:translate-x-0 md:w-[88px]" 
          : "w-[280px] translate-x-0"}
      `}>
        
        {/* زر التحكم في العرض (للكمبيوتر فقط) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute ${isCollapsed? "left-[11px] md:-left-4" : "-left-4"} top-10 flex h-7 w-7 items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform z-[80]`}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* الشعار - Logo Section */}
        <div className="h-20 flex items-center px-6 mb-4 border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center gap-3 min-w-max">
            <div className="h-11 w-28 bg-gradient-to-br rounded-xl flex items-center justify-center shrink-0">
              <img src="/skynova-dark.png" alt="Logo" className="w-28 h-7 object-contain brightness-0 invert dark:block" />
              {/* <img src="/3-removebg-preview.png" alt="Logo" className="w-28 h-7 object-contain brightness-0 invert" /> */}
            </div>
            <div className={`transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-4" : "opacity-100"}`}>
              <h1 className="font-black text-lg tracking-tight text-slate-800 dark:text-white">Skynova</h1>
              <p className="text-[10px] text-blue-500 font-bold uppercase">إدارة متكاملة</p>
            </div>
          </div>
        </div>

        {/* القائمة - Navigation Content */}
        {user && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 space-y-8 custom-scrollbar no-scrollbar">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <p className={`px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[2px] transition-opacity duration-300 ${isCollapsed ? "md:opacity-0" : "opacity-100"}`}>
                  {group.group}
                </p>
                
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => window.innerWidth < 768 && setIsCollapsed(true)}
                        className={`
                          relative flex items-center gap-4 h-12 px-4 rounded-xl transition-all duration-300 group
                          ${isActive 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                        `}
                      >
                        <item.icon size={22} className={`shrink-0 ${isActive ? "animate-pulse" : "group-hover:scale-110 transition-transform"}`} />
                        
                        <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-10" : "opacity-100"}`}>
                          {item.label}
                        </span>

                        {/* Tooltip في حالة التصغير (Desktop) */}
                        {isCollapsed && (
                          <div className="hidden md:block absolute right-full mr-6 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all pointer-events-none shadow-2xl">
                            {item.label}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* الجزء السفلي - Footer Section */}
        <div className="p-4 mt-auto space-y-3">
          {/* زر تثبيت التطبيق */}
          {(canInstall || isIOS) && (
            <button 
              onClick={isIOS ? handleIOSInstall : handleInstallApp}
              className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-bold text-sm ${isCollapsed ? "md:h-10 md:w-10 md:mx-auto md:p-0" : "px-3"}`}
              title={isIOS ? "تثبيت التطبيق على iPhone" : "تثبيت التطبيق على الجهاز"}
            >
              <Download size={18} />
              {!isCollapsed && <span className="text-left w-full">{isIOS ? "تثبيت على iPhone" : "تنزيل التطبيق"}</span>}
            </button>
          )}

          <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 transition-all ${isCollapsed ? "md:p-2" : "p-3"}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
                 <span className="font-bold text-blue-600 text-sm">A</span>
              </div>
              <div className={`transition-all duration-300 ${isCollapsed ? "md:hidden" : "block"}`}>
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user?.username}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{user?.email}</p>
              </div>
            </div>
            
            <button onClick={handleLogout} className={`mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ${isCollapsed ? "md:h-10 md:w-10 md:mx-auto md:p-0" : "px-3"}`}>
              <LogOut size={18} />
              {!isCollapsed && <span className="font-bold text-xs text-left w-full">خروج</span>}
            </button>
          </div>
        </div>
      </aside>
  );
};