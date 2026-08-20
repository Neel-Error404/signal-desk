-- CreateEnum
CREATE TYPE "ProductIssuePriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateTable
CREATE TABLE "ProductIssue" (
    "id" UUID NOT NULL,
    "signalId" UUID NOT NULL,
    "sourceSignalRevision" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "priority" "ProductIssuePriority" NOT NULL,
    "rationale" TEXT NOT NULL,
    "operatorLabel" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductIssue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductIssue_source_signal_revision_nonnegative" CHECK ("sourceSignalRevision" >= 0),
    CONSTRAINT "ProductIssue_title_length" CHECK (char_length("title") BETWEEN 1 AND 200),
    CONSTRAINT "ProductIssue_rationale_length" CHECK (char_length("rationale") BETWEEN 1 AND 2000),
    CONSTRAINT "ProductIssue_operator_label_length" CHECK (char_length("operatorLabel") BETWEEN 1 AND 120)
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductIssue_signalId_key" ON "ProductIssue"("signalId");
CREATE INDEX "ProductIssue_priority_createdAt_id_idx" ON "ProductIssue"("priority", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "ProductIssue"
ADD CONSTRAINT "ProductIssue_signalId_fkey"
FOREIGN KEY ("signalId") REFERENCES "Signal"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product Issues are immutable in SD-002.
CREATE FUNCTION "prevent_product_issue_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ProductIssue is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ProductIssue_immutable"
BEFORE UPDATE OR DELETE ON "ProductIssue"
FOR EACH ROW EXECUTE FUNCTION "prevent_product_issue_mutation"();
