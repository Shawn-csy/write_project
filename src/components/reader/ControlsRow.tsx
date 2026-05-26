import React from "react";

interface ControlsRowProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ControlsRow({ className, children }: ControlsRowProps): React.JSX.Element {
  return (
    <div
      className={
        className ||
        "grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 lg:flex-nowrap w-full sm:w-auto sm:items-center"
      }
    >
      {children}
    </div>
  );
}
