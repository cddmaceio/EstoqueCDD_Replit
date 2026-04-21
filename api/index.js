import app from "../artifacts/api-server/dist/app.mjs";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default app;
