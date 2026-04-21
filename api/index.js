import app from "../apps/api/dist/app.mjs";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default app;
