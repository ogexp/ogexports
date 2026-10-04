import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import pushTokensRouter from "./push-tokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushTokensRouter);
router.use(authRouter);

export default router;
