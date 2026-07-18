import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import medicationsRouter from "./medications";
import symptomsRouter from "./symptoms";
import readingsRouter from "./readings";
import filesRouter from "./files";
import creditsRouter from "./credits";
import recommendationsRouter from "./recommendations";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(medicationsRouter);
router.use(symptomsRouter);
router.use(readingsRouter);
router.use(filesRouter);
router.use(creditsRouter);
router.use(recommendationsRouter);
router.use(chatRouter);

export default router;
