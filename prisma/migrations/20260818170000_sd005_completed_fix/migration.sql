-- CreateTable
CREATE TABLE "CompletedFix" (
    "id" UUID NOT NULL,
    "reviewDeliveryId" UUID NOT NULL,
    "mergedCommitSha" VARCHAR(64) NOT NULL,
    "completionSummary" TEXT NOT NULL,
    "completedBy" VARCHAR(120) NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedFix_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CompletedFix_merged_commit_sha" CHECK (
        "mergedCommitSha" ~ '^([0-9a-f]{40}|[0-9a-f]{64})$'
    ),
    CONSTRAINT "CompletedFix_completion_summary_length" CHECK (
        char_length("completionSummary") BETWEEN 1 AND 2000
    ),
    CONSTRAINT "CompletedFix_completed_by_length" CHECK (
        char_length("completedBy") BETWEEN 1 AND 120
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "CompletedFix_reviewDeliveryId_key"
ON "CompletedFix"("reviewDeliveryId");

-- AddForeignKey
ALTER TABLE "CompletedFix"
ADD CONSTRAINT "CompletedFix_reviewDeliveryId_fkey"
FOREIGN KEY ("reviewDeliveryId") REFERENCES "ReviewDelivery"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Completed fixes are immutable in SD-005.
CREATE FUNCTION "prevent_completed_fix_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'CompletedFix is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "CompletedFix_immutable"
BEFORE UPDATE OR DELETE ON "CompletedFix"
FOR EACH ROW EXECUTE FUNCTION "prevent_completed_fix_mutation"();
