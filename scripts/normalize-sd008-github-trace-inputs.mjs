import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REPOSITORY = /^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/;
const RUN_ID = /^[1-9][0-9]*$/;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const exactTime = (value, label) => {
  const parsed = new Date(value);
  assert(
    typeof value === "string" && Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value,
    `${label} must be an exact UTC ISO-8601 timestamp.`
  );
  return value;
};

const parseArguments = (arguments_) => {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error("Every argument must use --name value.");
    }
    values[name.slice(2).replaceAll("-", "_")] = value;
  }
  return values;
};

const readJson = async (file, label) => {
  const bytes = await readFile(file);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
};

export const normalizeGithubTraceInputs = ({ repository, runId, approvalsRaw, jobsRaw }) => {
  assert(REPOSITORY.test(repository), "Repository is invalid.");
  assert(RUN_ID.test(runId), "Run ID is invalid.");
  const reviews = Array.isArray(approvalsRaw) ? approvalsRaw : approvalsRaw?.approvals;
  assert(Array.isArray(reviews), "GitHub approvals response must be an array.");
  const approvals = reviews.flatMap((review, reviewIndex) => {
    const actor = review?.user?.login;
    const state = typeof review?.state === "string" ? review.state.toLowerCase() : "";
    const occurredAt = review?.created_at ?? review?.submitted_at;
    assert(typeof actor === "string" && actor.length > 0, `Approval ${reviewIndex + 1} actor is missing.`);
    assert(["approved", "rejected"].includes(state), `Approval ${reviewIndex + 1} state is invalid.`);
    exactTime(occurredAt, `Approval ${reviewIndex + 1} time`);
    assert(Array.isArray(review?.environments) && review.environments.length > 0, `Approval ${reviewIndex + 1} has no environments.`);
    return review.environments.map((environment, environmentIndex) => {
      assert(
        typeof environment?.name === "string" && environment.name.length > 0,
        `Approval ${reviewIndex + 1} environment ${environmentIndex + 1} is invalid.`
      );
      return { environment: environment.name, actor, state, occurredAt };
    });
  });
  const rawJobs = jobsRaw?.jobs;
  assert(Array.isArray(rawJobs), "GitHub jobs response must contain jobs.");
  const jobs = rawJobs.map((job, index) => {
    assert(typeof job?.name === "string" && job.name.length > 0, `Job ${index + 1} name is invalid.`);
    assert(typeof job?.status === "string", `Job ${index + 1} status is invalid.`);
    assert(typeof job?.conclusion === "string", `Job ${index + 1} conclusion is invalid.`);
    return {
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      startedAt: exactTime(job.started_at, `Job ${index + 1} start time`),
      completedAt: exactTime(job.completed_at, `Job ${index + 1} completion time`)
    };
  });
  return { approvals, jobs };
};

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  for (const required of ["repository", "run_id", "approvals", "jobs", "output"]) {
    if (arguments_[required] === undefined) throw new Error(`--${required.replaceAll("_", "-")} is required.`);
  }
  const approvals = await readJson(arguments_.approvals, "GitHub approvals response");
  const jobs = await readJson(arguments_.jobs, "GitHub jobs response");
  const normalized = normalizeGithubTraceInputs({
    repository: arguments_.repository,
    runId: arguments_.run_id,
    approvalsRaw: approvals.value,
    jobsRaw: jobs.value
  });
  const packet = {
    schemaVersion: 1,
    classification: "public-redacted",
    workItem: "SD-008",
    repository: arguments_.repository,
    runId: arguments_.run_id,
    sourceSha256: {
      approvals: sha256(approvals.bytes),
      jobs: sha256(jobs.bytes)
    },
    approvals: normalized.approvals,
    jobs: normalized.jobs
  };
  await writeFile(arguments_.output, `${JSON.stringify(packet, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  console.log(JSON.stringify({ status: "normalized", approvalCount: packet.approvals.length, jobCount: packet.jobs.length }));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 GitHub trace normalization failed: ${error.message}`);
    process.exitCode = 1;
  });
}
