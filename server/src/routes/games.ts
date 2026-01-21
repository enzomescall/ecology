import { Router } from "express";
const gameRouter = Router();

gameRouter.get("/", (req, res) => {
  res.json({ message: "Game API is live" });
});

export default gameRouter;
