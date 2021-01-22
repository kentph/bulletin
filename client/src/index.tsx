import "./features/shared/variables.module.css";
import "./index.module.css";

import React from "react";
import ReactDOM from "react-dom";
import App from "./app/App";
import * as serviceWorker from "./serviceWorker";
import Axios from "axios";
import { Provider } from "react-redux";
import store from "./app/store";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Set up axios config first thing.
if (process.env.REACT_APP_SERVER_URL)
  Axios.defaults.baseURL = process.env.REACT_APP_SERVER_URL;

// Suppress console logs in prod.
if (process.env.NODE_ENV !== "development") {
  console.log = () => {};
}

const render = () => {
  // TODO hot reloading.
  // const App = require("./app/App").default;

  ReactDOM.render(
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>
          <App />
        </Provider>
      </DndProvider>
    </React.StrictMode>,
    document.getElementById("root")
  );
};

render();

// TODO hot reloading.
// if (process.env.NODE_ENV === "development" && module.hot) {
//   module.hot.accept("./app/App", render);
// }

// let timer: number | undefined;
// window.addEventListener('scroll', () => {
//   if (timer !== undefined) {
//     window.clearTimeout(timer);
//   }
//   else
//     document.body.classList.add(styles.DisableHover);
//   timer = window.setTimeout(function () {
//     document.body.classList.remove(styles.DisableHover);
//     timer = undefined;
//   }, 300);
// });

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
