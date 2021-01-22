import styles from "./LastVisitedLink.module.css";

import React, { useEffect, useState, useRef } from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";

export const LAST_VISITED_LINK = "LAST_VISITED_LINK";

export default function LastVisitedLink() {
  const isPageActive = useFieldSelector("app", "isVisible");
  const [lastVisitedLink, setLastVisitedLink] = useState<string>();
  const [shouldCancelDismiss, setShouldCancelDismiss] = useState(false);

  const elementRef = useRef<HTMLAnchorElement>(null);

  useEffect(
    function getLinkFromLocalStorage() {
      if (!isPageActive) return;

      const newLastVisitedLink = window.localStorage.getItem(LAST_VISITED_LINK);
      window.localStorage.removeItem(LAST_VISITED_LINK);
      if (newLastVisitedLink) setLastVisitedLink(newLastVisitedLink);
    },
    [isPageActive]
  );

  useEffect(
    function showLinkForDuration() {
      if (shouldCancelDismiss) return;

      if (!lastVisitedLink) {
        setLastVisitedLink(undefined);
        return;
      }

      const element = elementRef.current;
      let timeoutId: number;
      setLastVisitedLink(lastVisitedLink);

      // Need to do it here so that it gets set after a render.
      element?.classList.add(styles.FadeOut);

      timeoutId = window.setTimeout(() => {
        setLastVisitedLink(undefined);
      }, 5000);

      return function cleanupTimeout() {
        window.clearTimeout(timeoutId);
        element?.classList.remove(styles.FadeOut);
      };
    },
    [lastVisitedLink, shouldCancelDismiss]
  );

  const cancelDismiss = () => {
    setShouldCancelDismiss(true);
  };

  const restartDismiss = () => {
    setShouldCancelDismiss(false);
  };

  const dismissImmediately = () => {
    window.setTimeout(() => {
      setLastVisitedLink(undefined);
      setShouldCancelDismiss(false);
    });
  };

  return (
    <a
      {...{
        className: classNames(styles.LastVisitedLink, {
          [styles.Show]: lastVisitedLink,
        }),
        ref: elementRef,
        href: lastVisitedLink,
        target: "_blank",
        rel: "noopener noreferrer",
        onMouseEnter: cancelDismiss,
        onMouseLeave: restartDismiss,
        onClick: dismissImmediately,
        onAuxClick: dismissImmediately,
        onContextMenu: dismissImmediately,
      }}
    >
      Reopen last visited ⟶
    </a>
  );
}
