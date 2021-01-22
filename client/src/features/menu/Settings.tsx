import styles from "./Settings.module.css";
import sharedStyles from "../shared/shared.module.css";
import variableStyles from "../shared/variables.module.css";
import { ReactComponent as SettingsIcon } from "../../assets/ic_fluent_options_24_regular.svg";
import { ReactComponent as ReadAloudIcon } from "../../assets/ic_fluent_read_aloud_24_regular.svg";
import { ReactComponent as ArchiveIcon } from "../../assets/ic_fluent_archive_24_regular.svg";

import React, {
  useEffect,
  ChangeEventHandler,
  useState,
  MouseEventHandler,
} from "react";
import classNames from "classnames";
import Axios from "axios";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { settingsThunks } from "../../app/settingsReducer";

export default function Settings() {
  const dispatch = useDispatch();

  const settings = useSelector((state: RootState) => state.settings);

  const [voices, setVoices] = useState(window.speechSynthesis.getVoices());

  useEffect(function addListenerToUpdateVoices() {
    // HACK because the above voiceschanged event listener isn't working,
    // need to manually trigger a getVoices call.

    let timeoutId: number;
    let iteration = 0;

    const updateVoices = () => {
      const newVoices = window.speechSynthesis.getVoices();

      if (newVoices.length || iteration >= 10) {
        setVoices(newVoices);
        window.clearInterval(timeoutId);
      }

      iteration += 1;
    };

    timeoutId = window.setInterval(updateVoices, 5000);
    return function cleanupTimeout() {
      window.clearInterval(timeoutId);
    };
  }, []);

  const [alwaysCollapseRead, setAlwaysCollapseRead] = useState(false);
  const [showUnreadFirst, setShowUnreadFirst] = useState(false);
  const [shouldShowSmallEntries, setShouldShowSmallEntries] = useState(false);
  const [dontLoadImmediately, setDontLoadImmediately] = useState(false);
  const [showReopenLastVisited, setShowReopenLastVisited] = useState(false);
  const [openLinksInSameWindow, setOpenLinksInSameWindow] = useState(false);
  const [themeClass, setThemeClass] = useState(variableStyles.Cork);
  const [feedsToAnnounce, setFeedsToAnnounce] = useState<string[]>([]);
  const [muteFeedAnnouncements, setMuteFeedAnnouncements] = useState(false);
  const [hideStickyHeaders, setHideStickyHeaders] = useState(false);
  const [showBottomBars, setShowBottomBars] = useState(false);
  const [voiceURI, setVoiceURI] = useState("default");
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveDate, setArchiveDate] = useState<Date>();

  const updateSetting: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newValue = event.target.checked;
    const key = event.target.name;

    dispatch(
      settingsThunks.setSettingsAndSave((settings) => ({
        ...settings,
        [key]: newValue,
      }))
    );

    switch (key) {
      case "alwaysCollapseRead":
        setAlwaysCollapseRead(newValue);
        break;
      case "showUnreadFirst":
        setShowUnreadFirst(newValue);
        break;
      case "dontLoadImmediately":
        setDontLoadImmediately(newValue);
        break;
      case "shouldShowSmallEntries":
        setShouldShowSmallEntries(newValue);
        break;
      case "showReopenLastVisited":
        setShowReopenLastVisited(newValue);
        break;
      case "openLinksInSameWindow":
        setOpenLinksInSameWindow(newValue);
        break;
      case "muteFeedAnnouncements":
        setMuteFeedAnnouncements(newValue);
        break;
      case "hideStickyHeaders":
        setHideStickyHeaders(newValue);
        break;
      case "showBottomBars":
        setShowBottomBars(newValue);
        break;
    }
  };

  const removeFeedToAnnounce: MouseEventHandler<HTMLButtonElement> = (
    event
  ) => {
    const feedNameToRemove = event.currentTarget.id;
    const newFeedsToAnnounce = (settings.feedsToAnnounce || []).filter(
      (feedName) => feedName !== feedNameToRemove
    );
    setFeedsToAnnounce(newFeedsToAnnounce);
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => ({
        ...settings,
        feedsToAnnounce: newFeedsToAnnounce,
      }))
    );
  };

  useEffect(
    function keepUpdated() {
      // If the new value is the same as the old value then no new render is triggered.
      setAlwaysCollapseRead(settings.alwaysCollapseRead || false);
      setShowUnreadFirst(settings.showUnreadFirst || false);
      setDontLoadImmediately(settings.dontLoadImmediately || false);
      setShouldShowSmallEntries(settings.shouldShowSmallEntries || false);
      setShowReopenLastVisited(settings.showReopenLastVisited || false);
      setOpenLinksInSameWindow(settings.openLinksInSameWindow || false);
      setThemeClass(settings.themeClass || variableStyles.Cork);
      setFeedsToAnnounce(settings.feedsToAnnounce || []);
      setMuteFeedAnnouncements(settings.muteFeedAnnouncements || false);
      setVoiceURI(settings.voice || "default");
      setHideStickyHeaders(settings.hideStickyHeaders || false);
      setShowBottomBars(settings.showBottomBars || false);
    },
    [
      settings.alwaysCollapseRead,
      settings.dontLoadImmediately,
      settings.showUnreadFirst,
      settings.shouldShowSmallEntries,
      settings.themeClass,
      settings.showReopenLastVisited,
      settings.openLinksInSameWindow,
      settings.feedsToAnnounce,
      settings.muteFeedAnnouncements,
      settings.voice,
      settings.hideStickyHeaders,
      settings.showBottomBars,
    ]
  );

  const changeTheme: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const newValue = event.target.value;
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => ({
        ...settings,
        themeClass: newValue,
      }))
    );
    setThemeClass(newValue);
  };

  const changeVoice: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const newValue = event.target.value;
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => ({
        ...settings,
        voice: newValue,
      }))
    );
    setVoiceURI(newValue);
  };

  return (
    <>
      <h3 className={sharedStyles.IconButton}>
        <SettingsIcon className={sharedStyles.FluentIcon} />
        <span>General</span>
      </h3>

      <div className={sharedStyles.Spacing}>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Hide read entries
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {alwaysCollapseRead ? "Yes " : "No "}
              <input
                type="checkbox"
                name="alwaysCollapseRead"
                checked={alwaysCollapseRead}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Show unread first
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {showUnreadFirst ? "Yes " : "No "}
              <input
                type="checkbox"
                name="showUnreadFirst"
                checked={showUnreadFirst}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Don't load feeds on launch
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {dontLoadImmediately ? "Yes " : "No "}
              <input
                type="checkbox"
                name="dontLoadImmediately"
                checked={dontLoadImmediately}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Show compact entries
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {shouldShowSmallEntries ? "Yes " : "No "}
              <input
                type="checkbox"
                name="shouldShowSmallEntries"
                checked={shouldShowSmallEntries}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Show link to reopen last visited entry
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {showReopenLastVisited ? "Yes " : "No "}
              <input
                type="checkbox"
                name="showReopenLastVisited"
                checked={showReopenLastVisited}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Open links in this tab
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {openLinksInSameWindow ? "Yes " : "No "}
              <input
                type="checkbox"
                name="openLinksInSameWindow"
                checked={openLinksInSameWindow}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Hide sticky headers
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {hideStickyHeaders ? "Yes " : "No "}
              <input
                type="checkbox"
                name="hideStickyHeaders"
                checked={hideStickyHeaders}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>
            Show feed bottom bars
          </div>
          <div className={sharedStyles.HighlightedRowValue}>
            <label>
              {showBottomBars ? "Yes " : "No "}
              <input
                type="checkbox"
                name="showBottomBars"
                checked={showBottomBars}
                onChange={updateSetting}
              />
            </label>
          </div>
        </div>
        <div className={sharedStyles.HighlightedRow}>
          <div className={sharedStyles.HighlightedRowLabel}>Theme</div>
          <div className={sharedStyles.HighlightedRowValue}>
            <select
              className={sharedStyles.FormInput}
              value={themeClass}
              onChange={changeTheme}
            >
              <option value={variableStyles.Cork}>Cork</option>
              <option value={variableStyles.Dark}>Dark</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.VoiceSettings}>
        <h3 className={sharedStyles.IconButton}>
          <ReadAloudIcon className={sharedStyles.FluentIcon} />
          <span>Read Aloud</span>
        </h3>

        <p>
          When the page is inactive, the following feeds will continue to
          refresh, and new entries will be read out loud.
        </p>
        <p>
          Some browsers will throttle refreshes if the tab is in background, so
          if you want timely refreshes, keep this tab visible, or move it to its
          own window.
        </p>

        {feedsToAnnounce.length ? (
          <div className={sharedStyles.Spacing}>
            {feedsToAnnounce.map((feedName) => {
              return (
                <div className={sharedStyles.HighlightedRow} key={feedName}>
                  <div className={sharedStyles.HighlightedRowLabel}>
                    {feedName}
                  </div>
                  <div className={sharedStyles.HighlightedRowValue}>
                    <button
                      {...{
                        className: classNames(
                          sharedStyles.Button,
                          sharedStyles.Large
                        ),
                        onClick: removeFeedToAnnounce,
                        id: feedName,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>{`To add a feed, go to the feed's Options > Announce new entries.`}</p>
        )}

        <div className={sharedStyles.Spacing}>
          <div className={sharedStyles.HighlightedRow}>
            <div className={sharedStyles.HighlightedRowLabel}>
              Mute all feed announcements
            </div>
            <div className={sharedStyles.HighlightedRowValue}>
              <label>
                {muteFeedAnnouncements ? "Yes " : "No "}
                <input
                  type="checkbox"
                  name="muteFeedAnnouncements"
                  checked={muteFeedAnnouncements}
                  onChange={updateSetting}
                />
              </label>
            </div>
          </div>
          <div className={sharedStyles.HighlightedRow}>
            <div className={sharedStyles.HighlightedRowLabel}>Voice</div>
            <div className={sharedStyles.HighlightedRowValue}>
              <select
                className={sharedStyles.FormInput}
                value={voiceURI}
                onChange={changeVoice}
              >
                <option value={"default"}>Default</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {process.env.REACT_APP_DB_CLIENT === "postgresHeroku" ? (
        <div className={sharedStyles.Spacing}>
          <h3 className={sharedStyles.IconButton}>
            <ArchiveIcon className={sharedStyles.FluentIcon} />
            <span>Archive</span>
          </h3>
          <p>
            If you're running close to the Heroku Postgres row limit, you can
            archive <code>interval</code> and <code>entry_status</code> rows
            older than 1 day ago as JSON. These rows will be deleted, and a JSON
            representation will be stored in the <code>archive</code> table.
            Note that archived data will no longer be accounted for in usage
            statistics.
          </p>
          <button
            {...{
              className: classNames(sharedStyles.Button, sharedStyles.Large),
              onClick: async () => {
                if (
                  window.confirm(
                    "Are you sure you want to archive? Data will no longer be accounted for in usage statistics."
                  )
                ) {
                  try {
                    setIsArchiving(true);
                    const {
                      data: { archivedAt },
                    } = await Axios.post("/api/v1/archives");
                    setArchiveDate(archivedAt);
                  } finally {
                    setIsArchiving(false);
                  }
                }
              },
              disabled: isArchiving,
            }}
          >
            Archive
          </button>
          {archiveDate ? (
            <p>Last archived at {moment(archiveDate).format()}</p>
          ) : undefined}
        </div>
      ) : undefined}
    </>
  );
}
