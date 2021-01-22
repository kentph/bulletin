import styles from "./MenuBar.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as Logo } from "../../assets/logo.svg";
import { ReactComponent as PieIcon } from "../../assets/ic_fluent_data_pie_24_regular.svg";
import { ReactComponent as SettingsIcon } from "../../assets/ic_fluent_options_24_regular.svg";
import { ReactComponent as StarIcon } from "../../assets/ic_fluent_star_24_regular.svg";
import { ReactComponent as EditIcon } from "../../assets/ic_fluent_edit_24_regular.svg";

import React, {
  useState,
  useRef,
  useCallback,
  TouchEventHandler,
  EventHandler,
  useEffect,
  SyntheticEvent,
} from "react";
import classNames from "classnames";
import Settings from "./Settings";
import TimeSpent from "../statistics/TimeSpent";
import TimeSpentMini from "../statistics/TimeSpentMini";
import MostActiveFeeds from "./MostActiveFeeds";
import GlobalHotkeysStatusMini from "../hotkeys/GlobalHotkeysStatusMini";
import GlobalHotkeysStatus from "../hotkeys/GlobalHotkeysStatus";
import TimeSpentByFeed from "../statistics/TimeSpentByFeed";
import TimeSpentVisual from "../statistics/TimeSpentVisual";
import AuthForm from "../auth/AuthForm";
import CurrentUserView from "./CurrentUserView";
import StarredListView from "./StarredListView";
import ClientNameForm from "../auth/ClientNameForm";
import useFieldSelector from "../shared/useFieldSelector";
import { feedsActions } from "../../app/feedsReducer";
import { useDispatch } from "react-redux";
import EditingBar from "./EditingBar";

// TODO have this use the same value as the css variable.
// https://github.com/kentph/bulletin/issues/215

const OPEN_ANIMATION_DURATION = 100; /* ms */
const CLOSE_ANIMATION_DURATION = 1000; /* ms */
const SWIPE_DISPLACEMENT_THRESHOLD = 70; /* px */

type Props = {
  refresh: () => void;
  scrollFeedGroupsBack: () => void;
  scrollFeedGroupsForward: () => void;
};

enum SubMenu {
  STATISTICS = "STATISTICS",
  SETTINGS = "SETTINGS",
  STARRED = "STARRED",
}

const stopPropagation: EventHandler<SyntheticEvent> = (event) => {
  event.stopPropagation();
};

export default function MenuBar({
  scrollFeedGroupsBack,
  scrollFeedGroupsForward,
}: Props) {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const currentUser = useFieldSelector("auth", "currentUser");
  const client = useFieldSelector("auth", "client");
  const loginSuccessful = useFieldSelector("auth", "wasLoginSuccessful");
  const focusedFeedCoordinates = useFieldSelector(
    "feeds",
    "focusedFeedCoordinates"
  );
  const isFeedEditingModeOn = useFieldSelector("feeds", "isFeedEditingModeOn");
  const feedGroups = useFieldSelector("feeds", "feedGroups");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<SubMenu>();
  const [shouldShowMenuContent, setShouldShowMenuContent] = useState(false);

  const menuElementRef = useRef<HTMLDivElement>(null);
  const initialTransformY = useRef<number>();
  const previousTransformY = useRef<number>();
  const previousY = useRef<number>();
  const animationFrameId = useRef<number>();
  const touchStartedAt = useRef<number>();

  useEffect(
    function resetSubMenuStateWhenMenuClosed() {
      if (!isMenuOpen) setSubMenu(undefined);
    },
    [isMenuOpen]
  );

  // TODO also call setMenuHeightAccordingToWindowHeight in onresize?

  /**
   * On iOS Safari, the actual viewable height may be less than 100vh
   * because the address bar and the bottom bar slide in when the user
   * scrolls a certain way. To combat this, we set the menu's height
   * to the actual viewable height every time the menu is about to open.
   */
  const setMenuHeightAccordingToWindowHeight = useCallback(() => {
    // Figure out screen height and set menu to proper height.
    const height = window.innerHeight;
    const menuElement = menuElementRef.current;
    if (menuElement) menuElement.style.height = `${height}px`;
  }, []);

  useEffect(
    function setMenuHeightImmediately() {
      setMenuHeightAccordingToWindowHeight();
    },
    [setMenuHeightAccordingToWindowHeight]
  );

  const setMenuLayoutAndToggleMenu = useCallback(
    (toOpen: boolean) => {
      if (toOpen) {
        setMenuHeightAccordingToWindowHeight();
      }
      setIsMenuOpen(toOpen);
    },
    [setMenuHeightAccordingToWindowHeight]
  );

  const toggleMenu = useCallback(() => {
    setMenuLayoutAndToggleMenu(!isMenuOpen);
  }, [isMenuOpen, setMenuLayoutAndToggleMenu]);

  useEffect(
    function handleMenuContentVisibility() {
      let timeoutId: number | undefined;
      if (isMenuOpen) {
        timeoutId = window.setTimeout(() => {
          setShouldShowMenuContent(true);
        }, OPEN_ANIMATION_DURATION);
      } else {
        timeoutId = window.setTimeout(() => {
          setShouldShowMenuContent(false);
        }, CLOSE_ANIMATION_DURATION);
      }
      return function cancelHidingMenuContent() {
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    },
    [isMenuOpen]
  );

  const handleTouchStart: TouchEventHandler = useCallback(
    (event) => {
      // Correct menu height each time a new touch is started.
      setMenuHeightAccordingToWindowHeight();

      setShouldShowMenuContent(true);

      const menuElement = menuElementRef.current;
      if (!menuElement) return;

      menuElement.classList.add(styles.Dragging);

      const touches = event.targetTouches;
      if (touches.length > 1) return;
      // https://stackoverflow.com/a/42267490
      const currentTransformMatrix = window
        .getComputedStyle(menuElement)
        .getPropertyValue("transform")
        .match(/(-?[0-9.]+)/g);
      const currentTransformY = currentTransformMatrix
        ? Number(currentTransformMatrix[5])
        : 0;

      previousTransformY.current = currentTransformY;
      initialTransformY.current = currentTransformY;
      previousY.current = event.targetTouches[0].screenY;
      touchStartedAt.current = performance.now();
    },
    [setMenuHeightAccordingToWindowHeight]
  );

  const handleTouchDrag: TouchEventHandler = useCallback((event) => {
    const menuElement = menuElementRef.current;
    if (!menuElement) return;
    const touches = event.targetTouches;
    if (touches.length > 1) return;
    const touchY = touches[0].screenY;

    if (previousY.current === undefined) previousY.current = touchY;

    const deltaY = touchY - previousY.current;

    if (previousTransformY.current === undefined) return;

    const newY = Math.max(previousTransformY.current + deltaY, 0);

    if (animationFrameId.current)
      window.cancelAnimationFrame(animationFrameId.current);

    animationFrameId.current = window.requestAnimationFrame(() => {
      menuElement.style.transform = `translate3d(0,${newY}px,0)`;
    });

    previousTransformY.current = newY;
    previousY.current = touchY;
  }, []);

  const handleTouchEnd: TouchEventHandler = useCallback(() => {
    if (animationFrameId.current)
      window.cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = undefined;

    menuElementRef.current?.classList.remove(styles.Dragging);

    if (
      initialTransformY.current !== undefined &&
      previousTransformY.current !== undefined
    ) {
      const currentTouchStartedAt = touchStartedAt.current;
      touchStartedAt.current = undefined;
      const isTap =
        currentTouchStartedAt &&
        performance.now() - currentTouchStartedAt < 200 &&
        Math.abs(initialTransformY.current - previousTransformY.current) < 5;

      // TODO use the velocity of the swipe instead of the net displacement
      // when figuring out whether to open of close the menu.

      if (
        !isMenuOpen &&
        (isTap ||
          initialTransformY.current - previousTransformY.current >
            SWIPE_DISPLACEMENT_THRESHOLD)
      )
        setIsMenuOpen(true);
      else if (
        isMenuOpen &&
        initialTransformY.current - previousTransformY.current <
          -SWIPE_DISPLACEMENT_THRESHOLD
      )
        setIsMenuOpen(false);
    }

    if (menuElementRef.current) menuElementRef.current.style.transform = "";

    previousY.current = undefined;
    previousTransformY.current = undefined;
    initialTransformY.current = undefined;
  }, [isMenuOpen]);

  const turnOnEditingMode = () => {
    dispatch(feedsActions.setFeedEditingMode(true));
    setIsMenuOpen(false);
  };

  const showStatistics = () => {
    setSubMenu(SubMenu.STATISTICS);
  };

  const showSettings = () => {
    setSubMenu(SubMenu.SETTINGS);
  };

  const showStarredList = () => {
    setSubMenu(SubMenu.STARRED);
  };

  const goBackToMainMenu = () => {
    setSubMenu(undefined);
  };

  let subMenuView: JSX.Element | undefined;
  switch (subMenu) {
    case SubMenu.STATISTICS:
      subMenuView = (
        <div className={styles.SubMenuContainer}>
          <TimeSpent />
          <TimeSpentByFeed />
          <MostActiveFeeds />
        </div>
      );
      break;
    case SubMenu.SETTINGS:
      subMenuView = (
        <div className={styles.SubMenuContainer}>
          <Settings />
          <GlobalHotkeysStatus />
        </div>
      );
      break;
    case SubMenu.STARRED:
      subMenuView = (
        <div className={styles.SubMenuContainer}>
          <StarredListView />{" "}
        </div>
      );
      break;
  }

  const keepMenuOpen = currentUser === null || client === null;

  return (
    <div
      data-test="menu-bar"
      data-test-is-open={isMenuOpen || keepMenuOpen ? "true" : "false"}
      {...{
        className: classNames(styles.MenuBar, {
          [styles.Open]: isMenuOpen || keepMenuOpen,
          [styles.Animate]: loginSuccessful,
        }),
        ref: menuElementRef,
        onTouchStart: !keepMenuOpen ? handleTouchStart : undefined,
        onTouchMove: !keepMenuOpen ? handleTouchDrag : undefined,
        onTouchEnd: !keepMenuOpen ? handleTouchEnd : undefined,
        onTouchCancel: !keepMenuOpen ? handleTouchEnd : undefined,
      }}
    >
      <div {...{ className: styles.MenuBarContent }}>
        <div
          {...{
            className: classNames(styles.MenuBarTitle, {
              [styles.KeepOpen]: keepMenuOpen,
              [styles.Animate]: loginSuccessful,
            }),
          }}
        >
          {!isMobile && isFeedEditingModeOn ? (
            <EditingBar
              {...{ scrollFeedGroupsBack, scrollFeedGroupsForward }}
            />
          ) : (
            <>
              <div className={styles.MenuBarTitleContentContainer}>
                <div className={styles.MenuBarTitleContent}>
                  <Logo
                    {...{
                      className: classNames(styles.MenuBarLogo),
                    }}
                  />

                  {!isMobile &&
                  !isMenuOpen &&
                  focusedFeedCoordinates !== undefined &&
                  feedGroups &&
                  feedGroups.length > 1 ? (
                    <>
                      <div {...{ className: sharedStyles.Divider }} />

                      <button
                        {...{
                          className: classNames(
                            sharedStyles.Button,
                            styles.MenuBarButton
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
                            styles.MenuBarButton
                          ),
                          onClick: scrollFeedGroupsForward,
                        }}
                      >
                        →
                      </button>

                      <span {...{ className: styles.GroupText }}>
                        Group{" "}
                        <strong>{focusedFeedCoordinates.group + 1}</strong> of{" "}
                        {feedGroups.length}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {!keepMenuOpen ? (
                <>
                  <div className={styles.MenuBarTitleContentContainer}>
                    <div
                      {...{
                        className: classNames(
                          styles.MenuBarTitleContent,
                          styles.MenuBarTitleCenterContent
                        ),
                      }}
                    >
                      <TimeSpentMini />
                      <span className={styles.MenuBarDot}>·</span>
                      <GlobalHotkeysStatusMini />
                    </div>
                  </div>

                  <div
                    className={classNames(
                      styles.MenuBarTitleContentContainer,
                      styles.MenuBarButtonContainer
                    )}
                  >
                    <div
                      {...{
                        className: classNames(
                          styles.MenuBarTitleContent,
                          styles.MenuBarButtons
                        ),
                        onClick: stopPropagation,
                      }}
                    >
                      {!isMobile && feedGroups?.length ? (
                        <button
                          {...{
                            className: classNames(
                              sharedStyles.Button,
                              sharedStyles.IconButton,
                              styles.MenuBarButton
                            ),
                            onClick: turnOnEditingMode,
                          }}
                        >
                          <EditIcon className={sharedStyles.FluentIcon} />
                          <span>Arrange/Edit Feeds</span>
                        </button>
                      ) : undefined}
                      <button
                        data-test="toggle-menu"
                        {...{
                          className: classNames(
                            sharedStyles.Button,
                            isMobile && sharedStyles.Larger,
                            styles.MenuBarButton,
                            styles.ToggleMenuButton
                          ),
                          onClick: toggleMenu,
                        }}
                      >
                        {isMenuOpen || keepMenuOpen
                          ? `✕${isMobile ? "" : "  Close"}`
                          : `☰${isMobile ? "" : "  Menu"}`}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.MenuBarTitleContentContainer} />
              )}
            </>
          )}
        </div>

        {shouldShowMenuContent || keepMenuOpen ? (
          currentUser && client ? (
            <>
              <div
                {...{
                  className: classNames(styles.MenuBarMiddleContentContainer, {
                    [styles.NoScroll]: isMobile && !subMenu,
                  }),
                  onTouchStart:
                    !isMobile || subMenu ? stopPropagation : undefined,
                  onTouchMove:
                    !isMobile || subMenu ? stopPropagation : undefined,
                  onTouchEnd:
                    !isMobile || subMenu ? stopPropagation : undefined,
                  onTouchCancel:
                    !isMobile || subMenu ? stopPropagation : undefined,
                }}
              >
                {isMobile ? (
                  <div
                    className={classNames(styles.MenuBarMiddleContent, {
                      [styles.Fill]: isMobile && !subMenu,
                    })}
                  >
                    {!subMenu ? (
                      <>
                        <CurrentUserView />

                        <div className={styles.Statistics}>
                          <TimeSpentVisual />
                          <div className={styles.MenuButtons}>
                            <button
                              data-test="more-stats"
                              {...{
                                className: classNames(
                                  sharedStyles.Button,
                                  sharedStyles.Larger,
                                  styles.MenuButton
                                ),
                                onClick: showStatistics,
                              }}
                            >
                              <PieIcon
                                className={classNames(
                                  sharedStyles.FluentIcon,
                                  styles.MenuButtonIcon
                                )}
                              />
                              More Stats
                            </button>
                            <button
                              {...{
                                className: classNames(
                                  sharedStyles.Button,
                                  sharedStyles.Larger,
                                  styles.MenuButton
                                ),
                                onClick: showSettings,
                              }}
                            >
                              <SettingsIcon
                                className={classNames(
                                  sharedStyles.FluentIcon,
                                  styles.MenuButtonIcon
                                )}
                              />
                              Settings
                            </button>
                            <button
                              {...{
                                className: classNames(
                                  sharedStyles.Button,
                                  sharedStyles.Larger,
                                  styles.MenuButton
                                ),
                                onClick: showStarredList,
                              }}
                            >
                              <StarIcon
                                className={classNames(
                                  sharedStyles.FluentIcon,
                                  styles.MenuButtonIcon
                                )}
                              />
                              Starred
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      subMenuView
                    )}
                  </div>
                ) : subMenu ? (
                  <div
                    className={classNames(styles.MenuBarMiddleContent, {
                      [styles.Fill]: isMobile && !subMenu,
                    })}
                  >
                    {subMenuView}
                  </div>
                ) : (
                  <>
                    <div className={styles.MenuBarMiddleContent}>
                      <TimeSpent />
                      <TimeSpentByFeed />
                      <MostActiveFeeds />
                    </div>
                    <div className={styles.MenuBarMiddleContent}>
                      <CurrentUserView />

                      <div className={sharedStyles.Spacing}>
                        <h3 className={sharedStyles.IconButton}>
                          <StarIcon className={sharedStyles.FluentIcon} />
                          <span>Starred</span>
                        </h3>
                        <button
                          {...{
                            className: classNames(
                              sharedStyles.Button,
                              sharedStyles.Large,
                              styles.StarredButton
                            ),
                            onClick: showStarredList,
                          }}
                        >
                          Show starred entries ⟶
                        </button>
                      </div>

                      <Settings />
                      <GlobalHotkeysStatus />
                    </div>
                  </>
                )}
              </div>
              {subMenu && (
                <div
                  {...{
                    className: styles.MenuBarFooter,
                    onTouchStart:
                      !isMobile || subMenu ? stopPropagation : undefined,
                    onTouchMove:
                      !isMobile || subMenu ? stopPropagation : undefined,
                    onTouchEnd:
                      !isMobile || subMenu ? stopPropagation : undefined,
                    onTouchCancel:
                      !isMobile || subMenu ? stopPropagation : undefined,
                  }}
                >
                  <button
                    data-test="menu-back-button"
                    {...{
                      className: classNames(
                        sharedStyles.Button,
                        sharedStyles.Large
                      ),
                      onClick: goBackToMainMenu,
                    }}
                  >
                    ⟵ Back
                  </button>

                  <div className={sharedStyles.Spacer} />

                  <button
                    className={classNames(
                      sharedStyles.Button,
                      sharedStyles.Larger
                    )}
                    onClick={toggleMenu}
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          ) : currentUser === null ? (
            <AuthForm />
          ) : client === null ? (
            <ClientNameForm />
          ) : undefined
        ) : undefined}
      </div>
    </div>
  );
}
