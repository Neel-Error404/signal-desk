-- CreateTable
CREATE TABLE "ReviewDelivery" (
    "id" UUID NOT NULL,
    "implementationBriefId" UUID NOT NULL,
    "repositoryUrl" VARCHAR(300) NOT NULL,
    "baseBranch" VARCHAR(255) NOT NULL,
    "headBranch" VARCHAR(255) NOT NULL,
    "commitSha" VARCHAR(64) NOT NULL,
    "pullRequestNumber" INTEGER NOT NULL,
    "pullRequestUrl" VARCHAR(500) NOT NULL,
    "verificationSummary" TEXT NOT NULL,
    "deliveredBy" VARCHAR(120) NOT NULL,
    "deliveredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDelivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReviewDelivery_repository" CHECK (
        "repositoryUrl" = 'https://github.com/Neel-Error404/signal-desk'
    ),
    CONSTRAINT "ReviewDelivery_base_branch" CHECK (
        "baseBranch" ~ '^(main|work/sd-[0-9]{3}-[a-z0-9-]+)$'
    ),
    CONSTRAINT "ReviewDelivery_head_branch" CHECK (
        "headBranch" ~ '^work/sd-[0-9]{3}-[a-z0-9-]+$'
    ),
    CONSTRAINT "ReviewDelivery_distinct_branches" CHECK ("baseBranch" <> "headBranch"),
    CONSTRAINT "ReviewDelivery_commit_sha" CHECK (
        "commitSha" ~ '^([0-9a-f]{40}|[0-9a-f]{64})$'
    ),
    CONSTRAINT "ReviewDelivery_pull_request_number" CHECK ("pullRequestNumber" > 0),
    CONSTRAINT "ReviewDelivery_pull_request_url" CHECK (
        "pullRequestUrl" = 'https://github.com/Neel-Error404/signal-desk/pull/' || "pullRequestNumber"::text
    ),
    CONSTRAINT "ReviewDelivery_verification_summary_length" CHECK (
        char_length("verificationSummary") BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ReviewDelivery_delivered_by_length" CHECK (
        char_length("deliveredBy") BETWEEN 1 AND 120
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDelivery_implementationBriefId_key"
ON "ReviewDelivery"("implementationBriefId");

CREATE UNIQUE INDEX "ReviewDelivery_pullRequestUrl_key"
ON "ReviewDelivery"("pullRequestUrl");

-- AddForeignKey
ALTER TABLE "ReviewDelivery"
ADD CONSTRAINT "ReviewDelivery_implementationBriefId_fkey"
FOREIGN KEY ("implementationBriefId") REFERENCES "ImplementationBrief"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Review deliveries are immutable in SD-004.
CREATE FUNCTION "prevent_review_delivery_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ReviewDelivery is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ReviewDelivery_immutable"
BEFORE UPDATE OR DELETE ON "ReviewDelivery"
FOR EACH ROW EXECUTE FUNCTION "prevent_review_delivery_mutation"();
