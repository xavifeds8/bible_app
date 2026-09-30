"use client";

import { EMOTIONS } from "@/lib/emotions";
import type { EmotionTag } from "@/lib/types";

export default function EmotionPicker({
  selected,
  onSelect,
}: {
  selected?: EmotionTag;
  onSelect: (tag: EmotionTag) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTIONS.map((e) => (
        <button
          key={e.tag}
          className="chip"
          data-active={selected === e.tag}
          onClick={() => onSelect(e.tag)}
          type="button"
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
