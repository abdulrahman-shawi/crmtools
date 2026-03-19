"use client";

import { useState } from "react";
import { Bell, AlertCircle, Cake, Award, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { smartNotifications } from "@/lib/data/mock-hr";

/**
 * Smart notifications page - system alerts and announcements.
 */
export default function HrNotificationsPage() {
  const [notifications, setNotifications] = useState(smartNotifications);
  const [filter, setFilter] = useState<string>("all");

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("تم تعليم جميع الإشعارات كمقروءة");
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("تم حذف الإشعار");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "all"
      ? notifications
      : filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => n.type === filter);

  const typeConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    "document-expiry": {
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      label: "انتهاء الوثائق",
      color: "border-l-red-500 bg-red-50",
    },
    birthday: {
      icon: <Cake className="h-5 w-5 text-pink-600" />,
      label: "أعياد الميلاد",
      color: "border-l-pink-500 bg-pink-50",
    },
    "work-anniversary": {
      icon: <Award className="h-5 w-5 text-gold-600" />,
      label: "ذكريات العمل",
      color: "border-l-yellow-500 bg-yellow-50",
    },
    "late-checkin": {
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
      label: "تنبيهات التأخير",
      color: "border-l-orange-500 bg-orange-50",
    },
    announcement: {
      icon: <Bell className="h-5 w-5 text-blue-600" />,
      label: "الإعلانات",
      color: "border-l-blue-500 bg-blue-50",
    },
  };

  const severityConfig: Record<
    string,
    { label: string; bgColor: string }
  > = {
    info: { label: "معلومات", bgColor: "bg-blue-100 text-blue-800" },
    warning: { label: "تحذير", bgColor: "bg-yellow-100 text-yellow-800" },
    critical: { label: "حرج", bgColor: "bg-red-100 text-red-800" },
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="التنبيهات الذكية"
        description="نظام الإشعارات التلقائي لإدارة الموارد البشرية"
      >
        <button
          onClick={markAllAsRead}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          تعليم الكل كمقروء
        </button>
      </SectionHeader>

      {/* Notification Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <DynamicCard className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">إجمالي الإشعارات</p>
              <p className="text-3xl font-bold text-blue-600">{notifications.length}</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-yellow-50 to-orange-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">غير مقروءة</p>
              <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
              <p className="text-xs text-slate-500">تحتاج لانتباهك</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-green-50 to-emerald-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">مقروءة</p>
              <p className="text-3xl font-bold text-green-600">
                {notifications.filter((n) => n.read).length}
              </p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-red-50 to-pink-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">حرجة</p>
              <p className="text-3xl font-bold text-red-600">
                {notifications.filter((n) => n.severity === "critical").length}
              </p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            filter === "unread"
              ? "bg-yellow-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          غير مقروءة ({unreadCount})
        </button>
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              filter === key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {config.icon}
            {config.label} (
            {notifications.filter((n) => n.type === key).length})
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const typeInfo = typeConfig[notification.type] || typeConfig.announcement;
            const severityInfo = severityConfig[notification.severity];

            return (
              <DynamicCard
                key={notification.id}
                className={`border-l-4 transition-all ${
                  typeInfo.color
                } ${!notification.read ? "shadow-md" : ""}`}
              >
                <DynamicCard.Content className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 flex-shrink-0">{typeInfo.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-bold ${
                              !notification.read
                                ? "text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {notification.createdAt}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              severityInfo.bgColor
                            }`}
                          >
                            {severityInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-red-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </DynamicCard.Content>
              </DynamicCard>
            );
          })
        ) : (
          <DynamicCard className="border-b border-slate-200">
            <DynamicCard.Content className="py-8 text-center">
              <p className="text-slate-600">لا توجد إشعارات</p>
            </DynamicCard.Content>
          </DynamicCard>
        )}
      </div>

      {/* Notification Preferences */}
      <DynamicCard className="bg-gradient-to-br from-slate-50 to-slate-100">
        <DynamicCard.Header
          title="⚙️ تفضيلات الإشعارات"
          description="تخصيص الإشعارات التي تريد استقبالها"
        />
        <DynamicCard.Content className="space-y-3 py-4">
          {[
            { name: "انتهاء الوثائق", enabled: true },
            { name: "أعياد الميلاد", enabled: true },
            { name: "ذكريات العمل", enabled: false },
            { name: "تنبيهات التأخير", enabled: true },
            { name: "الإعلانات العامة", enabled: true },
          ].map((pref, idx) => (
            <label key={idx} className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked={pref.enabled}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="text-sm text-slate-700">{pref.name}</span>
            </label>
          ))}
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
