const loadApp = require("../infra/vercel/load-app.cjs");

async function handler(req, res) {
  const app = await loadApp();
  return app(req, res);
}

handler.config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

module.exports = handler;
