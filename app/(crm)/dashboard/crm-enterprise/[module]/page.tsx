import { notFound } from "next/navigation";
import { EnterpriseModuleManager } from "@/components/crm/enterprise-module-manager";
import { crmEnterpriseModules, crmEnterpriseNavigation } from "@/lib/data/mock-crm-enterprise";

interface CrmEnterpriseModulePageProps {
  params: {
    module: string;
  };
}

const dedicatedModuleSlugs = new Set(["customers", "products", "warehouses", "orders", "shipping-companies"]);

/**
 * Generates static params for all CRM enterprise modules.
 */
export function generateStaticParams() {
  return crmEnterpriseNavigation
    .filter((item) => !dedicatedModuleSlugs.has(item.slug))
    .map((item) => ({ module: item.slug }));
}

/**
 * Renders selected CRM enterprise module page.
 */
export default function CrmEnterpriseModulePage({ params }: CrmEnterpriseModulePageProps) {
  if (dedicatedModuleSlugs.has(params.module)) {
    notFound();
  }

  const currentModule = crmEnterpriseModules[params.module as keyof typeof crmEnterpriseModules];

  if (!currentModule) {
    notFound();
  }

  return <EnterpriseModuleManager module={currentModule} />;
}
