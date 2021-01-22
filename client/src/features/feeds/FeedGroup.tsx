import styles from "./FeedGroup.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as CollapseIcon } from "../../assets/ic_fluent_arrow_minimize_24_regular.svg";
import { ReactComponent as ExpandIcon } from "../../assets/ic_fluent_arrow_maximize_24_regular.svg";

import React, {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
  useLayoutEffect,
} from "react";
import classNames from "classnames";
import FeedController from "./FeedController";
import FeedMobileView from "./FeedMobileView";
import FeedDropTargetView from "./FeedDropTargetView";
import { FeedData } from "../../types/feedTypes";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { settingsThunks } from "../../app/settingsReducer";
import { feedsActions } from "../../app/feedsReducer";
import {
  HOTKEY_FEED_GROUP_CLASS,
  HOTKEY_FEED_CLASS,
} from "../hotkeys/useGlobalHotkeys";
import FeedSimpleEditingView from "./FeedSimpleEditingView";
import FeedSimpleView from "./FeedSimpleView";

type Props = {
  name: string;
  type: string;
  feeds: FeedData[];
  index: number;
  scrollFeedGroupsBack: () => void;
  scrollFeedGroupsForward: () => void;
};

export default function FeedGroup({
  name,
  type,
  feeds,
  index,
  scrollFeedGroupsBack,
  scrollFeedGroupsForward,
}: Props) {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const settings = useSelector((state: RootState) => state.settings);
  const feedPositionMapsByFeedGroupIndex = useFieldSelector(
    "feeds",
    "feedPositionMaps"
  );
  const focusedFeedCoordinates = useFieldSelector(
    "feeds",
    "focusedFeedCoordinates"
  );
  const isFeedEditingModeOn = useFieldSelector("feeds", "isFeedEditingModeOn");
  const feedBeingDragged = useFieldSelector("feeds", "feedBeingDragged");

  const elementRef = useRef<HTMLDivElement>(null);

  const getShouldCollapseFeedGroup = useCallback(
    (collapsedFeedGroups: string[] | undefined) => {
      return collapsedFeedGroups?.includes(index.toString()) || false;
    },
    [index]
  );

  const [shouldCollapseFeedGroup, setShouldCollapseFeedGroup] = useState(
    getShouldCollapseFeedGroup(settings.collapsedFeedGroups)
  );
  const [targetPreviewData, setTargetPreviewData] = useState<{
    coord: [number, number];
    width: number;
    height: number;
    canDrop: boolean;
  }>();

  const collapseFeedGroup = () => {
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => {
        // Do the opposite of shouldCollapseFeedGroup.
        if (!shouldCollapseFeedGroup) {
          return {
            ...settings,
            collapsedFeedGroups: [
              ...(settings.collapsedFeedGroups || []),
              index.toString(),
            ],
          };
        } else {
          return {
            ...settings,
            collapsedFeedGroups:
              settings.collapsedFeedGroups?.filter(
                (groupIndex) => Number(groupIndex) !== index
              ) || [],
          };
        }
      })
    );
  };

  useLayoutEffect(
    function addIntersectionObserver() {
      if (!elementRef.current) return;
      const ref = elementRef.current;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting)
            dispatch(feedsActions.setFocusedFeedCoordinates({ group: index }));
        },
        {
          // Only set as focused when a feed group is fully visible.
          threshold: 1,
        }
      );
      observer.observe(ref);
      return function cleanupObserver() {
        observer.unobserve(ref);
      };
    },
    [dispatch, index]
  );

  useEffect(
    function scrollToFocusedFeedGroup() {
      if (isMobile && focusedFeedCoordinates?.group === index)
        elementRef.current?.scrollIntoView();
    },
    [focusedFeedCoordinates?.group, index, isMobile]
  );

  useEffect(
    function keepShouldCollapseFeedGroupUpdated() {
      setShouldCollapseFeedGroup(
        getShouldCollapseFeedGroup(settings.collapsedFeedGroups)
      );
    },
    [getShouldCollapseFeedGroup, settings.collapsedFeedGroups]
  );

  useEffect(
    function removeFocusedFeedWhenMobile() {
      if (!isMobile) return;
      dispatch(feedsActions.setFocusedFeedName(undefined));
      dispatch(feedsActions.setFeedEditingMode(false));
    },
    [dispatch, isMobile]
  );

  const showNewFeedModal = () => {
    dispatch(feedsActions.beginAddingNewFeed(index));
  };

  return (
    <div
      className={classNames(HOTKEY_FEED_GROUP_CLASS, styles.FeedGroup, {
        [styles.List]: type === "list",
        [styles.IsEditing]: isFeedEditingModeOn,
      })}
      ref={elementRef}
    >
      <div className={styles.FeedGroupGrid}>
        <div className={styles.FeedGroupOptions}>
          <div className={styles.FeedGroupTitle}>
            <div>
              <strong>Group {index + 1}</strong>
            </div>
            <div>{name}</div>
          </div>
          <button
            className={classNames(sharedStyles.Button, sharedStyles.IconButton)}
            onClick={collapseFeedGroup}
          >
            {shouldCollapseFeedGroup ? (
              <>
                <ExpandIcon className={sharedStyles.FluentIcon} />
                <span>Expand</span>
              </>
            ) : (
              <>
                <CollapseIcon className={sharedStyles.FluentIcon} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {!isMobile || !shouldCollapseFeedGroup ? (
          <>
            {feeds.map((feed, feedIndex) => {
              if (
                !isMobile &&
                isFeedEditingModeOn &&
                feedBeingDragged &&
                !feed.fixedPosition
              ) {
                if (!feedPositionMapsByFeedGroupIndex) return null;
                else {
                  const dropTargetViews: JSX.Element[] = [];
                  for (let x = 0; x < (feed.width || 1); x++) {
                    for (let y = 0; y < (feed.height || 1) * 2; y++) {
                      const coordinates =
                        feedPositionMapsByFeedGroupIndex[index][feed.label];
                      dropTargetViews.push(
                        <FeedDropTargetView
                          {...{
                            key: `droptarget-${index}-${feedIndex}-${dropTargetViews.length}`,
                            coordinates,
                            // Be explicit about where these drop targets will go.
                            style: {
                              gridColumnStart: coordinates[0] + x,
                              gridRowStart: coordinates[1] + y,
                              gridColumnEnd: "span 1",
                              gridRowEnd: "span 1",
                            },
                            feedGroupIndex: index,
                            onDragEnter: (coord, width, height, canDrop) => {
                              setTargetPreviewData({
                                coord,
                                width,
                                height,
                                canDrop,
                              });
                            },
                            onDragLeave: (coord) => {
                              if (
                                targetPreviewData &&
                                targetPreviewData.coord[0] === coord[0] &&
                                targetPreviewData.coord[1] === coord[1]
                              ) {
                                setTargetPreviewData(undefined);
                              }
                            },
                          }}
                        />
                      );
                    }
                  }
                  return (
                    <Fragment
                      // TODO feed.id not unique between two feeds if sources are the same, need to redo.
                      // Using feed.label here for now since that should be unique.
                      key={`drop${name + index + feed.label + feed.id}`}
                    >
                      {dropTargetViews}
                      {targetPreviewData && (
                        <div
                          {...{
                            className: classNames(styles.TargetPreview, {
                              [styles.CantDrop]: !targetPreviewData.canDrop,
                            }),
                            style: {
                              gridColumnStart: targetPreviewData.coord[0],
                              gridRowStart: targetPreviewData.coord[1],
                              gridColumnEnd: `span ${targetPreviewData.width}`,
                              gridRowEnd: `span ${
                                targetPreviewData.height * 2
                              }`,
                            },
                          }}
                        >
                          {!targetPreviewData.canDrop ? "Can't put here" : ""}
                        </div>
                      )}
                    </Fragment>
                  );
                }
              } else
                return (
                  <div
                    className={classNames(
                      HOTKEY_FEED_CLASS,
                      styles.FeedContainer
                    )}
                    // TODO feed.id not unique between two feeds if sources are the same, need to redo.
                    // Using feed.label here for now since that should be unique.
                    key={name + index + feed.label + feed.id}
                    {...(feed.width || feed.height
                      ? {
                          style: {
                            gridColumnEnd: `span ${feed.width || 1}`,
                            gridRowEnd: `span ${(feed.height || 1) * 2}`,
                            // Also style the column and row starts if feed has a defined position.
                            gridColumnStart:
                              feed.fixedPosition && feed.fixedPosition[0],
                            gridRowStart:
                              feed.fixedPosition && feed.fixedPosition[1],
                          },
                        }
                      : undefined)}
                  >
                    <FeedController
                      {...{
                        name: feed.label,
                        source: feed.source,
                        id: feed.id,
                        updateFrequencyMinutes: feed.updateFrequencyMinutes,
                        groupType: type,
                      }}
                    />
                    {isMobile ? (
                      <FeedMobileView
                        {...{
                          feed,
                          groupType: type,
                        }}
                      />
                    ) : !isFeedEditingModeOn ? (
                      <FeedSimpleView
                        {...{
                          feed,
                        }}
                      />
                    ) : !feedBeingDragged || feed.fixedPosition ? (
                      <FeedSimpleEditingView
                        {...{
                          feed,
                          feedGroupIndex: index,
                          feedIndex,
                        }}
                      />
                    ) : null}
                  </div>
                );
            })}
            {!isMobile && !feeds.length ? (
              <div
                {...{
                  className: classNames(HOTKEY_FEED_CLASS, styles.FirstFeed),
                  key: "newFeed",
                }}
              >
                <button
                  data-test="add-1st-feed-button"
                  className={sharedStyles.Button}
                  onClick={showNewFeedModal}
                >
                  Add 1st Feed to Group ⟶
                </button>
              </div>
            ) : null}
          </>
        ) : undefined}
      </div>
    </div>
  );
}
