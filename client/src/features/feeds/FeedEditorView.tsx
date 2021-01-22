import styles from "./FeedEditorView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as AddIcon } from "../../assets/ic_fluent_add_24_regular.svg";
import { ReactComponent as EditIcon } from "../../assets/ic_fluent_edit_24_regular.svg";

import React, {
  ChangeEventHandler,
  useRef,
  MouseEventHandler,
  useEffect,
  useState,
  FormEventHandler,
} from "react";
import classNames from "classnames";
import produce from "immer";
import Axios from "axios";
import { FeedData, FeedSource } from "../../types/feedTypes";
import { feedsActions } from "../../app/feedsReducer";
import { useDispatch } from "react-redux";
import useFieldSelector from "../shared/useFieldSelector";

const DEFAULT_NEW_FEED_DATA: FeedData = {
  label: "",
  source: FeedSource.RSS,
  id: "",
  updateFrequencyMinutes: 30,
  height: 1,
  width: 1,
  includeRegexString: "",
};
const YOUTUBE_CHANNEL_ID_LENGTH = 24;

const stopPropagation: MouseEventHandler = (event) => {
  event.stopPropagation();
};

export default function FeedEditorView() {
  const dispatch = useDispatch();

  const feedGroups = useFieldSelector("feeds", "feedGroups");
  const feedGroupIndexOfNewOrEditingFeed = useFieldSelector(
    "feeds",
    "feedGroupIndexOfNewOrEditingFeed"
  );
  const feedIndexOfEditingFeed = useFieldSelector(
    "feeds",
    "feedIndexOfEditingFeed"
  );

  const [isSavingFeed, setIsSavingFeed] = useState(false);
  const [newFeedData, setNewFeedData] = useState<FeedData>(
    DEFAULT_NEW_FEED_DATA
  );
  const [newYouTubeSubChannelId, setNewYouTubeSubChannelId] = useState("");
  const [errorMessages, setErrorMessages] = useState<
    Partial<{ all: string; feedName: string; feedType: string }>
  >({});

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(
    function updateNewFeedData() {
      if (feedGroupIndexOfNewOrEditingFeed === undefined) return;
      if (feedIndexOfEditingFeed === undefined) {
        setNewFeedData(DEFAULT_NEW_FEED_DATA);
      } else if (feedGroups) {
        setNewFeedData(
          feedGroups[feedGroupIndexOfNewOrEditingFeed].feeds[
            feedIndexOfEditingFeed
          ]
        );
      }
    },
    [feedGroupIndexOfNewOrEditingFeed, feedGroups, feedIndexOfEditingFeed]
  );

  useEffect(
    function trapFocusWhenVisible() {
      if (feedGroupIndexOfNewOrEditingFeed === undefined) return;
      const trapFocus = (event: WindowEventMap["focusin"]) => {
        const target = event.target;
        if (
          !(target instanceof Element) ||
          target.closest(`.${styles.FocusedFeedContainer}`)
        )
          return;
        closeButtonRef.current?.focus();
      };
      window.addEventListener("focusin", trapFocus);
      return function cleanupTrapFocusWhenVisible() {
        window.removeEventListener("focusin", trapFocus);
      };
    },
    [feedGroupIndexOfNewOrEditingFeed]
  );

  if (feedGroupIndexOfNewOrEditingFeed === undefined) return null;

  const updateFeedData: ChangeEventHandler<
    HTMLSelectElement | HTMLInputElement
  > = (event) => {
    const newValue = event.currentTarget.value;
    const fieldName = event.currentTarget.name;

    setNewFeedData((feedData) => ({
      ...feedData,
      [fieldName]: newValue,
    }));
  };

  const close = () => {
    dispatch(feedsActions.closeFeedEditor());
    setErrorMessages({});
  };

  const checkFeedNameIsUnique = () => {
    if (!feedGroups) return true;
    const duplicate = feedGroups
      .flatMap((group) => group.feeds)
      .find((feed) => feed.label === newFeedData.label);
    return (
      !duplicate ||
      // Allow the feed name to stay the same when editing a feed.
      (feedIndexOfEditingFeed !== undefined &&
        duplicate.label ===
          feedGroups[feedGroupIndexOfNewOrEditingFeed].feeds[
            feedIndexOfEditingFeed
          ].label)
    );
  };

  const addOrEditFeed = async () => {
    if (feedGroupIndexOfNewOrEditingFeed === undefined) return;

    if (
      !newFeedData.label ||
      !newFeedData.source ||
      (newFeedData.source !== FeedSource.HACKER_NEWS && !newFeedData.id) ||
      !newFeedData.updateFrequencyMinutes
    ) {
      setErrorMessages({
        all: "Necessary fields are missing. Please fill them in.",
      });
      return;
    }
    // Check that feed name is unique.
    if (!checkFeedNameIsUnique()) {
      setErrorMessages({
        feedName:
          "Please choose a different name. No two feeds can have the same name.",
      });
      return;
    }

    // Check that feed type is supported.
    const {
      data: { isSupported },
    } = await Axios.get(`/api/v1/feeds/isTypeSupported/${newFeedData.source}`);
    if (!isSupported) {
      setErrorMessages({
        feedType:
          "Feed type isn't supported. Make sure that the right API credentials are defined as environment/config variables on the server.",
      });
      return;
    }

    setErrorMessages({});

    if (feedIndexOfEditingFeed === undefined)
      dispatch(
        feedsActions.addNewFeedToFeedGroup({
          feedGroupIndex: feedGroupIndexOfNewOrEditingFeed,
          newFeed: newFeedData,
        })
      );
    else
      dispatch(
        feedsActions.finishEditingFeed({
          feedGroupIndex: feedGroupIndexOfNewOrEditingFeed,
          feedIndex: feedIndexOfEditingFeed,
          editedFeed: newFeedData,
        })
      );
  };

  const updateNewYouTubeSubChannelId: ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    setNewYouTubeSubChannelId(event.currentTarget.value);
  };

  const removeYouTubeSubChannel = (idToRemove: string) => {
    setNewFeedData((feedData) => {
      return produce(feedData, (draft) => {
        if (!draft.youtubeSubChannelIds) draft.youtubeSubChannelIds = [];
        draft.youtubeSubChannelIds = draft.youtubeSubChannelIds.filter(
          (id) => id !== idToRemove
        );
      });
    });
  };

  const saveNewYouTubeSubChannelId: FormEventHandler<HTMLFormElement> = (
    event
  ) => {
    event.preventDefault();
    if (
      !newYouTubeSubChannelId ||
      newYouTubeSubChannelId.length !== YOUTUBE_CHANNEL_ID_LENGTH
    )
      return;
    setNewFeedData((feedData) => {
      return produce(feedData, (draft) => {
        if (!draft.youtubeSubChannelIds) draft.youtubeSubChannelIds = [];
        if (
          !draft.youtubeSubChannelIds.find(
            (id) => id === newYouTubeSubChannelId
          )
        )
          draft.youtubeSubChannelIds.push(newYouTubeSubChannelId);
      });
    });
    setNewYouTubeSubChannelId("");
  };

  const submitButtonText = "Save and Close";

  let idLabel: string | undefined;
  switch (newFeedData.source) {
    case FeedSource.RSS:
      idLabel = "URL";
      break;
    case FeedSource.TWITTER:
      idLabel = "Username";
      break;
    case FeedSource.REDDIT:
      idLabel = "Subreddit";
      break;
    case FeedSource.YOUTUBE_RSS:
      idLabel = "Channel ID";
      break;
    case FeedSource.YOUTUBE_SUBS_RSS:
      idLabel = "List Name";
      break;

    // TODO also have an interface for NewsAPI like YouTube RSS (pilled typeahead).

    case FeedSource.NEWS_API:
      idLabel = "Sources (comma-separated)";
      break;
    default:
      idLabel = undefined;
      break;
  }

  return (
    <div
      {...{
        className: styles.FocusedFeedContainer,
        onClick: close,
      }}
    >
      <div
        {...{
          className: styles.FocusedFeed,
          onClick: stopPropagation,
        }}
      >
        <div
          {...{
            className: styles.FeedTitleRow,
          }}
        >
          <h3 className={styles.FeedTitle}>
            {feedIndexOfEditingFeed === undefined ? (
              <AddIcon className={sharedStyles.FluentIcon} />
            ) : (
              <EditIcon className={sharedStyles.FluentIcon} />
            )}

            <span>
              {feedIndexOfEditingFeed === undefined ? `Add Feed` : `Edit Feed`}
            </span>
          </h3>

          <div className={sharedStyles.Spacer} />

          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.Larger,
                styles.CloseButton
              ),
              onClick: close,
              ref: closeButtonRef,
            }}
          >
            ✕
          </button>
        </div>

        <div className={styles.FeedEntriesContainer}>
          <div className={sharedStyles.Spacing}>
            <div className={sharedStyles.HighlightedRow}>
              <div
                className={classNames(
                  sharedStyles.HighlightedRowValue,
                  styles.FormLabel
                )}
              >
                Name
              </div>
              <div
                className={classNames(
                  sharedStyles.HighlightedRowLabel,
                  styles.RowWithErrorMessage
                )}
              >
                <input
                  data-test="feed-editor-name-field"
                  {...{
                    className: sharedStyles.FormInput,
                    type: "text",
                    name: "label",
                    value: newFeedData.label,
                    onChange: updateFeedData,
                  }}
                />
                <div
                  {...{
                    className: classNames(styles.ErrorMessage, {
                      [styles.Show]: errorMessages.feedName,
                    }),
                  }}
                >
                  {errorMessages.feedName}
                </div>
              </div>
            </div>

            <div className={sharedStyles.HighlightedRow}>
              <div
                className={classNames(
                  sharedStyles.HighlightedRowLabel,
                  styles.FormLabel
                )}
              >
                Type
              </div>
              <div
                className={classNames(
                  sharedStyles.HighlightedRowLabel,
                  styles.RowWithErrorMessage
                )}
              >
                <select
                  {...{
                    className: classNames(
                      sharedStyles.HighlightedRowValue,
                      sharedStyles.FormInput
                    ),
                    value: newFeedData.source,
                    onChange: updateFeedData,
                    name: "source",
                  }}
                >
                  <option value={FeedSource.RSS}>RSS</option>
                  <option value={FeedSource.TWITTER}>Twitter</option>
                  <option value={FeedSource.YOUTUBE_RSS}>
                    YouTube RSS (Single channel)
                  </option>
                  <option value={FeedSource.YOUTUBE_SUBS_RSS}>
                    YouTube RSS (Many channels)
                  </option>
                  <option value={FeedSource.REDDIT}>Reddit</option>
                  <option value={FeedSource.NEWS_API}>News API</option>
                  <option value={FeedSource.HACKER_NEWS}>Hacker News</option>
                </select>
                <div
                  {...{
                    className: classNames(styles.ErrorMessage, {
                      [styles.Show]: errorMessages.feedType,
                    }),
                  }}
                >
                  {errorMessages.feedType}
                </div>
              </div>
            </div>

            {idLabel && (
              <div className={classNames(sharedStyles.HighlightedRow)}>
                <div
                  className={classNames(
                    sharedStyles.HighlightedRowValue,
                    styles.FormLabel
                  )}
                >
                  {idLabel}
                </div>
                <input
                  data-test="feed-editor-id-field"
                  className={classNames(
                    sharedStyles.HighlightedRowLabel,
                    sharedStyles.FormInput
                  )}
                  type={"text"}
                  name={"id"}
                  value={newFeedData.id}
                  onChange={updateFeedData}
                />
              </div>
            )}

            {newFeedData.source === FeedSource.YOUTUBE_SUBS_RSS && (
              <div className={sharedStyles.HighlightedRow}>
                <div className={styles.ChannelIds}>
                  {newFeedData.youtubeSubChannelIds?.map((id) => (
                    <button
                      {...{
                        key: id,
                        className: classNames(
                          sharedStyles.Button,
                          styles.YouTubeSubChannelId
                        ),
                        onClick: () => removeYouTubeSubChannel(id),
                      }}
                    >
                      <span className={styles.YouTubeSubName}>{id}</span>
                      <span className={styles.YouTubeSubRemove}>✕</span>
                    </button>
                  ))}

                  <form
                    {...{
                      onSubmit: saveNewYouTubeSubChannelId,
                      className: styles.YouTubeForm,
                    }}
                  >
                    <input
                      {...{
                        type: "text",
                        className: classNames(
                          sharedStyles.FormInput,
                          styles.YouTubeInput
                        ),
                        name: "newYoutubeSubChannelId",
                        value: newYouTubeSubChannelId,
                        onChange: updateNewYouTubeSubChannelId,
                        placeholder:
                          "24-digit YouTube channel ID (press Enter to add)",
                      }}
                    />
                  </form>
                </div>
              </div>
            )}

            <div className={sharedStyles.HighlightedRow}>
              <div className={sharedStyles.HighlightedRowLabel}>
                Update frequency (in minutes)
              </div>
              <input
                className={classNames(
                  sharedStyles.HighlightedRowValue,
                  sharedStyles.FormInput
                )}
                type={"number"}
                name={"updateFrequencyMinutes"}
                min={5}
                value={newFeedData.updateFrequencyMinutes}
                onChange={updateFeedData}
              />
            </div>

            <div className={sharedStyles.HighlightedRow}>
              <div className={sharedStyles.HighlightedRowLabel}>
                Height in grid
              </div>
              <input
                className={classNames(
                  sharedStyles.HighlightedRowValue,
                  sharedStyles.FormInput
                )}
                type={"number"}
                name={"height"}
                min={0.5}
                step={0.5}
                max={3}
                value={newFeedData.height}
                onChange={updateFeedData}
              />
            </div>

            <div className={sharedStyles.HighlightedRow}>
              <div className={sharedStyles.HighlightedRowLabel}>
                Width in grid
              </div>
              <input
                className={classNames(
                  sharedStyles.HighlightedRowValue,
                  sharedStyles.FormInput
                )}
                type={"number"}
                name={"width"}
                min={1}
                max={4}
                value={newFeedData.width}
                onChange={updateFeedData}
              />
            </div>

            <div
              className={classNames(
                sharedStyles.HighlightedRow,
                sharedStyles.Column
              )}
            >
              <div
                className={classNames(
                  sharedStyles.HighlightedRowValue,
                  styles.FormLabel
                )}
              >
                Include Regex (Optional)
              </div>

              <input
                {...{
                  className: classNames(
                    sharedStyles.FormInput,
                    styles.IncludeRegexInput
                  ),
                  type: "text",
                  name: "includeRegexString",
                  value: newFeedData.includeRegexString || "",
                  onChange: updateFeedData,
                }}
              />

              <p>
                Include only entries matching this regular expression. The
                string to be matched against is formatted as "
                <code>author: ENTRY_AUTHOR#~# text: ENTRY_TEXT#~#</code>" (note
                the #~# used as delimiters).
              </p>
            </div>
          </div>
        </div>

        <div className={styles.ButtonBar}>
          <div
            {...{
              className: classNames(styles.ErrorMessage, {
                [styles.Show]: errorMessages.all,
              }),
            }}
          >
            {errorMessages.all}
          </div>
          <button
            data-test="feed-editor-save-button"
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.Secondary
              ),
              onClick: async () => {
                setIsSavingFeed(true);
                await addOrEditFeed();
                setIsSavingFeed(false);
              },
              disabled: isSavingFeed,
            }}
          >
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
