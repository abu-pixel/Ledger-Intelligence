import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assistantRouter from "./assistant";
import currencyRouter from "./currency";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assistantRouter);
router.use(currencyRouter);

export default router;
