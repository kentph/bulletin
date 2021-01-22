import { useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { useDispatch } from "react-redux";
import { appActions } from "../../app/appReducer";
import useFieldSelector from "../shared/useFieldSelector";

/**
 * Relying on document focus/blur instead of page visibility, since that also covers when tab stays active but
 * the window is no longer in front.
 */
const useVisibility = () => {
  const dispatch = useDispatch();
  const isVisible = useFieldSelector("app", "isVisible");

  const debouncedSetIsVisible = useCallback(
    (newValue: boolean) =>
      debounce(
        (value: boolean) => dispatch(appActions.setIsVisible(value)),
        1000,
        { leading: true }
      )(newValue),
    [dispatch]
  );

  useEffect(
    function visibilityEffect() {
      const handleFocus = () => {
        if (!isVisible) {
          debouncedSetIsVisible(true);
        }
      };
      const handleBlur = () => {
        debouncedSetIsVisible(false);
      };
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);

      return () => {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
      };
    },
    [debouncedSetIsVisible, isVisible]
  );

  return isVisible;
};

export default useVisibility;
