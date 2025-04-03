import { Router } from "express";
import usersRouter from './users.mjs';
import articleRouter from './articles.mjs'
import reportRouter from './reports.mjs';
import adminRouter from './admin.mjs';

const router = Router();

router.use(usersRouter);
router.use(articleRouter);
router.use(reportRouter);
router.use(adminRouter);

export default router;