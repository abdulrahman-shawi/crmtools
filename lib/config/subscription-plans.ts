import type { SubscriptionPlan } from "@/lib/types/crm";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ["team_management"],
    limits: {
      maxUsers: 3,
      maxCustomers: 300,
      maxDealsPerMonth: 500,
      maxBranches: 1,
    },
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: ["team_management", "advanced_reports", "pipeline_automation", "multi_branch"],
    limits: {
      maxUsers: 15,
      maxCustomers: 5000,
      maxDealsPerMonth: 12000,
      maxBranches: 5,
    },
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      "team_management",
      "advanced_reports",
      "pipeline_automation",
      "multi_branch",
      "api_access",
      "priority_support",
    ],
    limits: {
      maxUsers: 100,
      maxCustomers: 100000,
      maxDealsPerMonth: 250000,
      maxBranches: 30,
    },
  },
];
