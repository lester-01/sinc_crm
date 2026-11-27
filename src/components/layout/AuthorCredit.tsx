import { cn } from "@/lib/utils";

const AUTHOR_URL = "https://benlester.me";
const SOURCE_URL = "https://github.com/lester-01/sinc_crm";
const PROJECTS_URL = "https://projects.benlester.me";

const linkClass =
  "underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground";

/** Small credit line: who built this, where the source is, where to see more. */
export function AuthorCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      Open source (MIT). Built by{" "}
      <a href={AUTHOR_URL} rel="author" className={linkClass}>
        Ben Lester
      </a>
      <span aria-hidden="true"> · </span>
      <a href={SOURCE_URL} className={linkClass}>
        Source on GitHub
      </a>
      <span aria-hidden="true"> · </span>
      <a href={PROJECTS_URL} className={linkClass}>
        More projects
      </a>
    </p>
  );
}
