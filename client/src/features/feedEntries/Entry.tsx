import sharedStyles from "../shared/shared.module.css";
import styles from "./Entry.module.css";
import { ReactComponent as MoreIcon } from "../../assets/ic_fluent_more_vertical_24_regular.svg";

import React, {
  useCallback,
  useEffect,
  useRef,
  MouseEventHandler,
} from "react";
import moment from "moment";
import numeral from "numeral";
import classNames from "classnames";
import { LAST_VISITED_LINK } from "../menu/LastVisitedLink";
import he from "he";
import { ClassValue } from "classnames/types";
import useLongPress from "../shared/useLongPress";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { networkActions, networkThunks } from "../../app/networkReducer";
import { BATCH_MARK_FEED_AS_READ_BUFFER } from "../api/useBatchMarkFeedAsReadRequestBuffer";
import { STARRED_BUFFER } from "../api/useStarredRequestBuffer";
import { UNSTAR_BUFFER } from "../api/useUnstarRequestBuffer";
import { feedsActions } from "../../app/feedsReducer";
import { appActions, MenuType } from "../../app/appReducer";
import { StarredEntryData } from "../../types/entryTypes";
import { HOTKEY_ENTRY_CLASS } from "../hotkeys/useGlobalHotkeys";

type Props = {
  feedName: string;
  entry: any;
  onMarkAsRead?: (id: string) => void;
  shouldShowAuthor?: boolean;
  customClassNames?: ClassValue[];
  shouldShowLarge?: boolean;
  showAsStarredEntry?: boolean;
  markAllAsReadFunc?: () => void;
  shouldHideRead?: boolean;
  collapseFeedFunc?: () => void;
};

export default function Entry({
  feedName,
  entry,
  onMarkAsRead,
  shouldShowAuthor,
  customClassNames,
  shouldShowLarge,
  showAsStarredEntry,
  markAllAsReadFunc,
  shouldHideRead,
  collapseFeedFunc,
}: Props) {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const settings = useSelector((state: RootState) => state.settings);
  const readMap = useFieldSelector("feeds", "readMap");
  const starredMap = useFieldSelector("feeds", "starredMap");
  const isMarkAsReadModeOn = useFieldSelector("feeds", "isMarkAsReadModeOn");

  const elementRef = useRef<HTMLAnchorElement>(null);

  const markAsRead = useCallback(() => {
    if (readMap && readMap[entry.id]) return;

    dispatch(
      feedsActions.markAsRead({
        feedName,
        entryId: entry.id,
      })
    );

    onMarkAsRead && onMarkAsRead(entry.id);

    dispatch(
      networkActions.pushToBuffer({
        key: BATCH_MARK_FEED_AS_READ_BUFFER,
        entry: { feedName, ids: [entry.id] },
      })
    );
  }, [dispatch, entry.id, feedName, onMarkAsRead, readMap]);

  const toggleStar = useCallback(() => {
    if (starredMap && starredMap[entry.id]) {
      dispatch(feedsActions.unstar(entry.id));
      dispatch(
        networkActions.pushToBuffer({
          key: UNSTAR_BUFFER,
          entry: { entryId: entry.id },
        })
      );
    } else {
      const newStarred: StarredEntryData = {
        feedName,
        entry,
        createdAt: new Date().getTime(),
      };
      dispatch(
        feedsActions.addToStarredMap({
          [entry.id]: newStarred,
        })
      );
      dispatch(
        networkActions.pushToBuffer({ key: STARRED_BUFFER, entry: newStarred })
      );
    }
  }, [dispatch, entry, feedName, starredMap]);

  useEffect(
    function addHotkeyListener() {
      const ref = elementRef.current;
      ref?.addEventListener("onhotkeymarkasread", markAsRead);
      ref?.addEventListener("onhotkeystar", toggleStar);
      return function removeHotkeyListener() {
        ref?.removeEventListener("onhotkeymarkasread", markAsRead);
        ref?.removeEventListener("onhotkeystar", toggleStar);
      };
    },
    [markAsRead, toggleStar]
  );

  const markAsReadAndLogVisit: MouseEventHandler = useCallback(
    (event) => {
      markAsRead();
      if (isMarkAsReadModeOn) {
        // Don't visit the link.
        event.preventDefault();
        return;
      }
      dispatch(
        networkThunks.logVisitedLink({
          url: entry.link,
          feedName,
          entryId: entry.id,
        })
      );
      window.localStorage.setItem(LAST_VISITED_LINK, entry.link);
    },
    [dispatch, entry.id, entry.link, feedName, isMarkAsReadModeOn, markAsRead]
  );

  const entryView = (
    <>
      {!showAsStarredEntry && starredMap && starredMap[entry.id] ? (
        <div className={styles.Star}>★</div>
      ) : undefined}
      <div className={styles.EntryText}>
        <div
          className={classNames(styles.Title, {
            [styles.NoImage]: !entry.image,
          })}
        >
          {entry.text}{" "}
          <span className={styles.TitleSub}>
            {entry.domain ? "(" + entry.domain + ") " : ""}
            {entry.flair ? entry.flair + " " : ""}
          </span>
        </div>
        <div className={styles.Sub}>
          {showAsStarredEntry ? <span>{feedName}</span> : undefined}

          {entry.author ? <span>{entry.author + " "}</span> : ""}

          {/* Reddit  */}
          {entry.upvotes !== undefined ? (
            <span>{"↑" + entry.upvotes}</span>
          ) : (
            ""
          )}
          {entry.numComments !== undefined ? (
            <span>{numeral(entry.numComments).format("0a") + " comments"}</span>
          ) : (
            ""
          )}

          {/* Twitter */}
          {entry.retweets !== undefined ? (
            <span>{numeral(entry.retweets).format("0a") + " retweets"}</span>
          ) : (
            ""
          )}
          {entry.favorites !== undefined ? (
            <span>{numeral(entry.favorites).format("0a") + " favorites"}</span>
          ) : (
            ""
          )}

          {/* YouTube */}
          {entry.views !== undefined ? (
            <span>{numeral(entry.views).format("0a") + " views"}</span>
          ) : (
            ""
          )}

          {entry.time !== undefined ? (
            <span>{moment(entry.time).fromNow()}</span>
          ) : (
            ""
          )}
        </div>
      </div>
      {entry.author && settings.shouldShowSmallEntries ? (
        <div
          className={classNames(styles.EntryAuthor, {
            [styles.Visible]: shouldShowAuthor,
          })}
        >
          {entry.author}
        </div>
      ) : undefined}
      {entry.image ? (
        <img
          className={styles.Thumbnail}
          src={he.decode(entry.image)}
          alt="thumb"
        />
      ) : undefined}

      {!isMobile ? (
        <button
          {...{
            className: classNames(
              sharedStyles.Button,
              sharedStyles.IconButton,
              styles.OptionsButton
            ),
            onClick: (event) => {
              event.stopPropagation();
              event.preventDefault();
              showOptionsMenu();
            },
          }}
        >
          <MoreIcon className={sharedStyles.FluentIcon} />
        </button>
      ) : undefined}
    </>
  );

  const showOptionsMenu = useCallback(() => {
    dispatch(
      appActions.setOptionsMenuContext({
        menuType: MenuType.ENTRY_OPTIONS,
        feedName,
        entry,
        isStarred: Boolean(starredMap && starredMap[entry.id]),
        markAllAsReadFunc,
        shouldHideRead,
        collapseFeedFunc,
      })
    );
  }, [
    collapseFeedFunc,
    dispatch,
    entry,
    feedName,
    markAllAsReadFunc,
    shouldHideRead,
    starredMap,
  ]);

  return useLongPress(
    <a
      data-test="entry"
      {...{
        ...(settings.openLinksInSameWindow
          ? undefined
          : {
              target: "_blank",
              rel: "noopener noreferrer",
            }),
        className: classNames([
          HOTKEY_ENTRY_CLASS,
          styles.Entry,
          {
            [styles.Read]: readMap && readMap[entry.id],
            [styles.Large]: shouldShowLarge,
          },
          ...(customClassNames || []),
        ]),
        ref: elementRef,
        id: entry.id,
        href: entry.link,
        onClick: markAsReadAndLogVisit,
        onAuxClick: markAsReadAndLogVisit,
      }}
    >
      {entryView}
    </a>,
    showOptionsMenu
  );
}
