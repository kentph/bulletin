import styles from "./EditingBar.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as AddIcon } from "../../assets/ic_fluent_add_24_regular.svg";

import React from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";
import { RootState } from "../../app/rootReducer";

type Props = {
  scrollFeedGroupsBack: () => void;
  scrollFeedGroupsForward: () => void;
};

export default function EditingBar({
  scrollFeedGroupsBack,
  scrollFeedGroupsForward,
}: Props) {
  const dispatch = useDispatch();

  const focusedFeedCoordinates = useFieldSelector(
    "feeds",
    "focusedFeedCoordinates"
  );
  const numOfFeedGroups = useSelector(
    (state: RootState) => state.feeds.feedGroups?.length || 0
  );

  if (!focusedFeedCoordinates || !numOfFeedGroups) return null;

  const showNewFeedModal = () => {
    dispatch(feedsActions.beginAddingNewFeed(focusedFeedCoordinates.group));
  };

  const addFeedGroup = () => {
    dispatch(feedsActions.addFeedGroupAfter(focusedFeedCoordinates.group));
  };

  const deleteFeedGroup = () => {
    if (
      window.confirm(
        `Are you sure you want to delete the current feed group (Group ${
          focusedFeedCoordinates.group + 1
        })?`
      )
    ) {
      dispatch(feedsActions.deleteFeedGroup(focusedFeedCoordinates.group));
    }
  };

  const exitEditingMode = () => {
    dispatch(feedsActions.setFeedEditingMode(false));
  };

  return (
    <div
      {...{
        className: styles.EditingBottomBar,
      }}
    >
      <strong>
        <span {...{ className: styles.FeedGroupIndex }}>
          Arrange/Edit Feeds
        </span>
      </strong>

      {numOfFeedGroups > 1 ? (
        <>
          <div {...{ className: sharedStyles.Divider }} />

          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                styles.FeedGroupButton
              ),
              onClick: scrollFeedGroupsBack,
            }}
          >
            ←
          </button>

          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                styles.FeedGroupButton
              ),
              onClick: scrollFeedGroupsForward,
            }}
          >
            →
          </button>

          <span {...{ className: styles.FeedGroupIndex }}>
            Group <strong>{focusedFeedCoordinates.group + 1}</strong> of{" "}
            {numOfFeedGroups}
          </span>
        </>
      ) : undefined}

      <div {...{ className: sharedStyles.Spacer }} />

      <button
        className={classNames(
          sharedStyles.Button,
          sharedStyles.IconButton,
          styles.FeedGroupButton
        )}
        onClick={showNewFeedModal}
      >
        <AddIcon className={sharedStyles.FluentIcon} />
        <span>Add Feed</span>
      </button>

      <div {...{ className: sharedStyles.Divider }} />

      <button
        className={classNames(sharedStyles.Button, styles.FeedGroupButton)}
        onClick={deleteFeedGroup}
      >
        ✕&nbsp;&nbsp;Delete Group
      </button>

      <button
        className={classNames(
          sharedStyles.Button,
          sharedStyles.IconButton,
          styles.FeedGroupButton
        )}
        onClick={addFeedGroup}
      >
        <AddIcon className={sharedStyles.FluentIcon} />
        <span>Add Group to Right</span>
      </button>

      <div {...{ className: sharedStyles.Divider }} />

      <button
        className={classNames(
          sharedStyles.Button,
          sharedStyles.Secondary,
          styles.FeedGroupButton
        )}
        onClick={exitEditingMode}
      >
        Done
      </button>
    </div>
  );
}
