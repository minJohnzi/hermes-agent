import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { useI18n } from '@/i18n'
import { $cronJobs, encodeCronNotifyId, setCronFocusJobId } from '@/store/cron'
import { dispatchNativeNotification } from '@/store/native-notifications'
import { notify } from '@/store/notifications'
import { $activeProfile } from '@/store/profile'
import { $connection } from '@/store/session'

interface Baseline {
  lastRunAt: string | null
}

export function CronNotificationBridge() {
  const profile = useStore($activeProfile)
  const connectionId = useStore($connection)?.connectionId ?? 'local'
  const scopeKey = `${connectionId}:${profile}`

  return <CronNotificationBridgeImpl connectionId={connectionId} key={scopeKey} profile={profile} />
}

function CronNotificationBridgeImpl({ connectionId, profile }: { connectionId: string; profile: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const jobs = useStore($cronJobs)

  const baselineCache = useRef<Map<string, Baseline>>(new Map())

  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    const baseline = baselineCache.current
    const newBaseline = new Map<string, Baseline>()

    for (const job of jobs) {
      const existing = baseline.get(job.id)

      if (!existing) {
        // First time seeing this job in this scope. Add to baseline, no notification.
        newBaseline.set(job.id, { lastRunAt: job.last_run_at ?? null })

        continue
      }

      // We already know about this job. Did its last_run_at change to a new timestamp?
      const newlyRun = job.last_run_at !== null && existing.lastRunAt !== job.last_run_at

      if (newlyRun) {
        // Dispatch notification
        const status = job.last_status === 'ok' || (!job.last_status && !job.last_error) ? 'success' : 'failure'

        const title = status === 'success' ? t.cron.notify.success.title : t.cron.notify.failure.title

        const name = job.name || t.cron.notify.unnamed

        const errorSummary = job.last_error
          ? job.last_error.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
          : ''

        const notifyId = encodeCronNotifyId(job.id)
        const tag = `cron-run:${connectionId}:${profile}:${job.id}:${job.last_run_at}`

        // 1. Try foreground notification (NotificationStack)
        const isForeground = !document.hidden && (typeof document.hasFocus !== 'function' || document.hasFocus())

        if (isForeground) {
          const actionText = t.cron.notify.action.view

          const action = {
            label: actionText,
            onClick: () => {
              setCronFocusJobId(job.id)
              navigate('/cron')
            }
          }

          if (status === 'success') {
            notify({
              action,
              id: notifyId,
              kind: 'success',
              message: name,
              title
            })
          } else {
            notify({
              action,
              durationMs: 0,
              id: notifyId,
              kind: 'error',
              message: errorSummary ? `${name}: ${errorSummary}` : name,
              title
            })
          }
        } else {
          // 2. Try native OS notification
          dispatchNativeNotification({
            activate: '/cron',
            body: name,
            global: true, // Fire even if not the active chat session
            kind: 'cron',
            notifyId, // Handled in use-desktop-integrations
            tag,
            title
          })
        }
      }

      // Keep it in baseline
      newBaseline.set(job.id, { lastRunAt: job.last_run_at ?? null })
    }

    baselineCache.current = newBaseline
  }, [jobs, connectionId, profile, t, navigate])

  return null
}
