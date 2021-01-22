import sharedStyles from "../shared/shared.module.css";

import React, { MouseEventHandler } from "react";
import { ClassValue } from "classnames/types";
import classNames from "classnames";

type Props = {
  trueLabel: string;
  falseLabel: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  classNames: ClassValue;
  value: boolean;
};

export default function ToggleButton({
  trueLabel,
  falseLabel,
  onClick,
  classNames: otherClassNames,
  value,
}: Props) {
  return (
    <button
      {...{
        className: classNames(sharedStyles.Button, otherClassNames),
        onClick,
      }}
    >
      <span
        className={
          value
            ? sharedStyles.ToggleButtonActiveLabel
            : sharedStyles.ToggleButtonInactiveLabel
        }
      >
        {trueLabel}
      </span>
      <span className={sharedStyles.ButtonDivider} />
      <span
        className={
          value
            ? sharedStyles.ToggleButtonInactiveLabel
            : sharedStyles.ToggleButtonActiveLabel
        }
      >
        {falseLabel}
      </span>
    </button>
  );
}
