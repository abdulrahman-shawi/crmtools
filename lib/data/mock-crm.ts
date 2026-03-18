import type { Customer, SalesStatusSummary, Tenant } from "@/lib/types/crm";

export const demoTenant: Tenant = {
  id: "tenant_acme_001",
  slug: "acme-electronics",
  name: "ACME Electronics",
  industry: "Retail",
  subscription: {
    planId: "growth",
    status: "active",
    renewsAt: "2026-06-01",
    startedAt: "2025-06-01",
  },
  usage: {
    users: 9,
    customers: 1820,
    dealsThisMonth: 3240,
    branches: 3,
  },
};

export const demoCustomers: Customer[] = [
  {
    id: "c_1001",
    name: "Nour Trading",
    email: "ops@nourtrading.com",
    phone: "+201005556661",
    city: "Cairo",
    status: "customer",
    annualValue: 42500,
    createdAt: "2025-11-04",
  },
  {
    id: "c_1002",
    name: "Horizon Tech",
    email: "sales@horizontech.io",
    phone: "+966501245678",
    city: "Riyadh",
    status: "qualified",
    annualValue: 23000,
    createdAt: "2026-01-13",
  },
  {
    id: "c_1003",
    name: "SmartBuild",
    email: "ceo@smartbuild.me",
    phone: "+971552221199",
    city: "Dubai",
    status: "lead",
    annualValue: 8700,
    createdAt: "2026-02-08",
  },
  {
    id: "c_1004",
    name: "Pulse Pharmacy",
    email: "it@pulsepharmacy.net",
    phone: "+96590044321",
    city: "Kuwait City",
    status: "customer",
    annualValue: 53800,
    createdAt: "2025-08-22",
  },
  {
    id: "c_1005",
    name: "Green Foods",
    email: "procurement@greenfoods.co",
    phone: "+97455550044",
    city: "Doha",
    status: "qualified",
    annualValue: 19500,
    createdAt: "2025-12-17",
  },
];

export const salesStatusSummary: SalesStatusSummary[] = [
  { status: "won", _sum: { finalAmount: 128000 } },
  { status: "pending", _sum: { finalAmount: 76000 } },
  { status: "lost", _sum: { finalAmount: 21000 } },
  { status: "renewal", _sum: { finalAmount: 43000 } },
];
