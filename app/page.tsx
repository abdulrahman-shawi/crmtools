import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/config/subscription-plans";

/**
 * Renders CRM marketing landing page with subscription-first value proposition.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#022c22_0%,_#064e3b_35%,_#f0fdf4_35%,_#ecfccb_100%)] px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-[0_30px_80px_rgba(5,46,22,0.18)] backdrop-blur">
          <p className="inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Subscription-Native CRM
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            CRM قابل للتوسع
            <br />
            مصمم للـ SaaS والاشتراكات
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            بنية قابلة للنمو مع Feature Gating, Usage Limits, Plan Management, وواجهة تشغيل فعلية جاهزة للتطوير إلى Production.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              فتح لوحة التحكم
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/subscriptions"
              className="inline-flex items-center rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              إدارة الباقات
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-white/50 bg-white/85 p-6 shadow-lg backdrop-blur">
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">${plan.monthlyPrice}/month</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
