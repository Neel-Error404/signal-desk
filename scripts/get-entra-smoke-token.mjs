import { appendFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENVIRONMENTS = new Set(["staging-provision", "staging-traffic"]);

const requiredEnvironment = (name) => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const decodeJwtPayload = (token, label) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error(`${label} is not a three-part JWT.`);
  }
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch (error) {
    throw new Error(`${label} payload is invalid: ${error.message}`);
  }
};

const requestJson = async (url, options, label) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON HTTP ${response.status}.`);
  }
  if (!response.ok) {
    const code = payload.error ?? "unknown_error";
    const description = payload.error_description ?? payload.message ?? "No provider detail.";
    throw new Error(`${label} failed with HTTP ${response.status} (${code}): ${description}`);
  }
  return payload;
};

const validateRequestUrl = (value) => {
  const url = new URL(value);
  const isHostedGitHub =
    url.protocol === "https:" &&
    (url.hostname === "pipelines.actions.githubusercontent.com" ||
      url.hostname.endsWith(".actions.githubusercontent.com"));
  const isTestLoopback =
    process.env.NODE_ENV === "test" &&
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (!isHostedGitHub && !isTestLoopback) {
    throw new Error("ACTIONS_ID_TOKEN_REQUEST_URL is not an approved GitHub Actions endpoint.");
  }
  return url;
};

const entraEndpoint = (tenantId) => {
  const override = process.env.SD008_TEST_ENTRA_TOKEN_ENDPOINT;
  if (override !== undefined) {
    const url = new URL(override);
    if (
      process.env.NODE_ENV !== "test" ||
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost"].includes(url.hostname)
    ) {
      throw new Error("SD008_TEST_ENTRA_TOKEN_ENDPOINT is allowed only for a loopback test.");
    }
    return url;
  }
  return new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`);
};

const main = async () => {
  const githubRequestUrl = validateRequestUrl(requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_URL"));
  const githubRequestToken = requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const tenantId = requiredEnvironment("AZURE_TENANT_ID").toLowerCase();
  const ingressClientId = requiredEnvironment("ENTRA_CLIENT_ID").toLowerCase();
  const smokeClientId = requiredEnvironment("STAGING_SMOKE_CLIENT_ID").toLowerCase();
  const smokePrincipalObjectId = requiredEnvironment(
    "STAGING_SMOKE_PRINCIPAL_OBJECT_ID"
  ).toLowerCase();
  const environment = requiredEnvironment("SD008_ENVIRONMENT");
  const githubEnvironmentPath = requiredEnvironment("GITHUB_ENV");
  for (const [name, value] of Object.entries({
    AZURE_TENANT_ID: tenantId,
    ENTRA_CLIENT_ID: ingressClientId,
    STAGING_SMOKE_CLIENT_ID: smokeClientId,
    STAGING_SMOKE_PRINCIPAL_OBJECT_ID: smokePrincipalObjectId
  })) {
    if (!UUID.test(value)) {
      throw new Error(`${name} must be an exact UUID.`);
    }
  }
  if (!ENVIRONMENTS.has(environment)) {
    throw new Error("SD008_ENVIRONMENT must be staging-provision or staging-traffic.");
  }
  const expectedSubject = `repo:Neel-Error404/signal-desk:environment:${environment}`;
  githubRequestUrl.searchParams.set("audience", "api://AzureADTokenExchange");
  const githubResponse = await requestJson(
    githubRequestUrl,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${githubRequestToken}` }
    },
    "GitHub OIDC request"
  );
  if (typeof githubResponse.value !== "string") {
    throw new Error("GitHub OIDC response did not contain a token value.");
  }
  const githubClaims = decodeJwtPayload(githubResponse.value, "GitHub OIDC token");
  if (
    githubClaims.iss !== "https://token.actions.githubusercontent.com" ||
    githubClaims.aud !== "api://AzureADTokenExchange" ||
    githubClaims.sub !== expectedSubject
  ) {
    throw new Error("GitHub OIDC token issuer, audience, or subject does not match SD-008.");
  }
  const body = new URLSearchParams({
    client_id: smokeClientId,
    scope: `api://${ingressClientId}/.default`,
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: githubResponse.value
  });
  const entraResponse = await requestJson(
    entraEndpoint(tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    },
    "Entra workload token exchange"
  );
  if (entraResponse.token_type !== "Bearer" || typeof entraResponse.access_token !== "string") {
    throw new Error("Entra token response did not contain a bearer access token.");
  }
  const accessClaims = decodeJwtPayload(entraResponse.access_token, "Entra access token");
  const acceptedAudiences = new Set([ingressClientId, `api://${ingressClientId}`]);
  if (
    !acceptedAudiences.has(accessClaims.aud) ||
    accessClaims.tid?.toLowerCase() !== tenantId ||
    (accessClaims.azp ?? accessClaims.appid)?.toLowerCase() !== smokeClientId ||
    accessClaims.oid?.toLowerCase() !== smokePrincipalObjectId
  ) {
    throw new Error("Entra access token is not bound to the approved ingress and smoke identities.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(accessClaims.exp) ||
    accessClaims.exp <= now ||
    accessClaims.exp > now + 7200 ||
    (accessClaims.nbf !== undefined && accessClaims.nbf > now + 60)
  ) {
    throw new Error("Entra access token lifetime is invalid for the bounded smoke check.");
  }
  const delimiter = `SD008_SMOKE_${randomBytes(16).toString("hex")}`;
  await appendFile(
    githubEnvironmentPath,
    `SMOKE_ACCESS_TOKEN<<${delimiter}\n${entraResponse.access_token}\n${delimiter}\n`,
    "utf8"
  );
  console.log(`::add-mask::${entraResponse.access_token}`);
  console.log(
    JSON.stringify({
      status: "dedicated-smoke-token-ready",
      environment,
      subjectSha256: sha256(Buffer.from(expectedSubject, "utf8")),
      ingressClientIdSha256: sha256(Buffer.from(ingressClientId, "utf8")),
      smokeClientIdSha256: sha256(Buffer.from(smokeClientId, "utf8")),
      smokePrincipalObjectIdSha256: sha256(Buffer.from(smokePrincipalObjectId, "utf8")),
      expiresAt: new Date(accessClaims.exp * 1000).toISOString()
    })
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 smoke token exchange failed: ${error.message}`);
    process.exitCode = 1;
  });
}
