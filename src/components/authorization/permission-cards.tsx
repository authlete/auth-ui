// Permission presentation for the consent screen: rich-authorization-request
// (RAR) cards for Open-Banking data/payment grants, plus the plain scope row.
// consent-form.tsx orchestrates these; the labelling lives in lib/consent-labels.
import {
  ArrowRightLeft,
  CreditCard,
  FileText,
  KeyRound,
  Landmark,
  LineChart,
  type LucideIcon,
  Repeat,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RarElement } from "@/lib/as-client";
import {
  actionLabel,
  formatDate,
  frequencyPhrase,
  paymentAmount,
  privilegeLabel,
  typeLabel,
} from "@/lib/consent-labels";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, LucideIcon> = {
  Accounts: Landmark,
  CreditCardAccounts: CreditCard,
  Loans: Wallet,
  Investments: LineChart,
  Insurances: Shield,
  Customers: User,
  Resources: FileText,
  PaymentReports: FileText,
  SinglePayments: ArrowRightLeft,
  ScheduledPayments: ArrowRightLeft,
  RecurringPayments: Repeat,
  VariableRecurringPayments: Repeat,
};

const typeIcon = (type: string): LucideIcon => TYPE_ICONS[type] ?? KeyRound;

function IconBadge({ Icon, tone = "default" }: { Icon: LucideIcon; tone?: "default" | "warning" }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tone === "warning"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          : "bg-muted text-foreground/70",
      )}
    >
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}

function Purpose({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Purpose · </span>
      {text}
    </p>
  );
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A data-access grant: what it can read (tags), on which account, for how long. */
export function DataPermission({ el }: { el: RarElement }) {
  const type = String(el.type ?? "");
  const actions = Array.isArray(el.actions) ? (el.actions as string[]) : [];
  const privileges = Array.isArray(el.privileges) ? (el.privileges as string[]) : [];
  const identifier = typeof el.identifier === "string" ? el.identifier : null;
  const purpose = typeof el.purpose === "string" ? el.purpose : null;
  const recurring = el.recurringIndicator === true;
  const refresh = frequencyPhrase(el.frequency);
  const until = formatDate(el.validTo);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <IconBadge Icon={typeIcon(type)} />
        <h4 className="min-w-0 flex-1 font-semibold leading-tight">{typeLabel(type)}</h4>
        <Badge variant="outline">{recurring ? "Ongoing" : "One-time"}</Badge>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <Badge key={a} variant="secondary">
              {actionLabel(a)}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-0.5 text-xs text-muted-foreground">
        {identifier && <p>Account {identifier}</p>}
        {privileges.length > 0 && <p>{privileges.map(privilegeLabel).join(" · ")}</p>}
        {until && (
          <p>
            {recurring ? "Active until" : "Expires"} {until}
            {refresh ? ` · refreshed ${refresh}` : ""}
          </p>
        )}
      </div>

      {purpose && <Purpose text={purpose} />}
    </div>
  );
}

/** A payment grant: amount is the anchor, then payee and timing. */
export function PaymentPermission({ el }: { el: RarElement }) {
  const type = String(el.type ?? "");
  const instruction = (el.instruction ?? {}) as Record<string, unknown>;
  const parties = (instruction.parties ?? {}) as Record<string, unknown>;
  const creditor = (parties.creditor ?? {}) as Record<string, unknown>;
  const amount = paymentAmount(el);
  const when = formatDate(instruction.requestedExecutionDateTime);
  const purpose = typeof el.purpose === "string" ? el.purpose : null;
  const recurring = el.recurringIndicator === true;
  const refresh = frequencyPhrase(el.frequency);
  const until = formatDate(el.validTo);

  return (
    <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-3">
        <IconBadge Icon={typeIcon(type)} tone="warning" />
        <h4 className="min-w-0 flex-1 font-semibold leading-tight">{typeLabel(type)}</h4>
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
        >
          {recurring ? "Recurring" : "One-time"}
        </Badge>
      </div>

      {amount && (
        <p className="text-2xl font-semibold tracking-tight">
          {amount}
          {recurring && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">max each</span>
          )}
        </p>
      )}

      <div className="space-y-0.5 text-xs text-muted-foreground">
        {typeof creditor.name === "string" && <p>To {creditor.name}</p>}
        {when && <p>On {when}</p>}
        {recurring && (refresh || until) && (
          <p>
            {refresh ? capitalizeFirst(refresh) : "Recurring"}
            {until ? ` · until ${until}` : ""}
          </p>
        )}
      </div>

      {purpose && <Purpose text={purpose} />}
    </div>
  );
}

/** A scope grant rendered as an icon-led row (no bullets). */
export function PermissionRow({
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <IconBadge Icon={Icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
