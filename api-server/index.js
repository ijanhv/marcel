const express = require("express");
const { generateSlug } = require("random-word-slugs");
const Docker = require("dockerode");
const docker = new Docker()
const app = express();

const PORT = 8081;

app.use(express.json());

app.post("/project",async (req, res) => {
  const { gitUrl } = req.body;
  const projectSlug = generateSlug();
  await runBuildServer(gitUrl)

  return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000`}})
});

async function runBuildServer(gitUrl) {
  try {
    // Generate a project slug
    const projectSlug = generateSlug();

    // Create and start the container
    const container = await docker.createContainer({
      Image: "build-server", // The Docker image you want to run
      Env: [
        `GIT_REPOSITORY_URL=${gitUrl}`,
        `PROJECT_ID=${projectSlug}`,
        `MINIO_HOST_NAME=192.168.29.40`,
        `MINIO_PORT=9000`,
        `MINIO_SSL=false`,
        `MINIO_ACCESS_KEY_ID=VGkwTuEZaLG2lfKJWKzT`,
        `MINIO_ACCESS_SECRET=5kGTLxFJjm3wbv2pSFCyAcTPIn8IGDHLj0dQgZZZ`,
      ],
    //   ExposedPorts: { "8082/tcp": {} }, // Expose port 8081
    //   HostConfig: {
    //     PortBindings: { "8082/tcp": [{ HostPort: "8082" }] }, // Bind container port to host
    //   },
    });

    // Start the container
    await container.start();

    console.log(`Build server running with PROJECT_ID: ${projectSlug}`);
  } catch (err) {
    console.error("Error running build server:", err);
  }
}

app.listen(PORT, () => console.log(`API Server running on ${PORT}`));
