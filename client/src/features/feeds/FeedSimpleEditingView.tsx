import styles from "./FeedSimpleEditingView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as EditIcon } from "../../assets/ic_fluent_edit_24_regular.svg";

import React from "react";
import { useDrag, DragObjectWithType } from "react-dnd";
import classNames from "classnames";
import { FeedData } from "../../types/feedTypes";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";

export const DRAG_FEED_TYPE = "feed" as const;

type Props = {
  feed: FeedData;
  feedGroupIndex: number;
  feedIndex: number;
};

export type FeedDragItem = DragObjectWithType & {
  type: typeof DRAG_FEED_TYPE;
  feedGroupIndex: number;
  feedIndex: number;
};

export default function FeedSimpleEditingView({
  feed,
  feedGroupIndex,
  feedIndex,
}: Props) {
  const dispatch = useDispatch();

  const feedPositionMapsByFeedGroupIndex = useFieldSelector(
    "feeds",
    "feedPositionMaps"
  );
  const feedBeingDragged = useFieldSelector("feeds", "feedBeingDragged");

  const [, dragRef] = useDrag<FeedDragItem, void, void>({
    item: {
      type: DRAG_FEED_TYPE,
      feedGroupIndex,
      feedIndex,
    },
    canDrag: Boolean(feed.fixedPosition),
    begin: () => {
      dispatch(
        feedsActions.setFeedBeingDragged({
          type: DRAG_FEED_TYPE,
          feedGroupIndex,
          feedIndex,
        })
      );
    },
    end: () => {
      dispatch(feedsActions.setFeedBeingDragged(undefined));
    },
  });

  const editFeed = () => {
    dispatch(
      feedsActions.beginEditingFeed({
        feedGroupIndex,
        feedIndex,
      })
    );
  };

  const deleteFeed = () => {
    if (window.confirm(`Are you sure you want to remove ${feed.label}?`)) {
      dispatch(
        feedsActions.deleteFeed({
          feedGroupIndex,
          feedIndex,
        })
      );
    }
  };

  const moveFeedUp = () => {
    dispatch(
      feedsActions.moveFeedUp({
        feedGroupIndex,
        feedIndex,
      })
    );
  };

  const moveFeedDown = () => {
    dispatch(
      feedsActions.moveFeedDown({
        feedGroupIndex,
        feedIndex,
      })
    );
  };

  const changeFixedPositioning = () => {
    if (feedPositionMapsByFeedGroupIndex)
      dispatch(
        feedsActions.toggleFixedPositioning({
          feedGroupIndex,
          feedIndex,
          potentialCoord:
            feedPositionMapsByFeedGroupIndex[feedGroupIndex][feed.label],
        })
      );
  };

  return (
    <div
      {...{
        className: classNames(styles.Feed, {
          [styles.Dragging]: feedBeingDragged,
          [styles.ManualPositioning]: feed.fixedPosition,
        }),
        ref: dragRef,
      }}
    >
      <div
        {...{
          className: classNames(styles.FeedTitleRow, {
            [styles.Dragging]: feedBeingDragged,
          }),
        }}
      >
        <h3 className={styles.FeedTitle}>{feed.label}</h3>

        <div className={styles.TitleRowSpacer} />

        <button
          {...{
            className: classNames(
              sharedStyles.Button,
              sharedStyles.IconButton,
              styles.EditButton
            ),
            onClick: editFeed,
          }}
        >
          <EditIcon className={sharedStyles.FluentIcon} />
          <span>Edit</span>
        </button>

        <button
          {...{
            className: sharedStyles.Button,
            onClick: deleteFeed,
          }}
        >
          ✕&nbsp;&nbsp;Delete
        </button>
      </div>
      {feedBeingDragged ? null : (
        <div className={styles.EditingForm}>
          <div {...{ className: styles.OrderButtons }}>
            {!feed.fixedPosition ? (
              <>
                <button
                  {...{
                    className: classNames(
                      sharedStyles.Button,
                      styles.VisibleOnHover
                    ),
                    onClick: moveFeedUp,
                  }}
                >
                  ←
                </button>
                <span
                  {...{
                    className: classNames(styles.Index, styles.EmphasisOnHover),
                  }}
                >
                  Position <strong>{feedIndex + 1}</strong>
                </span>
                <button
                  {...{
                    className: classNames(
                      sharedStyles.Button,
                      styles.VisibleOnHover
                    ),
                    onClick: moveFeedDown,
                  }}
                >
                  →
                </button>
              </>
            ) : (
              <span {...{ className: styles.EmphasisOnHover }}>
                Drag to Reorder
              </span>
            )}
          </div>
          <div
            {...{
              className: classNames(sharedStyles.HighlightedRowValue, {
                [styles.VisibleOnHover]: !feed.fixedPosition,
              }),
            }}
          >
            <label>
              <input
                {...{
                  type: "checkbox",
                  name: "fixedPosition",
                  checked: Boolean(feed.fixedPosition),
                  onChange: changeFixedPositioning,
                }}
              />
              Manual Positioning
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
