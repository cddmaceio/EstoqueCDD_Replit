import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { getApiBaseUrl } from "./lib/api-base-url";
import "./index.css";

setBaseUrl(getApiBaseUrl() || null);

createRoot(document.getElementById("root")!).render(<App />);
