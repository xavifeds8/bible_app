"use client";

import { MicIcon } from "./Icons";

export default function VoiceOrb({
  listening,
  processing,
  speaking,
  onClick,
  disabled,
}: {
  listening?: boolean;
  processing?: boolean;
  speaking?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    "orb" +
    (listening ? " orb--listening" : "") +
    (processing ? " orb--processing" : "") +
    (speaking ? " orb--speaking" : "");
  return (
    <div className={className}>
      <span className="orb-ripple" />
      <span className="orb-ripple orb-ripple--2" />
      <span className="orb-ripple orb-ripple--3" />
      <button
        className="orb-core"
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label={listening ? "Finish speaking" : "Speak how you feel"}
      >
        {listening ? <span className="orb-stop" /> : <MicIcon size={38} />}
      </button>
    </div>
  );
}
