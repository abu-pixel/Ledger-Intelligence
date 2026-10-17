import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assistantRouter from "./assistant";
import financeRouter from "./finance";
import currencyRouter from "./currency";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assistantRouter);
router.use(financeRouter);
router.use(currencyRouter);

export default router;
