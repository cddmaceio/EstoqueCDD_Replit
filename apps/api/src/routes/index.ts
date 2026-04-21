import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import estoqueRouter from "./estoque";
import uploadRouter from "./upload";
import basesUploadRouter from "./bases-upload";
import gradeRouter from "./grade";
import storageUploadRouter from "./storage-upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(estoqueRouter);
router.use(uploadRouter);
router.use(basesUploadRouter);
router.use(gradeRouter);
router.use(storageUploadRouter);

export default router;
