import { useHotkeys } from "react-hotkeys-hook";
import useFieldSelector from "../shared/useFieldSelector";
import { settingsThunks } from "../../app/settingsReducer";
import { useDispatch } from "react-redux";
import { appActions } from "../../app/appReducer";
import { feedsActions } from "../../app/feedsReducer";

const getNextVisibleSibling = (
  className: string,
  element?: Element,
  parentClassName?: string
): HTMLElement | null => {
  if (!element) return null;
  let nextVisibleSibling =
    (parentClassName ? element.closest("." + parentClassName) : element)
      ?.nextElementSibling || null;
  while (
    nextVisibleSibling &&
    (!nextVisibleSibling.classList.contains(parentClassName || className) ||
      window
        .getComputedStyle(nextVisibleSibling)
        .getPropertyValue("display") === "none")
  ) {
    nextVisibleSibling =
      (parentClassName
        ? nextVisibleSibling.closest("." + parentClassName)
        : nextVisibleSibling
      )?.nextElementSibling || null;
  }
  if (parentClassName) {
    const children = nextVisibleSibling?.getElementsByClassName(className);
    if (!children || !children.length || !(children[0] instanceof HTMLElement))
      return null;
    return children[0];
  } else
    return nextVisibleSibling instanceof HTMLElement
      ? nextVisibleSibling
      : null;
};

const getFirstVisibleElementInSiblings = (
  className: string,
  element?: Element,
  parentClassName?: string
): HTMLElement | null => {
  if (parentClassName)
    element = element?.closest("." + parentClassName) || undefined;
  if (!element) return null;
  const computedStyle = window.getComputedStyle(element);
  if (
    computedStyle.getPropertyValue("display") === "none" ||
    !element.classList.contains(parentClassName || className)
  ) {
    return getNextVisibleSibling(className, element, parentClassName);
  } else return element instanceof HTMLElement ? element : null;
};

export const focusFirstVisibleElement = (className: string) => {
  const elements = document.getElementsByClassName(className);
  if (!elements.length) return false;
  const firstElement = elements[0];
  const firstVisibleElement = getFirstVisibleElementInSiblings(
    className,
    firstElement
  );
  firstVisibleElement?.focus();
  return Boolean(firstVisibleElement);
};

const getPreviousVisibleSibling = (
  className: string,
  element?: Element,
  parentClassName?: string
): HTMLElement | null => {
  if (!element) return null;
  let previousVisibleSibling =
    (parentClassName ? element.closest("." + parentClassName) : element)
      ?.previousElementSibling || null;
  while (
    previousVisibleSibling &&
    (!previousVisibleSibling.classList.contains(parentClassName || className) ||
      window
        .getComputedStyle(previousVisibleSibling)
        .getPropertyValue("display") === "none")
  ) {
    previousVisibleSibling =
      (parentClassName
        ? previousVisibleSibling.closest("." + parentClassName)
        : previousVisibleSibling
      )?.previousElementSibling || null;
  }
  if (parentClassName) {
    const children = previousVisibleSibling?.getElementsByClassName(className);
    if (!children || !children.length || !(children[0] instanceof HTMLElement))
      return null;
    return children[0];
  } else
    return previousVisibleSibling instanceof HTMLElement
      ? previousVisibleSibling
      : null;
};

const getLastVisibleElementInSiblings = (
  className: string,
  element?: Element,
  parentClassName?: string
): HTMLElement | null => {
  if (parentClassName)
    element = element?.closest("." + parentClassName) || undefined;
  if (!element) return null;
  const computedStyle = window.getComputedStyle(element);
  if (
    computedStyle.getPropertyValue("display") === "none" ||
    !element.classList.contains(className)
  ) {
    return getPreviousVisibleSibling(className, element, parentClassName);
  } else return element instanceof HTMLElement ? element : null;
};

const getFirstVisibleAnchorElementInNextFeed = (
  className: string,
  currentElement?: Element
): HTMLElement | null => {
  if (!currentElement) return null;
  // Focus the next feed by focusing the first anchor element of the feed div.
  let nextFeedElement = currentElement.closest("." + HOTKEY_FEED_CLASS)
    ?.nextElementSibling;
  let firstVisibleAnchorElement = getFirstVisibleElementInSiblings(
    className,
    nextFeedElement?.getElementsByClassName(className)[0]
  );
  while (nextFeedElement && !firstVisibleAnchorElement) {
    nextFeedElement = nextFeedElement.nextElementSibling;
    firstVisibleAnchorElement = getFirstVisibleElementInSiblings(
      className,
      nextFeedElement?.getElementsByClassName(className)[0]
    );
  }
  // Don't do anything if there's no sibling after.
  if (!nextFeedElement) return null;
  return firstVisibleAnchorElement;
};

const getLastVisibleAnchorElementInPreviousFeed = (
  className: string,
  currentElement?: Element
): HTMLElement | null => {
  if (!currentElement) return null;
  // Focus the next feed by focusing the first anchor element of the feed div.
  let previousFeedElement = currentElement.closest("." + HOTKEY_FEED_CLASS)
    ?.previousElementSibling;
  const anchorElements = previousFeedElement?.getElementsByClassName(className);
  let lastVisibleAnchorElement = anchorElements
    ? getLastVisibleElementInSiblings(
        className,
        anchorElements[anchorElements.length - 1]
      )
    : null;
  while (previousFeedElement && !lastVisibleAnchorElement) {
    previousFeedElement = previousFeedElement.previousElementSibling;
    const previousFeedAnchorElements = previousFeedElement?.getElementsByClassName(
      className
    );
    lastVisibleAnchorElement = previousFeedAnchorElements
      ? getLastVisibleElementInSiblings(
          className,
          previousFeedAnchorElements[previousFeedAnchorElements.length - 1]
        )
      : null;
  }
  // Don't do anything if there's no sibling after.
  if (!previousFeedElement) return null;
  return lastVisibleAnchorElement;
};

export const hotkeyMap = {
  toggleEnabled: { key: "k", description: "Toggle keyboard shortcuts on/off" },
  toggleEntrySize: { key: "x", description: "Toggle entry size" },
  focusPrecedingEntry: {
    key: "w",
    description: "Focus feed above/focus preceding entry",
  },
  focusNextEntry: {
    key: "s",
    description: "Focus feed below/focus next entry",
  },
  focusPrecedingFeed: { key: "a", description: "Focus feed to the left" },
  focusNextFeed: { key: "d", description: "Focus feed to the right" },
  focusPrecedingFeedGroup: {
    key: "q",
    description: "Focus first entry in preceding feed group/page",
  },
  focusNextFeedGroup: {
    key: "e",
    description: "Focus first entry in next feed group/page",
  },
  markAllEntriesInFeedAsRead: {
    key: "z",
    description: "Mark all entries in feed as read",
  },
  markEntryAsRead: { key: "c", description: "Mark focused entry as read" },
  starUnstarEntry: { key: "v", description: "Star/Unstar focused entry" },
  visitEntryOrOpenFeed: {
    key: "space",
    description: "Open feed, or open entry link in new tab",
  },
  closeFocusedFeed: { key: "escape", description: "Close open feed" },
};
const hotkeys = Object.values(hotkeyMap)
  .map((hotkeyInfo) => hotkeyInfo.key)
  .join(", ");

export const HOTKEY_ENTRY_CLASS = "hotkeyEntry";
export const HOTKEY_SIMPLE_FEED_CLASS = "hotkeySimpleFeed";
export const HOTKEY_FEED_CLASS = "hotkeyFeed";
export const HOTKEY_FEED_GROUP_CLASS = "hotkeyFeedGroup";
export const HOTKEY_FOCUSED_FEED_CLASS = "hotkeyFocusedFeed";

export default function useGlobalHotkeys() {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const isKeyboardNavEnabled = useFieldSelector("app", "isKeyboardNavEnabled");
  const feedGridMaps = useFieldSelector("feeds", "feedGridMaps");
  const focusedFeedCoordinates = useFieldSelector(
    "feeds",
    "focusedFeedCoordinates"
  );
  const focusedFeedName = useFieldSelector("feeds", "focusedFeedName");
  const feedGroups = useFieldSelector("feeds", "feedGroups");

  // Add keyboard shortcuts.
  useHotkeys(
    hotkeys,
    (event: KeyboardEvent, handler: any) => {
      // Toggle keyboard nav and unfocus/hide overlays with f.
      if (!isKeyboardNavEnabled) {
        if (handler.key === hotkeyMap.toggleEnabled.key)
          dispatch(appActions.setIsKeyboardNavEnabled(true));
        return;
      } else if (handler.key === hotkeyMap.toggleEnabled.key) {
        if (
          document.activeElement &&
          document.activeElement instanceof HTMLElement
        )
          document.activeElement.blur();
        dispatch(appActions.setIsKeyboardNavEnabled(false));
        return;
      }

      event.preventDefault();

      const target = event.target;

      if (!(target instanceof Element)) return;

      switch (handler.key) {
        case hotkeyMap.focusPrecedingEntry.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the feed above.
            const { group, x, y } = focusedFeedCoordinates;
            const currentlyFocusedFeedName =
              feedGridMaps[group][`${x},${y}`]?.feedName;
            let newY = y;
            let newFeedName: string | undefined;
            do {
              if (newY === 0) break;
              newY--;
              newFeedName = feedGridMaps[group][`${x},${newY}`]?.feedName;
            } while (newFeedName && currentlyFocusedFeedName === newFeedName);
            dispatch(feedsActions.setFocusedFeedCoordinates({ x, y: newY }));
            break;
          }

          // If the currently focused element isn't an entry, focus the first entry on the page.
          if (!target.classList.contains(HOTKEY_ENTRY_CLASS)) {
            focusFirstVisibleElement(HOTKEY_ENTRY_CLASS);
            break;
          }

          // Jump to the previous feed if we're at the last entry.
          const previousVisibleSibling =
            getPreviousVisibleSibling(HOTKEY_ENTRY_CLASS, target) ||
            (isMobile &&
              getLastVisibleAnchorElementInPreviousFeed(
                HOTKEY_ENTRY_CLASS,
                target
              ));

          if (!previousVisibleSibling) break;

          previousVisibleSibling.focus();
          previousVisibleSibling.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          });
          break;
        }
        case hotkeyMap.focusNextEntry.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the feed below.
            const { group, x, y } = focusedFeedCoordinates;
            const currentlyFocusedFeedName =
              feedGridMaps[group][`${x},${y}`]?.feedName;
            let newY = y;
            let newFeedName: string | undefined;
            do {
              newY++;
              newFeedName = feedGridMaps[group][`${x},${newY}`]?.feedName;
            } while (newFeedName && currentlyFocusedFeedName === newFeedName);
            if (!newFeedName) newY = y;
            dispatch(feedsActions.setFocusedFeedCoordinates({ x, y: newY }));
            break;
          }

          // If the currently focused element isn't an entry, focus the first entry on the page.
          if (!target.classList.contains(HOTKEY_ENTRY_CLASS)) {
            focusFirstVisibleElement(HOTKEY_ENTRY_CLASS);
            break;
          }

          // Jump to the next feed if we're at the last entry.
          const nextVisibleSibling =
            getNextVisibleSibling(HOTKEY_ENTRY_CLASS, target) ||
            (isMobile &&
              getFirstVisibleAnchorElementInNextFeed(
                HOTKEY_ENTRY_CLASS,
                target
              ));

          if (!nextVisibleSibling) break;

          nextVisibleSibling.focus();
          nextVisibleSibling.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          });
          break;
        }
        case hotkeyMap.focusNextFeed.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the feed below.
            const { group, x, y } = focusedFeedCoordinates;
            const currentlyFocusedFeedName =
              feedGridMaps[group][`${x},${y}`]?.feedName;
            let newX = x;
            let newFeedName: string | undefined;
            do {
              newX++;
              newFeedName = feedGridMaps[group][`${newX},${y}`]?.feedName;
            } while (newFeedName && currentlyFocusedFeedName === newFeedName);
            if (!newFeedName) newX = x;
            dispatch(feedsActions.setFocusedFeedCoordinates({ x: newX, y }));
            break;
          }
          // If a feed is in focus, focus the next feed without leaving focused view.
          if (!isMobile && focusedFeedName && feedGroups) {
            // HACK since we don't know the focused feedGroup, we need to loop through all of them to find
            // the next feed to focus. Should be ok since we shouldn't have many feed groups though.
            for (const group of feedGroups) {
              const index = group.feeds.findIndex(
                (feed) => feed.label === focusedFeedName
              );
              if (index === -1) continue;
              const newFeedIndex = index + 1;
              if (newFeedIndex > group.feeds.length - 1) break;
              dispatch(
                feedsActions.setFocusedFeedName(group.feeds[newFeedIndex].label)
              );
            }
            break;
          }
          break;
        }
        case hotkeyMap.focusPrecedingFeed.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the feed above.
            const { group, x, y } = focusedFeedCoordinates;
            const currentlyFocusedFeedName =
              feedGridMaps[group][`${x},${y}`]?.feedName;
            let newX = x;
            let newFeedName: string | undefined;
            do {
              if (newX === 0) break;
              newX--;
              newFeedName = feedGridMaps[group][`${newX},${y}`]?.feedName;
            } while (newFeedName && currentlyFocusedFeedName === newFeedName);
            dispatch(feedsActions.setFocusedFeedCoordinates({ x: newX, y }));
            break;
          }
          // If a feed is in focus, focus the preceding feed without leaving focused view.
          if (!isMobile && focusedFeedName && feedGroups) {
            // HACK since we don't know the focused feedGroup, we need to loop through all of them to find
            // the next feed to focus. Should be ok since we shouldn't have many feed groups though.
            for (const group of feedGroups) {
              const index = group.feeds.findIndex(
                (feed) => feed.label === focusedFeedName
              );
              if (index === -1) continue;
              const newFeedIndex = index - 1;
              if (newFeedIndex < 0) break;
              dispatch(
                feedsActions.setFocusedFeedName(group.feeds[newFeedIndex].label)
              );
            }
            break;
          }
          break;
        }
        case hotkeyMap.focusNextFeedGroup.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps || !feedGroups) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the next feed group.
            if (focusedFeedCoordinates.group + 1 < feedGroups.length)
              dispatch(
                feedsActions.setFocusedFeedCoordinates({
                  group: focusedFeedCoordinates.group + 1,
                  x: 0,
                  y: 0,
                })
              );
            break;
          }
          break;
        }
        case hotkeyMap.focusPrecedingFeedGroup.key: {
          if (!isMobile && !focusedFeedName) {
            if (!feedGridMaps || !feedGroups) break;
            // We are in grid view, so navigate feeds.
            if (focusedFeedCoordinates === undefined) {
              dispatch(
                feedsActions.setFocusedFeedCoordinates({ group: 0, x: 0, y: 0 })
              );
              break;
            }
            // Move focus to the next feed group.
            if (focusedFeedCoordinates.group - 1 >= 0)
              dispatch(
                feedsActions.setFocusedFeedCoordinates({
                  group: focusedFeedCoordinates.group - 1,
                  x: 0,
                  y: 0,
                })
              );
            break;
          }
          break;
        }

        case hotkeyMap.visitEntryOrOpenFeed.key:
          if (
            target instanceof HTMLElement &&
            (target.classList.contains(HOTKEY_SIMPLE_FEED_CLASS) ||
              target.classList.contains(HOTKEY_ENTRY_CLASS))
          )
            target.click();
          break;

        case hotkeyMap.markEntryAsRead.key:
          // TODO dispatch an action instead.

          if (
            target.classList.contains(HOTKEY_ENTRY_CLASS) &&
            target instanceof HTMLAnchorElement
          )
            target.dispatchEvent(new CustomEvent("onhotkeymarkasread"));
          break;

        case hotkeyMap.starUnstarEntry.key:
          if (
            target.classList.contains(HOTKEY_ENTRY_CLASS) &&
            target instanceof HTMLAnchorElement
          )
            target.dispatchEvent(new CustomEvent("onhotkeystar"));
          break;

        case hotkeyMap.markAllEntriesInFeedAsRead.key:
          // TODO dispatch an action instead.
          // Looks like we could technically dispatch the MARK_ALL_AS_READ action
          // with just the current focusedFeedName, but not sure how to also do
          // side effects (ie. the network request). Maybe we'd add the code to context
          // then pass it into this function as a param to be called here?

          if (
            (target.classList.contains(HOTKEY_ENTRY_CLASS) &&
              target instanceof HTMLAnchorElement) ||
            target.classList.contains(HOTKEY_SIMPLE_FEED_CLASS)
          )
            target.dispatchEvent(
              new CustomEvent("onhotkeymarkallasread", { bubbles: true })
            );
          else {
            const focusedFeedElement = document.getElementsByClassName(
              HOTKEY_FOCUSED_FEED_CLASS
            )[0];
            if (focusedFeedElement)
              focusedFeedElement.dispatchEvent(
                new CustomEvent("onhotkeymarkallasread")
              );
          }
          break;

        case hotkeyMap.toggleEntrySize.key:
          dispatch(
            settingsThunks.setSettingsAndSave((settings) => ({
              ...settings,
              shouldShowSmallEntries: !settings.shouldShowSmallEntries,
            }))
          );
          break;

        case hotkeyMap.closeFocusedFeed.key:
          dispatch(feedsActions.setFocusedFeedName(undefined));
          break;
      }
    },
    {},
    // TODO check these dependencies with props passed in.
    // Could try using a useCallback so we get linting warnings, but
    // wasn't working by just moving above function into useCallback.
    [
      dispatch,
      feedGridMaps,
      focusedFeedName,
      isKeyboardNavEnabled,
      isMobile,
      focusedFeedCoordinates,
      feedGroups,
    ]
  );
}
