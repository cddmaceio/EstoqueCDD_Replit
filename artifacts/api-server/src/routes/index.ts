import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import estoqueRouter from "./estoque";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(estoqueRouter);
router.use(uploadRouter);

export default router;
