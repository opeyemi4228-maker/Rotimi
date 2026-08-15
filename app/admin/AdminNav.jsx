"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutGrid,
  MapPin,
  Network,
  Radio,
  Share2,
  ShieldCheck,
  Gauge,
  MessageSquare,
  UserCheck,
  UserPlus,
  Users,
  Vote,
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
 *   Console           only for a scope that reads nationwide, because every
 *                     query behind it is unscoped.
 *   Bulk SMS          only for a scope that carries the broadcast capability —
 *                     an admin coordinator, not a functional director.
 *   File a return     only for a Polling Unit Coordinator. Everybody above them
 *                     views results; nobody above them enters one.
 */
const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  /* Election day, and the two halves of it are deliberately separate entries.

     "File a return" is the only doing surface in the whole secretariat, and it
     belongs to exactly one office: the Polling Unit Coordinator standing at the
     booth. Nobody above them may enter a result — a National Coordinator typing
     a number into a system whose whole claim is "these came from our agents at
     the booths" would destroy the thing the system is for. So the entry is not
     shown to anybody else, and the form refuses them server-side as well.

     "Live results" is the reading surface, and it is for everybody with a seat.
     The query behind it is cut to the reader's territory by resultScope(): the
     federation for a National Coordinator, one state for a State Coordinator,
     one ward for a Ward Coordinator. */
  { href: "/admin/results", label: "Live results", icon: Radio },
  { href: "/admin/election", label: "File a return", icon: Vote, agent: true },
  { href: "/admin/leadership", label: "Coordinator Directory", icon: UserCheck },
  /* Shown to everybody with a seat; the page itself 404s for an office that
     appoints to nothing, because isApproverFor() is the only thing that
     decides and it needs the seats to answer. */
  { href: "/admin/appointments", label: "Appointments", icon: UserPlus },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/lga-coordinators", label: "LGA Coordinators", icon: Network, regional: true },
  { href: "/admin/referrals", label: "Referrals", icon: Share2 },
  /* Only for a scope that speaks for a territory. A functional director reads
     nationwide but broadcasts nowhere, and §6.11 says so through `broadcast`. */
  { href: "/admin/broadcast", label: "Bulk SMS", icon: MessageSquare, broadcaster: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/polling-units", label: "PU Tracker", icon: MapPin, local: true },
  { href: "/admin/structure", label: "Structure", icon: Network },
  { href: "/admin/id-card", label: "ID Card", icon: CreditCard },
  /* Your own account, not anybody else's. Open to every seat: two-factor is
     obligatory from state level up and available to all. */
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
  /* Last, and only for a scope that reads nationwide. It is the one page in the
     secretariat with no territory filter on any of its queries, so it is not
     advertised to anybody who would be refused it. */
  { href: "/admin/console", label: "Console", icon: Gauge, nationwide: true },
];

/**
 * `local` and `regional` are decided on the server from the seat and handed
 * down as booleans. The icons cannot cross that boundary — they are functions —
 * so the list lives here and the server sends only the facts that change it.
 */
function itemsFor({ local, regional, nationwide, broadcaster, agent }) {
  return ITEMS.filter((item) => {
    if (item.local && !local) return false;
    if (item.regional && !regional) return false;
    if (item.nationwide && !nationwide) return false;
    if (item.broadcaster && !broadcaster) return false;
    if (item.agent && !agent) return false;
    return true;
  });
}

/** Phone: a scrolling row above the content. */
export default function AdminNav({ local, regional, nationwide, broadcaster, agent }) {
  const pathname = usePathname();
  const items = itemsFor({ local, regional, nationwide, broadcaster, agent });

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
export function AdminRail({ local, regional, nationwide, broadcaster, agent }) {
  const pathname = usePathname();
  const items = itemsFor({ local, regional, nationwide, broadcaster, agent });

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
