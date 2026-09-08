"use client";

import { useCallback, useEffect, useState } from "react";

type EndpointState = {
  status: "checking" | "ok" | "error";
  message: string;
};

const CHECKING: EndpointState = { status: "checking", message: "Checking…" };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function Page() {
  const [health, setHealth] = useState<EndpointState>(CHECKING);
  const [ready, setReady] = useState<EndpointState>(CHECKING);

  const fetchStatuses = useCallback(async () => {
    let healthResult: EndpointState;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      if (response.ok) {
        healthResult = { status: "ok", message: "200 OK — API process is alive" };
      } else {
        healthResult = { status: "error", message: `HTTP ${response.status}` };
      }
    } catch {
      healthResult = { status: "error", message: "API unreachable" };
    }

    let readyResult: EndpointState;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ready`);
      const payload: { status?: string; database?: string; dataset?: string; document_count?: number } =
        await response.json();
      if (response.ok) {
        readyResult = {
          status: "ok",
          message: `ready — MongoDB connected, ${payload.document_count ?? "?"} records imported`,
        };
      } else {
        readyResult = {
          status: "error",
          message: `not ready — ${payload.dataset ?? payload.database ?? "unknown"}`,
        };
      }
    } catch {
      readyResult = { status: "error", message: "API unreachable" };
    }

    return { health: healthResult, ready: readyResult };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchStatuses().then((result) => {
      if (cancelled) return;
      setHealth(result.health);
      setReady(result.ready);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchStatuses]);

  const recheck = () => {
    setHealth(CHECKING);
    setReady(CHECKING);
    void fetchStatuses().then((result) => {
      setHealth(result.health);
      setReady(result.ready);
    });
  };

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-2xl rounded-md border border-stone-200 bg-white p-8 shadow-none">
        <p className="font-mono text-xs uppercase tracking-wide text-stone-500">InsightScope</p>
        <h1 className="mt-1 text-2xl font-semibold">Development status</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Phase 1 foundation shell. This screen verifies that the frontend can reach the FastAPI
          backend and that the backend can reach MongoDB. The dashboard itself arrives in later
          phases.
        </p>

        <dl className="mt-8 space-y-4">
          <StatusRow
            label="GET /api/v1/health"
            detail={health.message}
            status={health.status}
          />
          <StatusRow
            label="GET /api/v1/ready"
            detail={ready.message}
            status={ready.status}
          />
        </dl>

        <p className="mt-6 font-mono text-xs text-stone-500">API base URL: {API_BASE_URL}</p>
        <button
          type="button"
          onClick={recheck}
          className="mt-6 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-stone-700"
        >
          Re-check
        </button>
      </div>
    </main>
  );
}

function StatusRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: EndpointState["status"];
}) {
  const dot =
    status === "ok"
      ? "bg-emerald-700"
      : status === "error"
        ? "bg-red-700"
        : "bg-stone-400";

  return (
    <div className="flex items-start gap-3 rounded-md border border-stone-200 p-4">
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <dt className="font-mono text-sm font-medium">{label}</dt>
        <dd className="mt-0.5 text-sm text-stone-600">{detail}</dd>
      </div>
    </div>
  );
}
