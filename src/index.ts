import axios from "axios";
import console from "console";
import "dotenv/config";
import { postMessageToDiscord } from "./commands/postMessage";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const allowedDeployments = process.env.PROJECT_LIST?.split(",") || [];

let processedDeployments = new Set();

const getAllDeployments = async () => {
  try {
    const response = await axios.get(
      "https://api.vercel.com/v6/deployments?limit=10",
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.deployments.filter((deployment: any) =>
      allowedDeployments.includes(deployment.name)
    );
  } catch (error) {
    console.error(error);
  }
};

const getDeploymentData = async (deploymentId: string) => {
  try {
    const response = await axios.get(
      `https://api.vercel.com/v11/now/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const getDeploymentLogs = async (deploymentId: string) => {
  try {
    const response = await axios.get(
      `https://api.vercel.com/v2/now/deployments/${deploymentId}/events`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.filter(
      (log: any) => log.type === "stdout" || log.type === "stderr"
    );
  } catch (error) {
    console.error(error);
  }
};

const addAllDeploymentsToSet = async () => {
  console.log(`initializing for **${allowedDeployments}**`);
  const allDeployments = await getAllDeployments();
  allDeployments.forEach((deployment: any) => {
    processedDeployments.add(deployment.uid);
  });
};

const checkDeploymentStatus = async () => {
  if (processedDeployments.size === 0) {
    await addAllDeploymentsToSet();
  }

  const allDeployments = await getAllDeployments();
  for (const deployment of allDeployments) {
    if (!processedDeployments.has(deployment.uid)) {
      const deploymentData = await getDeploymentData(deployment.uid);

      if (deploymentData.status === "ERROR") {
        console.log("Deployment has failed. Fetching logs...");
        const logs = await getDeploymentLogs(deployment.uid);
        let logsString = "";
        logs.forEach((log) => {
          logsString += log.payload.text + "\n";
        });
        await postMessageToDiscord(
          `**Deployment failed** for commit **${
            deploymentData.meta.githubCommitMessage
          }** at ${new Date(deploymentData.createdAt)} on branch **${
            deploymentData.meta.githubCommitRef
          }**. Logs: \`\`\`${logsString}\`\`\``
        );
        processedDeployments.add(deployment.uid);
      }
      if (deploymentData.status === "READY") {
        await postMessageToDiscord(
          `**Deployment successful** for commit **${
            deploymentData.meta.githubCommitMessage
          }** at ${new Date(deploymentData.createdAt)} on branch **${
            deploymentData.meta.githubCommitRef
          }**. URL: https://${deploymentData.url}`
        );
        processedDeployments.add(deployment.uid);
      }
      if (deploymentData.status === "BUILDING") {
        return console.log("Deployment in progress...");
      } else {
        return console.log("nothing to do");
      }
    }
  }
};

setInterval(() => {
  checkDeploymentStatus();
}, 5000);
