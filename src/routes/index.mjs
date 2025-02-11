import { Router } from "express";
import usersRouter from './users.mjs';
import articleRouter from './articles.mjs'

const router = Router();

router.use(usersRouter);
router.use(articleRouter);

export default router;