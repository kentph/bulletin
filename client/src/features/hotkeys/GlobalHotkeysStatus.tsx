import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as KeyboardIcon } from "../../assets/ic_fluent_keyboard_24_regular.svg";

import React, { useState } from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch } from "react-redux";
import { appActions } from "../../app/appReducer";
import { hotkeyMap } from "./useGlobalHotkeys";

const hotkeyKeys = Object.keys(hotkeyMap) as (keyof typeof hotkeyMap)[];

export default function GlobalHotkeysStatus() {
  const dispatch = useDispatch();

  const isKeyboardNavEnabled = useFieldSelector("app", "isKeyboardNavEnabled");

  const [shouldShowShortcuts, setShouldShowShortcuts] = useState(false);

  const toggleKeyboardNav = () => {
    dispatch(appActions.setIsKeyboardNavEnabled(!isKeyboardNavEnabled));
  };

  const toggleShowShortcuts = () => {
    setShouldShowShortcuts(!shouldShowShortcuts);
  };

  return (
    <>
      <h3 className={sharedStyles.IconButton}>
        <KeyboardIcon className={sharedStyles.FluentIcon} />
        <span>Keyboard Shortcuts</span>
      </h3>
      <div className={sharedStyles.Spacing}>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>Shortcuts</div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {isKeyboardNavEnabled ? "Enabled " : "Disabled "}
              <input
                type="checkbox"
                checked={isKeyboardNavEnabled}
                onChange={toggleKeyboardNav}
              />
            </label>
          </div>
        </div>
      </div>
      <div className={sharedStyles.Spacing}>
        {shouldShowShortcuts
          ? hotkeyKeys.map((key) => {
              return (
                <div className={sharedStyles.HighlightedRow} key={key}>
                  <div className={sharedStyles.HighlightedRowValue}>
                    {hotkeyMap[key].key}
                  </div>
                  <div
                    className={sharedStyles.HighlightedRowLabel}
                    style={{ textAlign: "right" }}
                  >
                    {hotkeyMap[key].description}
                  </div>
                </div>
              );
            })
          : undefined}
      </div>
      <div className={sharedStyles.Spacing}>
        <button
          className={classNames(sharedStyles.Button, sharedStyles.Large)}
          onClick={toggleShowShortcuts}
        >
          {shouldShowShortcuts ? "Hide" : "Show shortcuts"}
        </button>
      </div>
    </>
  );
}
