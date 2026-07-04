import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import organizationsRouter from "./organizations";
import membersRouter from "./members";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import resourcesRouter from "./resources";
import stakeholdersRouter from "./stakeholders";
import issuesRouter from "./issues";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(organizationsRouter);
router.use(membersRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(resourcesRouter);
router.use(stakeholdersRouter);
router.use(issuesRouter);

export default router;
