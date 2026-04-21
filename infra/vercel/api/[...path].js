let appPromise;

function loadApp() {
  if (!appPromise) {
    appPromise = import("../../../apps/api/dist/app.mjs").then(
      (mod) => mod.default,
    );
  }

  return appPromise;
}

module.exports = async function handler(req, res) {
  const app = await loadApp();
  return app(req, res);
};

module.exports.config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};
