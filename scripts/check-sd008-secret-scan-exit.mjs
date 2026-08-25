const rawStatus = process.argv[2];
const scanLabel = process.argv[3] ?? "container-secret";
const allowedScanLabels = new Set(["container-secret", "provision-token", "traffic-token"]);

if (!allowedScanLabels.has(scanLabel)) {
  throw new Error("Secret scan label must identify the container, provision token, or traffic token scan.");
}

if (!/^(?:0|[1-9][0-9]{0,2})$/.test(rawStatus ?? "")) {
  throw new Error("Secret scan status must be an integer from 0 through 255.");
}

const status = Number(rawStatus);
if (status > 255) {
  throw new Error("Secret scan status must be an integer from 0 through 255.");
}

if (status === 0) {
  throw new Error(`${scanLabel} scan failed: matching material was found.`);
}
if (status > 1) {
  throw new Error(`${scanLabel} scan execution failed with status ${status}.`);
}
