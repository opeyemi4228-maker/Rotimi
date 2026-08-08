"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutGrid,
  MapPin,
  Network,
  Share2,
  UserCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What a coordinator can reach, by tier.
 *
 * Every entry lands on a page that exists and reads real data — there are no
 * placeholders in this list. A rail that advertises a destination before it is
 * built makes a Ward Coordinator click, find nothing, and stop trusting the
 * next one.
 *
 * Two entries are tier-conditional, because at the wrong tier they are not
 * tools:
 *
 *   LGA Coordinators  only above LGA level. An LGA Coordinator has no LGA
 *                     coordinators beneath them, and a Ward Coordinator has
 *                     nobody at all.
 *   PU Tracker        only at LGA and Ward. The 40 polling units in a ward are
 *                     a working list; the 176,623 in the country are not.
 */
const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/leadership", label: "Coordinator Directory", icon: UserCheck },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/lga-coordinators", label: "LGA Coordinators", icon: Network, regional: true },
  { href: "/admin/referrals", label: "Referrals", icon: Share2 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/polling-units", label: "PU Tracker", icon: MapPin, local: true },
  { href: "/admin/structure", label: "Structure", icon: Network },
  { href: "/admin/id-card", label: "ID Card", icon: CreditCard },
];

/**
 * `local` and `regional` are decided on the server from the seat and handed
 * down as booleans. The icons cannot cross that boundary — they are functions —
 * so the list lives here and the server sends only the facts that change it.
 */
function itemsFor({ local, regional }) {
  return ITEMS.filter((item) => {
    if (item.local && !local) return false;
    if (item.regional && !regional) return false;
    return true;
  });
}

/** Phone: a scrolling row above the content. */
export default function AdminNav({ local, regional }) {
  const pathname = usePathname();
  const items = itemsFor({ local, regional });

  return (
    <nav
      aria-label="Secretariat"
      /* Nothing may hang outside this box in either axis: `overflow-x: auto`
         forces `overflow-y` to `auto` too, and a child 2px below the content
         box makes the row shudder on hover as the two scrollbars trigger each
         other. */
      className="flex gap-1 overflow-x-auto border-b-2 border-ink-950 bg-white px-3 lg:hidden"
    >
      {items.map((item) => (
        <Tab key={item.href} item={item} pathname={pathname} orientation="horizontal" />
      ))}
    </nav>
  );
}

/** Desk: the rail. */
export function AdminRail({ local, regional }) {
  const pathname = usePathname();
  const items = itemsFor({ local, regional });

  return (
    <nav aria-label="Secretariat" className="flex flex-col gap-0.5 px-3">
      {items.map((item) => (
        <Tab key={item.href} item={item} pathname={pathname} orientation="vertical" />
      ))}
    </nav>
  );
}

function Tab({ item, pathname, orientation }) {
  // "/admin" would otherwise match every child route.
  const active =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
  const Icon = item.icon;
  const vertical = orientation === "vertical";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex shrink-0 items-center gap-3 font-bold tracking-[0.06em] uppercase transition-colors",
        vertical
          ? "px-4 py-2.5 text-[0.6875rem]"
          : "px-4 py-3.5 text-[0.6875rem] tracking-[0.08em]",
        active
          ? vertical
            ? "bg-ink-950 text-white"
            : "text-ink-950"
          : "text-ink-500 hover:bg-ink-50 hover:text-ink-950"
      )}
    >
      <Icon size={15} strokeWidth={2.5} className="shrink-0" />
      {item.label}
      {active && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute bg-ember-500",
            vertical ? "inset-y-0 left-0 w-1" : "inset-x-0 bottom-0 h-1"
          )}
        />
      )}
    </Link>
  );
}
