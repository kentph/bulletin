import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";
import useFieldSelector from "../shared/useFieldSelector";

export type FeedGridMap = {
  [coords: string]: {
    feedName: string;
    isFixed: boolean;
  };
};
export type FeedPositionMap = { [feedName: string]: [number, number] };

const NUM_OF_GRID_COLUMNS = 4;
const MAX_NUM_OF_ROWS = 100;

export const checkFit = (
  [topLeftX, topLeftY]: [number, number],
  numCols: number,
  numRows: number,
  feedGridMap: FeedGridMap,
  fixedOnly?: boolean,
  feedNameToIgnore?: string
) => {
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const x = col + topLeftX;
      // Don't allow feeds to overflow columns.
      if (x >= NUM_OF_GRID_COLUMNS) return false;
      const gridData = feedGridMap[`${col + topLeftX},${row + topLeftY}`];
      if (fixedOnly ? gridData?.isFixed : gridData) {
        if (
          feedNameToIgnore &&
          gridData &&
          gridData.feedName === feedNameToIgnore
        )
          continue;
        return false;
      }
    }
  }
  return true;
};

const scanForNextFreeSpot = (
  numCols: number,
  numRows: number,
  feedGridMap: FeedGridMap
): [number, number] => {
  let y = 0;
  while (y < MAX_NUM_OF_ROWS) {
    for (let x = 0; x < NUM_OF_GRID_COLUMNS; x++) {
      // See if feed will fit into the empty space with this x and y
      // as the top left grid area.
      if (checkFit([x, y], numCols, numRows, feedGridMap)) {
        return [x, y];
      }
    }
    y++;
  }
  throw Error("Max number of rows reached");
};

const writeFeedPositionToMap = (
  [topLeftX, topLeftY]: [number, number],
  feedName: string,
  isFixed: boolean,
  numCols: number,
  numRows: number,
  feedGridMap: FeedGridMap
) => {
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      feedGridMap[`${col + topLeftX},${row + topLeftY}`] = {
        feedName,
        isFixed,
      };
    }
  }
};

// DEBUG
// /**
//  * Print out a representation of the map. Useful for debugging.
//  * @param map Map to print.
//  */
// const printMap = (map: FeedGridMap) => {
//   let result = '';
//   let rowHasFeed = false;
//   let row = 0;
//   do {
//     result += '|';
//     rowHasFeed = false;
//     for (let col = 0; col < NUM_OF_GRID_COLUMNS; col++) {
//       const feedName = map[`${col},${row}`].feedName;
//       if (feedName) {
//         result += ` ${feedName.padEnd(10, ' ').slice(0, 10)} |`;
//         rowHasFeed = true;
//       }
//       else {
//         result += `            |`;
//       }
//     }
//     result += '\n';
//     row++;
//   }
//   while (rowHasFeed);
//   return result;
// };

export default function useFeedGridMaps() {
  const dispatch = useDispatch();

  const feedGroups = useFieldSelector("feeds", "feedGroups");

  useEffect(
    function computeFeedGridMapOnChange() {
      const results:
        | [FeedGridMap, FeedPositionMap][]
        | undefined = feedGroups?.map((feedGroup) => {
        const feedGridMap: FeedGridMap = {};
        const feedPositionMap: FeedPositionMap = {};

        // First deal with fixed-positioned feeds.
        // Using for loops here to preserve order.
        for (const feed of feedGroup.feeds.filter(
          (feed) => feed.fixedPosition
        )) {
          // This should never happen, but adding as a type guard.
          if (!feed.fixedPosition) continue;
          const position: [number, number] = [
            feed.fixedPosition[0] - 1,
            feed.fixedPosition[1] - 1,
          ];
          const numColsToOccupy = feed.width || 1;
          const numRowsToOccupy = (feed.height || 1) * 2;
          // Let's double check that feed fits, and throw an error if it doesn't.
          if (
            !checkFit(position, numColsToOccupy, numRowsToOccupy, feedGridMap)
          )
            throw Error("fixed feed doesn't fit");
          feedPositionMap[feed.label] = feed.fixedPosition;
          writeFeedPositionToMap(
            position,
            feed.label,
            true,
            numColsToOccupy,
            numRowsToOccupy,
            feedGridMap
          );
        }

        // Then handle the remaining auto-positioned feeds.
        for (const feed of feedGroup.feeds.filter(
          (feed) => !feed.fixedPosition
        )) {
          const numColsToOccupy = feed.width || 1;
          const numRowsToOccupy = (feed.height || 1) * 2;
          const freeSpot = scanForNextFreeSpot(
            numColsToOccupy,
            numRowsToOccupy,
            feedGridMap
          );
          // grid-row-start and -column-start are 1-indexed.
          feedPositionMap[feed.label] = [freeSpot[0] + 1, freeSpot[1] + 1];
          writeFeedPositionToMap(
            freeSpot,
            feed.label,
            false,
            numColsToOccupy,
            numRowsToOccupy,
            feedGridMap
          );
        }

        return [feedGridMap, feedPositionMap];
      });
      dispatch(
        feedsActions.setFeedMaps({
          gridMaps: results?.map((result) => result[0]),
          positionMaps: results?.map((result) => result[1]),
        })
      );
    },
    [dispatch, feedGroups]
  );
}
