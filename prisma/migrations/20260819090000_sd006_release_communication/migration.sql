-- CreateTable
CREATE TABLE "ReleaseCommunication" (
    "id" UUID NOT NULL,
    "completedFixId" UUID NOT NULL,
    "audience" VARCHAR(500) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "approvedBy" VARCHAR(120) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseCommunication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReleaseCommunication_audience_length" CHECK (
        char_length("audience") BETWEEN 1 AND 500
    ),
    CONSTRAINT "ReleaseCommunication_subject_length" CHECK (
        char_length("subject") BETWEEN 1 AND 200
    ),
    CONSTRAINT "ReleaseCommunication_message_length" CHECK (
        char_length("message") BETWEEN 1 AND 4000
    ),
    CONSTRAINT "ReleaseCommunication_approved_by_length" CHECK (
        char_length("approvedBy") BETWEEN 1 AND 120
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseCommunication_completedFixId_key"
ON "ReleaseCommunication"("completedFixId");

-- AddForeignKey
ALTER TABLE "ReleaseCommunication"
ADD CONSTRAINT "ReleaseCommunication_completedFixId_fkey"
FOREIGN KEY ("completedFixId") REFERENCES "CompletedFix"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Approved release communications are immutable in SD-006.
CREATE FUNCTION "prevent_release_communication_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ReleaseCommunication is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ReleaseCommunication_immutable"
BEFORE UPDATE OR DELETE ON "ReleaseCommunication"
FOR EACH ROW EXECUTE FUNCTION "prevent_release_communication_mutation"();
