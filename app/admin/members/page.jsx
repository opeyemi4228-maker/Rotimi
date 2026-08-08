import Link from "next/link";
import { Search } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { currentSession } from "@/lib/session";
import { members } from "@/lib/dashboard";
import { PageTitle, Table, Row, Cell, Empty, Tag } from "../ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function MembersPage({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q ?? "");
  const page = Math.max(1, Number(params?.page ?? 1) || 1);

  const { scope } = await currentSession();
  const result = await members(scope, { q, page, perPage: PER_PAGE });

  const href = (n) => `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  return (
    <>
      <PageTitle
        title="Members"
        lead={`Every registered member in ${scope.label}. ${result.total.toLocaleString()} in total.`}
      />

      {/* A plain GET form: it works with JavaScript disabled, which §5.4 asks
          for, and it makes the search shareable as a URL. */}
      <form method="get" className="mb-6 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, membership number or phone"
            aria-label="Search members"
            className="h-12 w-full border-2 border-ink-200 bg-white pr-4 pl-11 text-[0.875rem] text-ink-950 focus:border-brand-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 border-2 border-ink-950 bg-ink-950 px-5 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase"
        >
          Search
        </button>
      </form>

      <Table
        head={[
          { label: "Member" },
          { label: "Membership no." },
          { label: "Phone" },
          { label: "Ward" },
          { label: "Office" },
          { label: "Brought in", align: "right" },
          { label: "Status" },
        ]}
        empty={
          result.rows.length === 0 && (
            <Empty>
              {q
                ? `No member in ${scope.label} matches “${q}”.`
                : `No members have registered in ${scope.label} yet.`}
            </Empty>
          )
        }
      >
        {result.rows.map((m) => (
          <Row key={m.id}>
            {/* Face beside name. A register of 92,000 rows is easier to hold a
                conversation about when the person is recognisable, and the
                blank monogram is itself useful — it is the visible difference
                between a member who has completed their profile and one who
                has not. */}
            {/* The name is the way in. Everything a coordinator wants next —
                where this member votes, who invited them, who they have
                invited — is one click away rather than a second search. */}
            <Cell>
              <Link
                href={`/admin/members/${m.id}`}
                className="group flex items-center gap-3"
              >
                <Avatar name={m.name} src={m.photoUrl} size="xs" ring={false} />
                <span className="font-semibold group-hover:text-brand-700 group-hover:underline group-hover:underline-offset-2">
                  {m.name}
                </span>
              </Link>
            </Cell>
            <Cell className="tabular-nums text-content-muted">
              {m.membershipNo ?? <span className="text-ink-400">Not yet issued</span>}
            </Cell>
            <Cell className="tabular-nums text-content-muted">{m.phone}</Cell>
            <Cell className="text-content-muted">
              {m.ward}
              <span className="block text-[0.75rem] text-ink-400">
                {m.lga}, {m.state}
              </span>
            </Cell>
            <Cell>
              {m.office ? (
                <span className="font-semibold">{m.office}</span>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </Cell>
            <Cell align="right">
              {m.referrals > 0 ? (
                <span className="font-bold text-ink-950">{m.referrals.toLocaleString()}</span>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </Cell>
            <Cell>
              {/* §7.2: only Verified members may hold office at LGA level and
                  above, so verification is the status that matters here. */}
              <Tag tone={m.verification === "VERIFIED" ? "verified" : m.verification === "REJECTED" ? "rejected" : "pending"}>
                {m.verification}
              </Tag>
            </Cell>
          </Row>
        ))}
      </Table>

      {result.pages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
          <p className="text-[0.8125rem] text-content-subtle">
            Page {result.page} of {result.pages}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={href(result.page - 1)}
                className="border-2 border-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
              >
                Previous
              </Link>
            )}
            {result.page < result.pages && (
              <Link
                href={href(result.page + 1)}
                className="border-2 border-ink-950 bg-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
