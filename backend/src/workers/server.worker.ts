import { createImageWorker } from "./image.worker";
import { createZipWorker } from "../modules/downloads/workers/zip.worker";

console.log(" Worker server starting...");

const workers = [
    createImageWorker(),
    createZipWorker(),
]


console.log(" Workers Initialized: ", workers.length);


process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Shutting down workers...");


    await Promise.all(workers.map((w) => w.close()));

    console.log("All Workers Closed");
    process.exit(0);
})