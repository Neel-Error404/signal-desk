import type {
  AppendTriage,
  GetSignal,
  ListSignals,
  SignalDetail,
  SignalRecord,
  TriageEventRecord
} from "../application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { InputTooLargeError, InvalidRequestError } from "@/shared/errors";
import {
  assertClosedObject,
  requireNumber,
  requireString,
  requireUuid
} from "@/shared/validation";

function serializeSignal(signal: SignalRecord): Record<string, unknown> {
  return { ...signal, createdAt: signal.createdAt.toISOString() };
}

function serializeEvent(event: TriageEventRecord): Record<string, unknown> {
  return { ...event, createdAt: event.createdAt.toISOString() };
}

function serializeDetail(detail: SignalDetail): Record<string, unknown> {
  return {
    signal: serializeSignal(detail.signal),
    feedback: { ...detail.feedback, createdAt: detail.feedback.createdAt.toISOString() },
    triageEvents: detail.triageEvents.map(serializeEvent)
  };
}

function parseListQuery(request: Request): { readonly limit: number; readonly cursor: string | null } {
  const parameters = new URL(request.url).searchParams;
  for (const key of parameters.keys()) {
    if (key !== "limit" && key !== "cursor") {
      throw new InvalidRequestError("The query contains unknown fields.", [key]);
    }
    if (parameters.getAll(key).length !== 1) {
      throw new InvalidRequestError(`${key} must be provided at most once.`, [key]);
    }
  }

  const limitValue = parameters.get("limit");
  const limit = limitValue === null ? 25 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new InvalidRequestError("limit must be an integer from 1 through 100.", ["limit"]);
  }

  const cursor = parameters.get("cursor");
  if (cursor !== null && new TextEncoder().encode(cursor).byteLength > 512) {
    throw new InputTooLargeError();
  }
  return { limit, cursor };
}

export async function listSignals(
  request: Request,
  listSignalsUseCase: ListSignals
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    const page = await listSignalsUseCase.execute(parseListQuery(request));
    return jsonResponse(
      {
        items: page.items.map(serializeSignal),
        nextCursor: page.nextCursor
      },
      200,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export async function getSignal(
  request: Request,
  signalId: string,
  getSignalUseCase: GetSignal
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(signalId, "signalId");
    const detail = await getSignalUseCase.execute(signalId);
    return jsonResponse(serializeDetail(detail), 200, correlationId);
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export async function postTriageEvent(
  request: Request,
  signalId: string,
  appendTriageUseCase: AppendTriage
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(signalId, "signalId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "expectedRevision",
      "toState",
      "rationale",
      "operatorLabel",
      "contentAcknowledged"
    ]);
    const result = await appendTriageUseCase.execute(signalId, {
      expectedRevision: requireNumber(body, "expectedRevision"),
      toState: requireString(body, "toState"),
      rationale: requireString(body, "rationale"),
      operatorLabel: requireString(body, "operatorLabel"),
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        event: serializeEvent(result.event),
        signal: serializeSignal(result.signal)
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
