import sharedStyles from "../shared/shared.module.css";
import styles from "./AuthForm.module.css";

import React, {
  ChangeEventHandler,
  Fragment,
  useCallback,
  useEffect,
  useState,
} from "react";
import Axios from "axios";
import classNames from "classnames";
import { Client } from "../../types/userTypes";
import { authThunks, EMPTY_NAME_ERROR_MESSAGE } from "../../app/authReducer";
import { useDispatch } from "react-redux";

export default function ClientNameForm() {
  const dispatch = useDispatch();

  const [clients, setClients] = useState<Client[]>();
  const [newClientName, setNewClientName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(function fetchClients() {
    let isMounted = true;
    const tokenSource = Axios.CancelToken.source();
    (async () => {
      try {
        const { data } = await Axios.get("/api/v1/clients/mine", {
          cancelToken: tokenSource.token,
        });
        if (isMounted) setClients(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return function cleanupFetch() {
      isMounted = false;
      tokenSource.cancel("from unmount");
    };
  }, []);

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setErrorMessage(undefined);
      setNewClientName(event.currentTarget.value);
    },
    []
  );

  return (
    <div {...{ className: styles.Container }}>
      <form
        {...{
          className: styles.Form,
          onSubmit: async (event) => {
            try {
              setIsDisabled(true);
              event.preventDefault();
              await dispatch(authThunks.setClientByName(newClientName));
            } catch (e) {
              if (e.message === EMPTY_NAME_ERROR_MESSAGE)
                setErrorMessage("Client name cannot be empty.");
              else setErrorMessage("An error occured. Please try again.");
            } finally {
              setIsDisabled(false);
            }
          },
        }}
      >
        <h3>What should we call this client?</h3>
        <p>
          To track time spent in Bulletin separately between your devices, we
          need you to give this device a name.
        </p>
        {clients && clients.length ? (
          <>
            <h5>Choose an existing client</h5>
            <p>
              You can choose an existing client if you'd like to combine usage
              time with that device.
            </p>
            {clients?.map((client) => (
              <Fragment key={client._id}>
                <label htmlFor={client._id}>
                  <input
                    {...{
                      type: "radio",
                      name: "clients",
                      className: styles.RadioInput,
                      value: client.name,
                      id: client._id,
                      onChange,
                      checked: newClientName === client.name,
                    }}
                  />
                  {client.name}
                </label>
              </Fragment>
            ))}
            <br></br>
          </>
        ) : undefined}

        <h5>Add a new client</h5>
        <p>
          {clients && clients.length
            ? "Or if you'd like to track this device as a new client, enter a new name."
            : "Enter a name for your first client."}
        </p>
        <input
          data-test="new-client-name"
          {...{
            type: "text",
            className: classNames(sharedStyles.FormInput, styles.FormInput),
            value: newClientName,
            onChange,
          }}
        />

        {errorMessage ? (
          <small className={styles.ErrorMessage}>{errorMessage}</small>
        ) : undefined}

        <div {...{ className: styles.BottomBar }}>
          <button
            data-test="submit-client-name"
            {...{
              type: "submit",
              className: classNames(sharedStyles.Button, sharedStyles.Large),
              disabled: isDisabled,
            }}
          >
            Set Client Name
          </button>
        </div>
      </form>
    </div>
  );
}
