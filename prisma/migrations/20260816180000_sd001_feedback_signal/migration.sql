-- CreateEnum
CREATE TYPE "SignalState" AS ENUM ('new', 'reviewing', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Feedback_content_length" CHECK (char_length("content") BETWEEN 1 AND 8000)
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" UUID NOT NULL,
    "feedbackId" UUID NOT NULL,
    "statement" TEXT NOT NULL,
    "state" "SignalState" NOT NULL DEFAULT 'new',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Signal_statement_length" CHECK (char_length("statement") BETWEEN 1 AND 8000),
    CONSTRAINT "Signal_revision_nonnegative" CHECK ("revision" >= 0)
);

-- CreateTable
CREATE TABLE "TriageEvent" (
    "id" UUID NOT NULL,
    "signalId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fromState" "SignalState" NOT NULL,
    "toState" "SignalState" NOT NULL,
    "rationale" TEXT NOT NULL,
    "operatorLabel" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TriageEvent_sequence_positive" CHECK ("sequence" > 0),
    CONSTRAINT "TriageEvent_rationale_length" CHECK (char_length("rationale") BETWEEN 1 AND 2000),
    CONSTRAINT "TriageEvent_operator_label_length" CHECK (char_length("operatorLabel") BETWEEN 1 AND 120)
);

-- CreateIndex
CREATE UNIQUE INDEX "Signal_feedbackId_key" ON "Signal"("feedbackId");
CREATE INDEX "Signal_createdAt_id_idx" ON "Signal"("createdAt", "id");
CREATE UNIQUE INDEX "TriageEvent_signalId_sequence_key" ON "TriageEvent"("signalId", "sequence");
CREATE INDEX "TriageEvent_signalId_createdAt_idx" ON "TriageEvent"("signalId", "createdAt");

-- AddForeignKey
ALTER TABLE "Signal"
ADD CONSTRAINT "Signal_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TriageEvent"
ADD CONSTRAINT "TriageEvent_signalId_fkey"
FOREIGN KEY ("signalId") REFERENCES "Signal"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only enforcement for manual triage history.
CREATE FUNCTION "prevent_triage_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'TriageEvent is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "TriageEvent_append_only"
BEFORE UPDATE OR DELETE ON "TriageEvent"
FOR EACH ROW EXECUTE FUNCTION "prevent_triage_event_mutation"();
