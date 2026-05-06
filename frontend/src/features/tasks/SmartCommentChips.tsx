import { useMemo } from "react";
import { interpolate, safeEvaluate } from "../../lib/expr";
import type { SmartComment } from "./api";

/**
 * Tappable comment suggestions, rendered against the operator's current
 * task_data. Conditions filter what shows; `{var}` placeholders are
 * substituted live.
 *
 * Suggestive only — tapping calls onPick with the rendered text. The
 * caller decides whether to insert, append, replace, or do nothing.
 * Operator stays in full control.
 */

interface Props {
  smartComments: SmartComment[] | undefined;
  taskData: Record<string, unknown>;
  onPick: (text: string) => void;
  className?: string;
}

interface Rendered {
  id: string;
  text: string;
}

export function SmartCommentChips({ smartComments, taskData, onPick, className }: Props) {
  const visible = useMemo<Rendered[]>(() => {
    if (!smartComments?.length) return [];
    const seen = new Set<string>();
    const out: Rendered[] = [];
    for (const c of smartComments) {
      if (!c?.id || !c?.text || seen.has(c.id)) continue;
      // Empty/missing condition = always show, mirroring show_if rules.
      if (c.condition && !safeEvaluate(c.condition, taskData, false)) continue;
      out.push({ id: c.id, text: interpolate(c.text, taskData) });
      seen.add(c.id);
    }
    return out;
  }, [smartComments, taskData]);

  if (visible.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Suggestions
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.text)}
            className="min-h-11 max-w-full rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-left text-sm text-blue-100 hover:border-blue-400 hover:bg-blue-500/20"
            title="Tap to insert. You can edit it after."
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
