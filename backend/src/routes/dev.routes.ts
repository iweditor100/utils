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


router.post("/test-json", async(req, res) => {
  try { 
    const json = req.body;
    const sizeInBytes = Buffer.byteLength(JSON.stringify(json), "utf-8");
    console.log(`A file of size: ${sizeInBytes} bytes was parsed`)

    return res.json({
      message: "You json was accepted by the backend", 
      sizeInBytes,
      sizeInKB: (sizeInBytes / 1024).toFixed(2),
      data: json,
    })
  } catch( error: any) {
    return res.status(500).json({
      error: error.message,
      message: "Your json was rejected by the backend, please find out why?",
    })
  }
})

export default router;
