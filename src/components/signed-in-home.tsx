/**
 * Signed-in home content. Sign-out and settings links live in the AppShell
 * user menu, so this surface focuses on context: who you're signed in as,
 * and what to do next.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  name: string | null | undefined;
  email: string;
};

export function SignedInHome({ name, email }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>You&rsquo;re signed in</CardTitle>
        <CardDescription>{name ? `${name} · ${email}` : email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          This account is what an OAuth application will use when it asks
          for your permission. There&rsquo;s nothing to do here until one
          redirects you back with an authorization request.
        </p>
        <p>
          Use the menu in the top-right to manage your profile or sign out.
        </p>
      </CardContent>
    </Card>
  );
}
