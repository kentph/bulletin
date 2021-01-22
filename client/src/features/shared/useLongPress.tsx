import {
  cloneElement,
  useCallback,
  TouchEventHandler,
  ReactElement,
  useRef,
} from "react";

const LONG_PRESS_TIMEOUT = 500;
const DISTANCE_THRESHOLD_POW2 = 100 /* px */ ^ 2;

export default function useLongPress(
  component: ReactElement,
  onLongPress: () => void
) {
  const start = useRef<[number, number]>();
  const timeoutId = useRef<number>();

  const cancelLongPress = useCallback(() => {
    start.current = undefined;
    if (timeoutId.current) window.clearTimeout(timeoutId.current);
  }, []);

  const onTouchStart = useCallback<TouchEventHandler<ReactElement>>(
    (event) => {
      cancelLongPress();
      // Ignore multiple fingers.
      if (!event.touches || event.touches.length !== 1) return;
      event.preventDefault();
      start.current = [event.touches[0].pageX, event.touches[0].pageY];
      timeoutId.current = window.setTimeout(() => {
        onLongPress();
      }, LONG_PRESS_TIMEOUT);
    },
    [cancelLongPress, onLongPress]
  );

  const onTouchMove = useCallback<TouchEventHandler<ReactElement>>(
    (event) => {
      // Ignore multiple fingers.
      if (!event.touches || event.touches.length !== 1 || !start.current) {
        cancelLongPress();
        return;
      }
      const distanceSquared =
        Math.pow(event.touches[0].pageX - start.current[0], 2) +
        Math.pow(event.touches[0].pageY - start.current[1], 2);
      if (distanceSquared > DISTANCE_THRESHOLD_POW2) {
        cancelLongPress();
        return;
      }
    },
    [cancelLongPress]
  );

  return cloneElement(component, {
    onTouchStart,
    onTouchMove,
    onTouchEnd: cancelLongPress,
    onTouchCancel: cancelLongPress,
  });
}
