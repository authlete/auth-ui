import type { RarElement, Scope } from "@/lib/as-client";
import { isPaymentType, orderedScopes } from "@/lib/consent-labels";
import { scopeIcon } from "@/lib/scope-icons";
import { cn } from "@/lib/utils";
import { DataPermission, PaymentPermission, PermissionRow } from "./permission-cards";

/**
 * The consent body shared by every flow (authorization code, CIBA, device):
 * rich-authorization-request grants first, then plain scopes. Render inside a
 * `CardContent className="space-y-4"`.
 */
export function ConsentPermissions({
  scopes,
  authorizationDetails,
}: {
  scopes: Scope[];
  authorizationDetails: RarElement[];
}) {
  const rar = authorizationDetails ?? [];
  const ordered = orderedScopes(scopes);

  return (
    <>
      {rar.map((el, i) =>
        isPaymentType(String(el.type)) ? (
          <PaymentPermission key={i} el={el} />
        ) : (
          <DataPermission key={i} el={el} />
        ),
      )}

      {ordered.length > 0 && (
        <div className={cn("space-y-3", rar.length > 0 && "border-t pt-4")}>
          {ordered.map((s) => (
            <PermissionRow
              key={s.name}
              Icon={scopeIcon(s.name)}
              title={s.label}
              description={s.description}
            />
          ))}
        </div>
      )}
    </>
  );
}
