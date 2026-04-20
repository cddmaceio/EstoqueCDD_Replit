import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import estoqueRouter from "./estoque";
import uploadRouter from "./upload";
import basesUploadRouter from "./bases-upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(estoqueRouter);
router.use(uploadRouter);
router.use(basesUploadRouter);

export default router;
