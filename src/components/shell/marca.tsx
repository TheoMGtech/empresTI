import { Package } from "@phosphor-icons/react";

export function Marca() {
  return (
    <div className="flex items-center gap-[10px] px-2">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-(--accent-900) text-(--accent-300) shadow-[0_0_0_1px_#25408F]"
      >
        <Package size={15} />
      </span>
      <span className="text-[14px] font-semibold tracking-[0.02em] text-(--color-text)">
        EmpresTI
      </span>
    </div>
  );
}
