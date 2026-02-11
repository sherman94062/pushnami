'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/toggles', label: 'Feature Toggles' },
  { href: '/experiments', label: 'Experiments' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <h1>Admin</h1>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'active' : ''}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
