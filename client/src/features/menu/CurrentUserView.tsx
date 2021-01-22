import styles from "./CurrentUserView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as UserIcon } from "../../assets/ic_fluent_person_24_regular.svg";

import React from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";
import { logout } from "../../app/authReducer";

export default function CurrentUserView() {
  const currentUser = useFieldSelector("auth", "currentUser");

  const confirmAndLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return currentUser ? (
    <div {...{ className: styles.Container }}>
      <div {...{ className: sharedStyles.IconButton }}>
        <UserIcon
          className={classNames(
            sharedStyles.FluentIcon,
            sharedStyles.Secondary
          )}
        />
        <span>Logged in as&nbsp;</span>
        <strong>{currentUser.username}</strong>
      </div>
      <div className={classNames(styles.Spacer, sharedStyles.Spacer)} />
      <button
        data-test="logout"
        {...{
          className: classNames(
            sharedStyles.Button,
            sharedStyles.Large,
            styles.LogoutButton
          ),
          onClick: confirmAndLogout,
        }}
      >
        Log out
      </button>
    </div>
  ) : null;
}
