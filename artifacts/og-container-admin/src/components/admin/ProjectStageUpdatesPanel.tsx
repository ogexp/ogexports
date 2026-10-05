import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react"
import {
  createProjectStageUpdate,
  fetchProjectStageUpdates,
  type AdminProjectStageUpdate,
} from "@/lib/admin-data"
import {
  CONTAINER_PROJECT_STAGE_OPTIONS,
  CONTAINER_PROJECT_STAGE_UPDATE_STATUSES,
  type ContainerProjectStageKey,
  type ContainerProjectStageUpdateStatus,
} from "@/lib/container-project-statuses"

type Props = {
  projectId: string
  onToast: (message: string, type?: "success" | "error") => void
}

type StageUpdateForm = {
  stage: ContainerProjectStageKey
  status: ContainerProjectStageUpdateStatus | ""
  description: string
  occurredAt: string
}

const EMPTY_FORM: StageUpdateForm = {
  stage: "funding",
  status: "",
  description: "",
  occurredAt: "",
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function stageLabel(stage: string) {
  return CONTAINER_PROJECT_STAGE_OPTIONS.find(option => option.value === stage)?.label ?? stage
}

function statusLabel(status: string) {
  return CONTAINER_PROJECT_STAGE_UPDATE_STATUSES.find(option => option.value === status)?.label ?? status
}

function statusStyle(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700"
  if (status === "in_progress") return "bg-blue-50 text-blue-700"
  return "bg-slate-100 text-slate-600"
}

export function ProjectStageUpdatesPanel({ projectId, onToast }: Props) {
  const [updates, setUpdates] = useState<AdminProjectStageUpdate[]>([])
  const [form, setForm] = useState<StageUpdateForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)

  async function reload() {
    setLoading(true)
    setLoadError("")
    try {
      setUpdates(await fetchProjectStageUpdates(projectId))
    } catch {
      setLoadError("Milestone updates could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    fetchProjectStageUpdates(projectId)
      .then(rows => {
        if (active) setUpdates(rows)
      })
      .catch(() => {
        if (active) setLoadError("Milestone updates could not be loaded.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.status || !form.description.trim() || !form.occurredAt) {
      onToast("Choose a status, enter the update details and select its event time.", "error")
      return
    }

    const occurredAt = new Date(form.occurredAt)
    if (Number.isNaN(occurredAt.getTime())) {
      onToast("Enter a valid event date and time.", "error")
      return
    }

    setSaving(true)
    try {
      await createProjectStageUpdate(projectId, {
        stage: form.stage,
        status: form.status,
        description: form.description.trim(),
        occurred_at: occurredAt.toISOString(),
      })
      setForm(EMPTY_FORM)
      await reload()
      onToast("Milestone update recorded")
    } catch {
      onToast("Milestone update could not be recorded.", "error")
    } finally {
      setSaving(false)
    }
  }

  const orderedUpdates = [...updates].reverse()

  return (
    <section className="border-t border-border p-4" aria-labelledby="project-stage-updates-title">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id="project-stage-updates-title" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Container milestone updates
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Each record changes only its selected stage. Other stages stay as last reported.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          data-testid="button-refresh-stage-updates"
          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[10px] font-semibold text-muted-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      <form onSubmit={event => void submit(event)} className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-[10px] font-semibold text-muted-foreground">
            Milestone
            <select
              data-testid="select-stage-update-stage"
              value={form.stage}
              onChange={event => setForm(current => ({ ...current, stage: event.target.value as ContainerProjectStageKey }))}
              className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-foreground"
            >
              {CONTAINER_PROJECT_STAGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-semibold text-muted-foreground">
            Status
            <select
              data-testid="select-stage-update-status"
              required
              value={form.status}
              onChange={event => setForm(current => ({ ...current, status: event.target.value as StageUpdateForm["status"] }))}
              className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-foreground"
            >
              <option value="" disabled>Select status</option>
              {CONTAINER_PROJECT_STAGE_UPDATE_STATUSES.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-[10px] font-semibold text-muted-foreground">
          Update details
          <textarea
            data-testid="textarea-stage-update-description"
            required
            value={form.description}
            onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
            maxLength={5000}
            rows={2}
            placeholder="Describe what was confirmed for this milestone"
            className="mt-1 w-full resize-y rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-foreground"
          />
        </label>

        <label className="block text-[10px] font-semibold text-muted-foreground">
          Event date and time
          <input
            data-testid="input-stage-update-occurred-at"
            required
            type="datetime-local"
            value={form.occurredAt}
            onChange={event => setForm(current => ({ ...current, occurredAt: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-foreground"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          data-testid="button-submit-stage-update"
          className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "#0F3D2E" }}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Record milestone update
        </button>
      </form>

      <div className="mt-3 space-y-2">
        {loading && updates.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">Loading milestone updates…</p>
        ) : loadError ? (
          <p role="alert" data-testid="status-stage-update-load-error" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{loadError}</p>
        ) : orderedUpdates.length === 0 ? (
          <p data-testid="empty-stage-updates" className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            No milestone updates have been recorded yet.
          </p>
        ) : (
          orderedUpdates.map(update => (
            <article key={update.id} data-testid={`stage-update-${update.id}`} className="rounded-lg border border-border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{stageLabel(update.stage)}</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{update.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${statusStyle(update.status)}`}>
                  {statusLabel(update.status)}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {formatDate(update.occurred_at)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
