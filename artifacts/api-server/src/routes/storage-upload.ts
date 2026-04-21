import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/admin-auth";
import {
  createSignedUploadTarget,
  getDefaultUploadBucket,
} from "../lib/upload-storage";

const router: IRouter = Router();

router.post("/uploads/storage/sign", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const { category, fileName } = req.body as {
    category?: string;
    fileName?: string;
  };

  if (!category || !fileName) {
    res.status(400).json({ error: "category e fileName sao obrigatorios" });
    return;
  }

  try {
    const target = await createSignedUploadTarget(category, fileName);
    res.json({
      bucket: target.bucket,
      path: target.path,
      token: target.token,
      defaultBucket: getDefaultUploadBucket(),
    });
  } catch (error) {
    req.log.error({ error }, "failed to create storage upload target");
    res
      .status(500)
      .json({ error: "Nao foi possivel preparar o upload no Storage." });
  }
});

export default router;
