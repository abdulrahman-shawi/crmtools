import type { LucideIcon } from "lucide-react";

export interface NavLink {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  icon?: LucideIcon;
  links: NavLink[];
}

export interface NavItem {
  title: string;
  href?: string;
  isMega?: boolean;
  sections?: NavSection[];
}
