
'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { navItems } from '@/lib/roles';

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const crumbs = [{ href: '/', label: 'Home' }];

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      
      const navItem = navItems.find(item => {
        return item.path === currentPath;
      });
      
      let label = navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      // A simple check for what looks like an ID or dynamic segment
      if (!navItem) {
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
          const parentNavItem = navItems.find(item => item.path === parentPath);
          if (parentNavItem) {
              const singularLabel = parentNavItem.label.endsWith('s') 
                ? parentNavItem.label.slice(0, -1) 
                : parentNavItem.label;
              label = `${singularLabel} Details`;
          } else {
              label = "Details";
          }
      }

      crumbs.push({ href: currentPath, label });
    });

    return crumbs;
  }, [pathname]);

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center space-x-1.5 text-sm md:flex">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Link
            href={crumb.href}
            className={
              index === breadcrumbs.length - 1
                ? 'font-semibold text-foreground pointer-events-none'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            {crumb.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  );
}
