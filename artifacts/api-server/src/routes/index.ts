import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspaceRouter from "./workspace";
import caseLawRouter from "./case-law";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspaceRouter);
router.use(caseLawRouter);

export default router;
