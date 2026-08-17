export type ErrorDetails = Readonly<Record<string, readonly string[] | string | number>>;

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details?: ErrorDetails
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidJsonError extends ApplicationError {
  constructor() {
    super("invalid_json", 400, "The request body must be valid UTF-8 JSON.");
  }
}

export class InvalidRequestError extends ApplicationError {
  constructor(message: string, fields: readonly string[] = []) {
    super("invalid_request", 400, message, fields.length > 0 ? { fields } : undefined);
  }
}

export class InputTooLargeError extends ApplicationError {
  constructor() {
    super("input_too_large", 413, "The request exceeds the documented input limit.");
  }
}

export class UnsupportedMediaTypeError extends ApplicationError {
  constructor() {
    super(
      "unsupported_media_type",
      415,
      "Use Content-Type: application/json; charset=utf-8."
    );
  }
}

export class ContentAcknowledgementRequiredError extends ApplicationError {
  constructor() {
    super(
      "content_acknowledgement_required",
      422,
      "Set contentAcknowledged to true before submitting content.",
      { fields: ["contentAcknowledged"] }
    );
  }
}

export class RestrictedContentError extends ApplicationError {
  constructor(ruleIds: readonly string[]) {
    super(
      "restricted_content_detected",
      422,
      "The submitted content matches a restricted-content rule.",
      { ruleIds }
    );
  }
}

export class SignalNotFoundError extends ApplicationError {
  constructor() {
    super("signal_not_found", 404, "The requested signal does not exist.");
  }
}

export class LineageConflictError extends ApplicationError {
  constructor() {
    super(
      "lineage_conflict",
      409,
      "The one-feedback-to-one-signal lineage constraint would be violated."
    );
  }
}

export class RevisionConflictError extends ApplicationError {
  constructor() {
    super(
      "revision_conflict",
      409,
      "The signal changed. Reload it before appending another triage event."
    );
  }
}

export class SignalNotAcceptedError extends ApplicationError {
  constructor() {
    super(
      "signal_not_accepted",
      409,
      "Accept the signal through manual triage before promoting it to a product issue."
    );
  }
}

export class ProductIssueExistsError extends ApplicationError {
  constructor() {
    super(
      "product_issue_exists",
      409,
      "The signal already has a product issue."
    );
  }
}

export class ProductIssueNotFoundError extends ApplicationError {
  constructor() {
    super("product_issue_not_found", 404, "The requested product issue does not exist.");
  }
}

export class ImplementationBriefExistsError extends ApplicationError {
  constructor() {
    super(
      "implementation_brief_exists",
      409,
      "The product issue already has an implementation brief."
    );
  }
}

export class StorageUnavailableError extends ApplicationError {
  constructor() {
    super(
      "storage_unavailable",
      503,
      "The PostgreSQL transaction could not be completed."
    );
  }
}

export class ContentControlUnavailableError extends ApplicationError {
  constructor() {
    super(
      "internal_error",
      500,
      "The content-control check could not be completed."
    );
  }
}
