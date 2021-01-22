import styles from "./AuthForm.module.css";
import sharedStyles from "../shared/shared.module.css";

import React, {
  useState,
  ChangeEventHandler,
  FormEventHandler,
  useRef,
  useEffect,
} from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch } from "react-redux";
import { authThunks } from "../../app/authReducer";
import { AppDispatch } from "../../app/store";

export default function AuthForm() {
  const dispatch = useDispatch<AppDispatch>();

  const currentUser = useFieldSelector("auth", "currentUser");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const isMounted = useRef(true);

  useEffect(() => {
    return function updateIsMounted() {
      isMounted.current = false;
    };
  }, []);

  const updateUsername: ChangeEventHandler<HTMLInputElement> = (event) => {
    setErrorMessage(undefined);
    setUsername(event.currentTarget.value);
  };

  const updatePassword: ChangeEventHandler<HTMLInputElement> = (event) => {
    setErrorMessage(undefined);
    setPassword(event.currentTarget.value);
  };

  const submit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await dispatch(
        (isSignup ? authThunks.signup : authThunks.login)(username, password)
      );
    } catch (e) {
      if (e.response && e.response.status === 405)
        setErrorMessage(
          "Sign up is not allowed. Please enable it on the server first."
        );
      else if (e.response && e.response.status === 429)
        setErrorMessage("Rate limit exceeded. Please try again later.");
      else
        setErrorMessage(
          isSignup
            ? "Sign up failed."
            : "Login failed. Please check your username and password."
        );
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const toggleSignup = () => {
    setIsSignup(!isSignup);
  };

  return (
    <div {...{ className: styles.Container }}>
      <form {...{ className: styles.Form, onSubmit: submit }}>
        <input
          data-test="username"
          {...{
            type: "text",
            className: classNames(sharedStyles.FormInput, styles.FormInput),
            value: username,
            onChange: updateUsername,
            placeholder: "Username",
          }}
        />
        <input
          data-test="password"
          {...{
            type: "password",
            className: classNames(sharedStyles.FormInput, styles.FormInput),
            value: password,
            onChange: updatePassword,
            placeholder: "Password",
          }}
        />

        {errorMessage ? (
          <small className={styles.ErrorMessage}>{errorMessage}</small>
        ) : undefined}

        <div {...{ className: styles.BottomBar }}>
          <button
            data-test="submit-credentials"
            {...{
              type: "submit",
              className: classNames(
                sharedStyles.Button,
                sharedStyles.Secondary,
                sharedStyles.Large
              ),
              disabled: isLoading || Boolean(currentUser),
            }}
          >
            {currentUser ? "Logged in!" : isSignup ? "Sign Up" : "Login"}
          </button>
          <div className={sharedStyles.Spacer} />
          <button
            data-test="sign-up-switch"
            {...{
              type: "button",
              className: classNames(
                sharedStyles.Button,
                sharedStyles.Large,
                sharedStyles.Clear
              ),
              onClick: toggleSignup,
            }}
          >
            Switch to {isSignup ? "Login" : "Sign Up"} ⟶
          </button>
        </div>
      </form>
    </div>
  );
}
