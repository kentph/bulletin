import styles from "./FeedDropTargetView.module.css";
import feedGroupStyles from "./FeedGroup.module.css";

import React, { useMemo, useCallback } from "react";
import { useDrop } from "react-dnd";
import { DRAG_FEED_TYPE, FeedDragItem } from "./FeedSimpleEditingView";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";
import { checkFit } from "./useFeedGridMaps";

type Props = {
  style: React.CSSProperties;
  coordinates: [number, number];
  feedGroupIndex: number;
  onDragEnter?: (
    coordinates: [number, number],
    width: number,
    height: number,
    canDrop: boolean
  ) => void;
  onDragLeave?: (coordinates: [number, number]) => void;
};

type DropProps = {
  isOver: boolean;
};

export default function FeedDropTargetView({
  style,
  coordinates,
  feedGroupIndex,
  onDragEnter: onDragEnterHandler,
  onDragLeave: onDragLeaveHandler,
}: Props) {
  const dispatch = useDispatch();

  const feedGridMapsByFeedGroupIndex = useFieldSelector(
    "feeds",
    "feedGridMaps"
  );
  const feedGroups = useFieldSelector("feeds", "feedGroups");
  const feedBeingDragged = useFieldSelector("feeds", "feedBeingDragged");

  const canDrop = useMemo(() => {
    if (!feedGroups || !feedGridMapsByFeedGroupIndex || !feedBeingDragged)
      return false;
    if (feedBeingDragged.feedGroupIndex !== feedGroupIndex) return false;
    const feed =
      feedGroups[feedBeingDragged.feedGroupIndex].feeds[
        feedBeingDragged.feedIndex
      ];
    return checkFit(
      [coordinates[0] - 1, coordinates[1] - 1],
      feed.width || 1,
      (feed.height || 1) * 2,
      feedGridMapsByFeedGroupIndex[feedBeingDragged.feedGroupIndex],
      true,
      feed.label
    );
  }, [
    coordinates,
    feedBeingDragged,
    feedGridMapsByFeedGroupIndex,
    feedGroupIndex,
    feedGroups,
  ]);

  const [, dropRef] = useDrop<FeedDragItem, void, DropProps>({
    accept: DRAG_FEED_TYPE,

    // TODO options object that considers context variables too?

    drop: (item) => {
      dispatch(
        feedsActions.moveFeedToCoord({
          feedGroupIndex: item.feedGroupIndex,
          feedIndex: item.feedIndex,
          coord: coordinates,
        })
      );
    },
    canDrop: () => {
      // TODO this is run constantly when a drag is hovering over this component.
      // Do we need to optimize this/get rid of this canDrop function, and instead
      // be smarter about where to place these FeedDropTargetViews?

      return canDrop;
    },
  });

  const onDragEnter = useCallback(() => {
    if (feedGroups && feedBeingDragged && onDragEnterHandler) {
      const feed =
        feedGroups[feedBeingDragged.feedGroupIndex].feeds[
          feedBeingDragged.feedIndex
        ];
      onDragEnterHandler(
        coordinates,
        feed.width || 1,
        feed.height || 2,
        canDrop
      );
    }
  }, [canDrop, coordinates, feedBeingDragged, feedGroups, onDragEnterHandler]);

  const onDragLeave = useCallback(() => {
    if (feedBeingDragged && onDragLeaveHandler) onDragLeaveHandler(coordinates);
  }, [coordinates, feedBeingDragged, onDragLeaveHandler]);

  return (
    <div
      {...{
        className: classNames(
          styles.FeedDropTarget,
          feedGroupStyles.FeedContainer
        ),
        style,
        ref: dropRef,
        onDragEnter,
        onDragLeave,
      }}
    />
  );
}
