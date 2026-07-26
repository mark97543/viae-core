import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WaypointProvider } from "./context/WaypointContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WaypointProvider>
      <App />
    </WaypointProvider>
  </React.StrictMode>,
);
