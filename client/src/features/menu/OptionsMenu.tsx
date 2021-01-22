import styles from "./OptionsMenu.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as RefreshIcon } from "../../assets/ic_fluent_arrow_clockwise_24_regular.svg";
import { ReactComponent as CheckIcon } from "../../assets/ic_fluent_checkmark_24_regular.svg";
import { ReactComponent as EyeShowIcon } from "../../assets/ic_fluent_eye_show_24_filled.svg";
import { ReactComponent as EyeHideIcon } from "../../assets/ic_fluent_eye_hide_24_filled.svg";
import { ReactComponent as CollapseIcon } from "../../assets/ic_fluent_arrow_minimize_24_regular.svg";
import { ReactComponent as StarIcon } from "../../assets/ic_fluent_star_24_regular.svg";
import { ReactComponent as UnstarIcon } from "../../assets/ic_fluent_star_off_24_regular.svg";

import React from "react";
import classNames from "classnames";
import { useDispatch } from "react-redux";
import { networkActions } from "../../app/networkReducer";
import { BATCH_MARK_FEED_AS_READ_BUFFER } from "../api/useBatchMarkFeedAsReadRequestBuffer";
import { STARRED_BUFFER } from "../api/useStarredRequestBuffer";
import { UNSTAR_BUFFER } from "../api/useUnstarRequestBuffer";
import useFieldSelector from "../shared/useFieldSelector";
import { feedsActions } from "../../app/feedsReducer";
import { appActions, MenuType } from "../../app/appReducer";
import { StarredEntryData } from "../../types/entryTypes";

export default function OptionsMenu() {
  const dispatch = useDispatch();

  const optionsMenuContext = useFieldSelector("app", "optionsMenuContext");

  if (!optionsMenuContext) return null;

  const hideMenu = () => {
    dispatch(appActions.setOptionsMenuContext(undefined));
  };

  const markAsRead = () => {
    if (!optionsMenuContext || !optionsMenuContext.entry) return;
    dispatch(
      feedsActions.markAsRead({
        feedName: optionsMenuContext.feedName,
        entryId: optionsMenuContext.entry.id,
      })
    );
    dispatch(
      networkActions.pushToBuffer({
        key: BATCH_MARK_FEED_AS_READ_BUFFER,
        entry: {
          feedName: optionsMenuContext.feedName,
          ids: [optionsMenuContext.entry.id],
        },
      })
    );
  };

  const star = () => {
    if (!optionsMenuContext || !optionsMenuContext.entry) return;
    const newStarred: StarredEntryData = {
      feedName: optionsMenuContext.feedName,
      entry: optionsMenuContext.entry,
      createdAt: new Date().getTime(),
    };
    dispatch(
      feedsActions.addToStarredMap({
        [optionsMenuContext.entry.id]: newStarred,
      })
    );
    dispatch(
      networkActions.pushToBuffer({ key: STARRED_BUFFER, entry: newStarred })
    );
  };

  const unstar = () => {
    if (!optionsMenuContext || !optionsMenuContext.entry) return;
    dispatch(feedsActions.unstar(optionsMenuContext.entry.id));
    dispatch(
      networkActions.pushToBuffer({
        key: UNSTAR_BUFFER,
        entry: { entryId: optionsMenuContext.entry.id },
      })
    );
  };

  return (
    <div {...{ className: styles.Overlay, onClick: hideMenu }}>
      <div {...{ className: styles.Menu }}>
        <div className={styles.MenuContent}>
          {optionsMenuContext?.menuType === MenuType.ENTRY_OPTIONS ? (
            <>
              <p>
                <strong>Entry Actions</strong>
              </p>
              <button
                {...{
                  className: classNames(
                    sharedStyles.Button,
                    sharedStyles.IconButton,
                    sharedStyles.Larger,
                    styles.Button
                  ),
                  onClick: markAsRead,
                }}
              >
                <CheckIcon className={sharedStyles.FluentIcon} />
                <span>Mark as Read</span>
              </button>
              <button
                {...{
                  className: classNames(
                    sharedStyles.Button,
                    sharedStyles.IconButton,
                    sharedStyles.Larger,
                    styles.Button
                  ),
                  onClick: optionsMenuContext?.isStarred ? unstar : star,
                }}
              >
                {optionsMenuContext?.isStarred ? (
                  <UnstarIcon className={sharedStyles.FluentIcon} />
                ) : (
                  <StarIcon className={sharedStyles.FluentIcon} />
                )}
                <span>{optionsMenuContext?.isStarred ? "Unstar" : "Star"}</span>
              </button>
            </>
          ) : undefined}

          <p>
            <strong>Feed Actions — {optionsMenuContext?.feedName}</strong>
          </p>
          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.IconButton,
                sharedStyles.Larger,
                styles.Button
              ),
              onClick: () => {
                dispatch(
                  feedsActions.triggerManualFeedUpdate({
                    feedName: optionsMenuContext.feedName,
                    triggeredAt: new Date().getTime(),
                  })
                );
              },
            }}
          >
            <RefreshIcon className={sharedStyles.FluentIcon} />
            <span>Refresh</span>
          </button>
          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.IconButton,
                sharedStyles.Larger,
                styles.Button
              ),
              onClick: optionsMenuContext.markAllAsReadFunc,
            }}
          >
            <CheckIcon className={sharedStyles.FluentIcon} />
            <span>Mark Feed as Read</span>
          </button>
          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.IconButton,
                sharedStyles.Larger,
                styles.Button
              ),
              onClick: () => {
                dispatch(
                  feedsActions.setShouldCollapseRead({
                    feedName: optionsMenuContext.feedName,
                    shouldCollapseRead: !optionsMenuContext.shouldHideRead,
                  })
                );
              },
            }}
          >
            {optionsMenuContext.shouldHideRead ? (
              <EyeShowIcon className={sharedStyles.FluentIcon} />
            ) : (
              <EyeHideIcon className={sharedStyles.FluentIcon} />
            )}
            <span>
              {optionsMenuContext.shouldHideRead ? "Show" : "Hide"} Read Entries
            </span>
          </button>
          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.IconButton,
                sharedStyles.Larger,
                styles.Button
              ),
              onClick: optionsMenuContext.collapseFeedFunc,
            }}
          >
            <CollapseIcon className={sharedStyles.FluentIcon} />
            <span>Collapse</span>
          </button>
        </div>
      </div>
    </div>
  );
}
