import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const parseArguments = (arguments_) => {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error("Every cost argument must use --name value.");
    }
    values[name.slice(2).replaceAll("-", "_")] = value;
  }
  return values;
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  for (const required of ["start", "end", "output"]) {
    if (arguments_[required] === undefined) {
      throw new Error(`--${required} is required.`);
    }
  }
  const start = new Date(arguments_.start);
  const end = new Date(arguments_.end);
  if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf())) {
    throw new Error("Cost start and end must be valid ISO-8601 timestamps.");
  }
  if (end <= start) {
    throw new Error("Cost end must be later than start.");
  }
  const modelBytes = await readFile("delivery/sd008-cost-model.json");
  const model = JSON.parse(modelBytes.toString("utf8"));
  const durationHours = (end.valueOf() - start.valueOf()) / 3_600_000;
  if (durationHours > model.maximumSessionHours) {
    throw new Error(
      `SD-008 session duration ${durationHours.toFixed(3)}h exceeds ${model.maximumSessionHours}h.`
    );
  }
  const hourlyRateUsd = Object.values(model.hourly).reduce((sum, value) => sum + value, 0);
  const fixedAllowanceUsd = Object.values(model.perSession).reduce(
    (sum, value) => sum + value,
    0
  );
  const unroundedUsd = hourlyRateUsd * durationHours + fixedAllowanceUsd;
  const estimatedUsd = Math.ceil(unroundedUsd * 100) / 100;
  if (estimatedUsd > model.budgetAlertUsd) {
    throw new Error(`Calculated SD-008 cost USD ${estimatedUsd} exceeds the budget stop boundary.`);
  }
  const result = {
    schemaVersion: 1,
    workItem: "SD-008",
    calculationKind: "conservative-retail-upper-bound",
    currency: model.currency,
    region: model.region,
    sessionStartedAt: start.toISOString(),
    sessionEndedAt: end.toISOString(),
    durationHours: Number(durationHours.toFixed(6)),
    hourlyRateUsd: Number(hourlyRateUsd.toFixed(7)),
    fixedAllowanceUsd: Number(fixedAllowanceUsd.toFixed(3)),
    estimatedUsd,
    ownerReviewThresholdUsd: model.ownerReviewThresholdUsd,
    budgetAlertUsd: model.budgetAlertUsd,
    costModelId: model.id,
    costModelSha256: sha256(modelBytes),
    actualBilling: "provider-lag-not-yet-available",
    actualBillingClaim: false
  };
  await writeFile(arguments_.output, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  console.log(
    JSON.stringify({
      status: "calculated-conservative-upper-bound",
      durationHours: result.durationHours,
      estimatedUsd,
      costModelSha256: result.costModelSha256
    })
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 cost calculation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
