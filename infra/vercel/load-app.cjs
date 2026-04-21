const path = require("node:path");
const { pathToFileURL } = require("node:url");

let appPromise;

module.exports = function loadApp() {
  if (!appPromise) {
    const appUrl = pathToFileURL(
      path.resolve(__dirname, "../../apps/api/dist/app.mjs"),
    ).href;

    appPromise = import(appUrl).then((mod) => mod.default);
  }

  return appPromise;
};
