import { enableTms, enableReportingOfCypressScreenshots } from "./events/index.js";
import { isTmsInitialized, setTmsInitialized } from "./state.js";

export const initializeTms = () => {
  if (isTmsInitialized()) {
    return;
  }

  setTmsInitialized();

  enableTms();
  enableReportingOfCypressScreenshots();
};
