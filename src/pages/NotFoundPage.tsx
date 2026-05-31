import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="font-display text-2xl font-semibold">Page not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be broken or the page was removed.
      </p>
      <Button asChild>
        <Link to="/">Go to home</Link>
      </Button>
    </div>
  );
}
