import { Router } from "express";
import usersRouter from './users.mjs';
import articleRouter from './articles.mjs'
import reportRouter from './reports.mjs';

const router = Router();

router.use(usersRouter);
router.use(articleRouter);
router.use(reportRouter);

export default router;