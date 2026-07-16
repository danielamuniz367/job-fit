"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Today", href: "/" },
  { label: "All jobs", href: "/all" },
  { label: "Resumes", href: "/resumes" },
  { label: "Application History", href: "/applications-history" },
];

const SideMenu = () => {
  const pathname = usePathname();

  return (
    <nav className="flex h-screen w-44 flex-col gap-1 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-6 sticky top-0">
      <span className="px-3 pb-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        JobFit
      </span>
      {NAV_ITEMS.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default SideMenu;
