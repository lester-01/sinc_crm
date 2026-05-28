/**
 * Parse owner/repo from a git remote URL (GitHub only).
 * @param {string} url
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGithubRemote(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // git@github.com:owner/repo.git
  let m = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (m) {
    return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
  }

  // https://github.com/owner/repo.git
  m = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (m) {
    return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
  }

  return null;
}
