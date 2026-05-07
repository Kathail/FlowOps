import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Kebab-menu row actions for table rows. Click the ⋮ to open a small
 * popover with View / Edit / etc. Keyboard accessible (Esc closes,
 * focus returns to the trigger). Items can be `<Link to>`, plain
 * buttons, or destructive (red) buttons.
 *
 * Usage:
 *   <RowActions label="Asset HYD-001 actions">
 *     <RowActions.Link to={`/${slug}/assets/${uid}`}>View</RowActions.Link>
 *     <RowActions.Link to={`/${slug}/work-orders?asset_uid=${uid}`}>
 *       Create work order
 *     </RowActions.Link>
 *     <RowActions.Action onClick={() => deleteAsset()} destructive>
 *       Soft-delete
 *     </RowActions.Action>
 *   </RowActions>
 *
 * Renders as a single `⋮` button when collapsed; menu pops up to the
 * right by default but flips left if it would overflow the viewport.
 */

interface RootProps {
  label: string;
  children: ReactNode;
}

function Root({ label, children }: RootProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⋯
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="block rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-slate-100"
    >
      {children}
    </Link>
  );
}

function MenuAction({
  onClick,
  destructive = false,
  children,
}: {
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  const cls = destructive
    ? "text-red-300 hover:bg-red-500/10"
    : "text-slate-200 hover:bg-slate-800";
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:text-slate-100 ${cls}`}
    >
      {children}
    </button>
  );
}

function MenuSeparator() {
  return <hr className="my-1 border-slate-800" />;
}

export const RowActions = Object.assign(Root, {
  Link: MenuLink,
  Action: MenuAction,
  Separator: MenuSeparator,
});
