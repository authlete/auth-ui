import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitCode } from "./actions";

export function CodeEntry({ notFound }: { notFound?: boolean }) {
  return (
    <Card className="w-full max-w-sm">
      <form action={submitCode}>
        <CardHeader>
          <CardTitle>Enter the code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="user_code">Code from your device</Label>
          <Input
            id="user_code"
            name="user_code"
            autoComplete="off"
            placeholder="WDJB-MJHT"
            className="font-mono uppercase"
          />
          {notFound ? (
            <p className="text-sm text-destructive">
              That code wasn’t found or has expired. Check it and try again.
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
