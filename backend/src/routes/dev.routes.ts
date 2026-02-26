import { Router } from "express";
import { presignPutObject } from "../infra/storage/storage.service";
const router = Router()


router.get("/", (req, res) => {
    res.json({
        message: "You can do your backend testing here"
    })
});


router.get("/presign-test", async (_req, res, next) => {
  try {
    const result = await presignPutObject({
      key: "yogarth/human.exe",
      contentType: "text/jpg",
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
