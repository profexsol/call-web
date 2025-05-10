import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import store from "@src/redux/store";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";

window.store = store;

ReactDOM.render(
  <Provider store={store}>
    <App />
    <ToastContainer />
  </Provider>,
  document.getElementById("root")
);
