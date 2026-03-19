import { notFound } from "next/navigation";
import { EnterpriseModuleManager } from "@/components/crm/enterprise-module-manager";
import { crmEnterpriseModules, crmEnterpriseNavigation } from "@/lib/data/mock-crm-enterprise";

interface CrmEnterpriseModulePageProps {
  params: {
    module: string;
  };
}

/**
 * Generates static params for all CRM enterprise modules.
 */
export function generateStaticParams() {
  return crmEnterpriseNavigation.map((item) => ({ module: item.slug }));
}

/**
 * Renders selected CRM enterprise module page.
 */
export default function CrmEnterpriseModulePage({ params }: CrmEnterpriseModulePageProps) {
  const currentModule = crmEnterpriseModules[params.module as keyof typeof crmEnterpriseModules];

  if (!currentModule) {
    notFound();
  }

  return <EnterpriseModuleManager module={currentModule} />;
}
