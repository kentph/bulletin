import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { settingsThunks } from "../../app/settingsReducer";

export default function useCollapseFeed(
  name: string,
  onBeforeToggleShowFeed?: () => void
) {
  const dispatch = useDispatch();

  const settings = useSelector((state: RootState) => state.settings);

  const getShouldCollapseFeed = useCallback(
    (collapsedFeeds: string[] | undefined) => {
      return collapsedFeeds?.includes(name) || false;
    },
    [name]
  );

  const [shouldCollapse, setShouldCollapse] = useState(
    getShouldCollapseFeed(settings.collapsedFeeds)
  );

  const toggleShowFeed = useCallback(() => {
    if (onBeforeToggleShowFeed) onBeforeToggleShowFeed();
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => {
        // Do the opposite of shouldCollapse.
        if (!shouldCollapse) {
          return {
            ...settings,
            collapsedFeeds: [...(settings.collapsedFeeds || []), name],
          };
        } else {
          return {
            ...settings,
            collapsedFeeds:
              settings.collapsedFeeds?.filter(
                (feedName) => feedName !== name
              ) || [],
          };
        }
      })
    );
  }, [dispatch, name, onBeforeToggleShowFeed, shouldCollapse]);

  useEffect(
    function keepShouldCollapseFeedUpdated() {
      setShouldCollapse(getShouldCollapseFeed(settings.collapsedFeeds));
    },
    [
      getShouldCollapseFeed,
      settings.collapsedFeedGroups,
      settings.collapsedFeeds,
    ]
  );

  return { shouldCollapse, toggleShowFeed };
}
