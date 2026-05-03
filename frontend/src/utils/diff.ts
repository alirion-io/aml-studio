/**
 * AML Studio — Minimal line-level diff
 * Lightweight LCS-based diff used by the Push panel.
 * Returns an ordered list of segments tagged as same/added/removed; the
 * push panel renders these inline as a unified diff view.
 *
 * Not a full Myers algorithm — line counts in AML files are small (a few
 * hundred at most), so the O(n*m) DP is plenty fast and avoids pulling in
 * the `diff` package.
 */

export type DiffOp = 'same' | 'added' | 'removed';

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** 1-based line number in the original file (undefined for added lines). */
  oldNumber?: number;
  /** 1-based line number in the new file (undefined for removed lines). */
  newNumber?: number;
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const n = a.length;
  const m = b.length;

  // LCS DP table — store lengths only; reconstruct via backtrack.
  // For typical AML files n*m stays under ~10⁵ so memory is fine.
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: 'same', text: a[i], oldNumber: i + 1, newNumber: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: 'removed', text: a[i], oldNumber: i + 1 });
      i++;
    } else {
      out.push({ op: 'added', text: b[j], newNumber: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ op: 'removed', text: a[i], oldNumber: i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ op: 'added', text: b[j], newNumber: j + 1 });
    j++;
  }
  return out;
}

/**
 * Produce a more compact view by hiding long unchanged runs around edits.
 * Always keeps `context` lines on each side of any non-`same` segment.
 */
export function withContext(lines: DiffLine[], context = 2): DiffLine[] {
  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].op !== 'same') {
      for (let k = Math.max(0, i - context); k < Math.min(lines.length, i + context + 1); k++) {
        keep[k] = true;
      }
    }
  }
  // If there are no edits at all, keep nothing — caller falls back to a
  // "no changes" message.
  if (!keep.includes(true)) return [];
  // Insert hunk-separator markers (rendered as ellipses) where we elide.
  const result: DiffLine[] = [];
  let elided = false;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (elided) {
        result.push({ op: 'same', text: '…' });
        elided = false;
      }
      result.push(lines[i]);
    } else {
      elided = true;
    }
  }
  return result;
}

export function summariseDiff(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.op === 'added') added++;
    else if (l.op === 'removed') removed++;
  }
  return { added, removed };
}
