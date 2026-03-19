import { Router } from "express";
import { presignPutObject } from "../infra/storage/storage.service";
import { zipQueue } from "../modules/downloads/queue/zip.queue";
const router = Router()


router.get("/", (req, res) => {
    res.json({
        message: "You can do your backend testing here"
    })
});







router.post("/test-zip", async (req, res) => {
  try {
    const job = await zipQueue.add("zip-jo", {
      jobId: "dev-test-" + Date.now(),
      fileKeys: [
        "nonononononononononononononononononononononononononononoonononononononooonoonooonoonononononopnkono"
      ],
    })

    return res.json({
      message: "Zip job addded",
      jobId: job.id,
    })
  } catch( error: any ) {
    return res.status(500).json({
      error: error.message,
    })
  }
})

export default router;
