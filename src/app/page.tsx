"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type SignalState = "new" | "reviewing" | "accepted" | "rejected";

interface SignalItem {
  readonly id: string;
  readonly feedbackId: string;
  readonly statement: string;
  readonly state: SignalState;
  readonly revision: number;
  readonly createdAt: string;
}

interface TriageEventItem {
  readonly id: string;
  readonly signalId: string;
  readonly sequence: number;
  readonly fromState: SignalState;
  readonly toState: SignalState;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: string;
}

interface SignalDetail {
  readonly signal: SignalItem;
  readonly feedback: {
    readonly id: string;
    readonly content: string;
    readonly createdAt: string;
  };
  readonly triageEvents: readonly TriageEventItem[];
}

interface ApiErrorEnvelope {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
  };
}

async function safeError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorEnvelope;
    if (typeof body.error?.message === "string") {
      return body.error.message;
    }
  } catch {
    // The public API should return JSON; keep the UI error bounded if it does not.
  }
  return `Request failed with status ${response.status}.`;
}

export default function HomePage() {
  const [content, setContent] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [signals, setSignals] = useState<readonly SignalItem[]>([]);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSignal = useCallback(async (signalId: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/v1/signals/${signalId}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await safeError(response));
      }
      setDetail((await response.json()) as SignalDetail);
    } catch (error) {
      setDetail(null);
      setMessage(error instanceof Error ? error.message : "Could not load signal detail.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadSignals = useCallback(
    async (preferredSignalId?: string) => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/signals?limit=100", {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(await safeError(response));
        }
        const body = (await response.json()) as { readonly items: readonly SignalItem[] };
        setSignals(body.items);
        const nextSignalId =
          preferredSignalId !== undefined &&
          body.items.some((signal) => signal.id === preferredSignalId)
            ? preferredSignalId
            : body.items[0]?.id ?? null;
        setSelectedSignalId(nextSignalId);
        if (nextSignalId === null) {
          setDetail(null);
        } else {
          await loadSignal(nextSignalId);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load signals.");
      } finally {
        setLoading(false);
      }
    },
    [loadSignal]
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadSignals();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadSignals]);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ content, contentAcknowledged: acknowledged })
      });
      if (!response.ok) {
        throw new Error(await safeError(response));
      }
      const created = (await response.json()) as { readonly signal: SignalItem };
      setContent("");
      setAcknowledged(false);
      setMessage("Feedback accepted and one signal created.");
      await loadSignals(created.signal.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  async function appendTriage(
    signal: SignalItem,
    toState: SignalState,
    rationale: string,
    operatorLabel: string,
    contentAcknowledged: boolean
  ): Promise<boolean> {
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/signals/${signal.id}/triage-events`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          expectedRevision: signal.revision,
          toState,
          rationale,
          operatorLabel,
          contentAcknowledged
        })
      });
      if (!response.ok) {
        throw new Error(await safeError(response));
      }
      setMessage("Manual triage event appended.");
      await loadSignals(signal.id);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not append triage.");
      return false;
    }
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="product-name">SignalDesk</p>
          <p className="product-scope">SD-001 local feedback operations</p>
        </div>
        <p className="runtime-state">Local PostgreSQL workspace</p>
      </header>

      <aside className="boundary" role="note" aria-label="Prototype limitations">
        <strong>Prototype boundary</strong>
        <span>No authentication or verified identity</span>
        <span>No uploads or hosted-operation claim</span>
        <span>High-confidence rejection is not complete DLP</span>
      </aside>

      {message === null ? null : (
        <p className="message" role="status">
          {message}
        </p>
      )}

      <section className="capture" aria-labelledby="capture-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Feedback intake</p>
            <h1 id="capture-title">Capture customer feedback</h1>
          </div>
          <span className="limit">8,000 Unicode code points maximum</span>
        </div>
        <form onSubmit={submitFeedback}>
          <label htmlFor="feedback">Customer feedback</label>
          <textarea
            id="feedback"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
            required
            placeholder="Describe the observed customer problem without credentials or regulated data."
          />
          <label className="acknowledgement">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              I acknowledge this content will be stored locally and must not contain credentials,
              regulated data, or proprietary source-code uploads.
            </span>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create feedback and signal"}
          </button>
        </form>
      </section>

      <section className="workspace" aria-labelledby="inbox-title">
        <div className="inbox-pane">
          <div className="section-heading">
            <div>
              <p className="section-label">Signal inbox</p>
              <h2 id="inbox-title">Current signals</h2>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => void loadSignals(selectedSignalId ?? undefined)}
            >
              Refresh
            </button>
          </div>

          {loading ? <p className="empty">Loading local signals...</p> : null}
          {!loading && signals.length === 0 ? (
            <p className="empty">No signals yet. Accepted feedback appears here after commit.</p>
          ) : null}
          <div className="signal-list">
            {signals.map((signal) => (
              <button
                className={`signal-row${selectedSignalId === signal.id ? " selected" : ""}`}
                key={signal.id}
                type="button"
                onClick={() => {
                  setSelectedSignalId(signal.id);
                  void loadSignal(signal.id);
                }}
              >
                <span className={`state state-${signal.state}`}>{signal.state}</span>
                <span className="signal-summary">{signal.statement}</span>
                <span className="revision">r{signal.revision}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="detail-pane" aria-live="polite">
          {detailLoading ? <p className="empty">Loading signal detail...</p> : null}
          {!detailLoading && detail === null ? (
            <p className="empty">Select a signal to inspect its source and triage history.</p>
          ) : null}
          {!detailLoading && detail !== null ? (
            <SignalInspector key={detail.signal.id} detail={detail} onAppend={appendTriage} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SignalInspector({
  detail,
  onAppend
}: Readonly<{
  detail: SignalDetail;
  onAppend: (
    signal: SignalItem,
    toState: SignalState,
    rationale: string,
    operatorLabel: string,
    acknowledged: boolean
  ) => Promise<boolean>;
}>) {
  const { signal } = detail;
  const [toState, setToState] = useState<SignalState>(signal.state);
  const [rationale, setRationale] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onAppend(signal, toState, rationale, operatorLabel, acknowledged);
      if (saved) {
        setRationale("");
        setAcknowledged(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="signal-detail">
      <div className="detail-heading">
        <div>
          <p className="section-label">Signal detail</p>
          <h2>Source and decision history</h2>
        </div>
        <div className="signal-meta">
          <span className={`state state-${signal.state}`}>{signal.state}</span>
          <span>revision {signal.revision}</span>
        </div>
      </div>
      <p className="statement">{signal.statement}</p>
      <dl>
        <div>
          <dt>Signal</dt>
          <dd>{signal.id}</dd>
        </div>
        <div>
          <dt>Source feedback</dt>
          <dd>{signal.feedbackId}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(signal.createdAt).toLocaleString()}</dd>
        </div>
      </dl>

      <section className="history" aria-labelledby="history-title">
        <div className="history-heading">
          <h3 id="history-title">Triage history</h3>
          <span>{detail.triageEvents.length} events</span>
        </div>
        {detail.triageEvents.length === 0 ? (
          <p className="empty">No triage events. The signal is in its initial state.</p>
        ) : (
          <ol>
            {detail.triageEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>
                    {event.fromState} to {event.toState}
                  </strong>
                  <span>
                    #{event.sequence} by {event.operatorLabel}
                  </span>
                </div>
                <p>{event.rationale}</p>
                <time dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form className="triage" onSubmit={submit}>
        <h3>Append manual triage</h3>
        <div className="form-grid">
          <label>
            State
            <select
              value={toState}
              onChange={(event) => setToState(event.target.value as SignalState)}
            >
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label>
            Local operator label (unverified)
            <input
              value={operatorLabel}
              onChange={(event) => setOperatorLabel(event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Rationale
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            required
            rows={3}
          />
        </label>
        <label className="acknowledgement compact">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>I acknowledge this persisted triage content follows the same content boundary.</span>
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Appending..." : "Append event"}
        </button>
      </form>
    </article>
  );
}
