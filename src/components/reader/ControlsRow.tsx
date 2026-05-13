import React from "react";

export default function ControlsRow({ className, children }) {
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
