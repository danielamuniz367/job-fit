"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Jobs", href: "/" },
  { label: "Resumes", href: "/resumes" },
  { label: "Application History", href: "/applications-history" },
];

const SideMenu = () => {
  const pathname = usePathname();

  return (
    <nav className="flex h-screen w-fit flex-col gap-1 border-r border-zinc-200 bg-white px-3 py-6 sticky top-0">
      {NAV_ITEMS.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
