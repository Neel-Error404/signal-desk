-- Validate bounded arrays without weakening the application-level checks.
CREATE FUNCTION "valid_implementation_brief_text_array"(
    values_to_check TEXT[],
    minimum_count INTEGER,
    maximum_count INTEGER,
    maximum_length INTEGER
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT cardinality(values_to_check) BETWEEN minimum_count AND maximum_count
       AND NOT EXISTS (
           SELECT 1
           FROM unnest(values_to_check) AS item
           WHERE char_length(item) NOT BETWEEN 1 AND maximum_length
       );
$$;

-- CreateTable
CREATE TABLE "ImplementationBrief" (
    "id" UUID NOT NULL,
    "productIssueId" UUID NOT NULL,
    "objective" TEXT NOT NULL,
    "acceptanceCriteria" TEXT[] NOT NULL,
    "constraints" TEXT[] NOT NULL,
    "approvedBy" VARCHAR(120) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImplementationBrief_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ImplementationBrief_objective_length" CHECK (char_length("objective") BETWEEN 1 AND 2000),
    CONSTRAINT "ImplementationBrief_acceptance_criteria_bounds" CHECK (
        "valid_implementation_brief_text_array"("acceptanceCriteria", 1, 10, 500)
    ),
    CONSTRAINT "ImplementationBrief_constraints_bounds" CHECK (
        "valid_implementation_brief_text_array"("constraints", 0, 10, 500)
    ),
    CONSTRAINT "ImplementationBrief_approved_by_length" CHECK (char_length("approvedBy") BETWEEN 1 AND 120)
);

-- CreateIndex
CREATE UNIQUE INDEX "ImplementationBrief_productIssueId_key"
ON "ImplementationBrief"("productIssueId");

-- AddForeignKey
ALTER TABLE "ImplementationBrief"
ADD CONSTRAINT "ImplementationBrief_productIssueId_fkey"
FOREIGN KEY ("productIssueId") REFERENCES "ProductIssue"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Approved implementation briefs are immutable in SD-003.
CREATE FUNCTION "prevent_implementation_brief_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ImplementationBrief is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ImplementationBrief_immutable"
BEFORE UPDATE OR DELETE ON "ImplementationBrief"
FOR EACH ROW EXECUTE FUNCTION "prevent_implementation_brief_mutation"();
