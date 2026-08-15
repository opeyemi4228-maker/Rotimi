import { currentSession } from "@/lib/session";
import { mfaRequired, mfaState } from "@/lib/mfa";
import { PageTitle } from "../ui";
import MfaPanel from "./MfaPanel";

export const metadata = { title: "Security — MAP Secretariat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The account's own security settings.
 *
 * Reachable by anybody with a seat — two-factor is open to every coordinator,
 * and only obligatory from state level up. The obligation is stated here rather
 * than only enforced, because a control somebody has had imposed on them
 * without explanation is a control they will work around.
 */
export default async function SecurityPage() {
  const { member, scope } = await currentSession();
  const state = await mfaState(member.userId);
  const required = mfaRequired(scope);

  return (
    <>
      <PageTitle
        title="Security"
        lead={`Two-factor authentication for your own account${required ? " — required for your office (§13.2)." : "."}`}
      />
      <div className="max-w-3xl">
        <MfaPanel initial={state} required={required} />
      </div>
    </>
  );
}
