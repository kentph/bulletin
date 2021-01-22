import styles from "./GlobalHotkeysStatusMini.module.css";

import React from "react";
import useFieldSelector from "../shared/useFieldSelector";

export default function GlobalHotkeysStatusMini() {
  const isKeyboardNavEnabled = useFieldSelector("app", "isKeyboardNavEnabled");

  return (
    <div className={styles.GlobalHotkeysToast}>
      Keyboard Shortcuts {isKeyboardNavEnabled ? "Enabled" : "Disabled"}
    </div>
  );
}
