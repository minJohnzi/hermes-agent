import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { useI18n } from '@/i18n'
import { $cronJobs, encodeCronNotifyId, setCronFocusJobId } from '@/store/cron'
import { dispatchNativeNotification } from '@/store/native-notifications'
import { notify } from '@/store/notifications'
import { $profileScope, sidebarProfileForScope } from '@/store/profile'
import { $connection, $gatewayState } from '@/store/session'
import type { CronJob } from '@/types/hermes'

interface Baseline {
  lastRunAt: string | null
}

export function CronNotificationBridge() {
  const profile = sidebarProfileForScope(useStore($profileScope))
  const connectionId = useStore($connection)?.connectionId ?? 'local'
  const gatewayState = useStore($gatewayState)
  const scopeKey = `${connectionId}:${profile}`

  return (
    <CronNotificationBridgeImpl
      connectionId={connectionId}
      gatewayState={gatewayState}
      key={scopeKey}
      profile={profile}
    />
  )
}

function CronNotificationBridgeImpl({
  connectionId,
  gatewayState,
  profile
}: {
  connectionId: string
  gatewayState: string
  profile: string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const jobs = useStore($cronJobs)

  const baselineCache = useRef<Map<string, Baseline>>(new Map())
  const jobsAtDisconnect = useRef<CronJob[] | null>(null)
  const needsReconnectBaseline = useRef(false)

  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    if (gatewayState !== 'open') {
      needsReconnectBaseline.current = true
      jobsAtDisconnect.current = jobs
      baselineCache.current = new Map()

      return
    }

    if (needsReconnectBaseline.current) {
      if (jobs === jobsAtDisconnect.current) {
        return
      }

      needsReconnectBaseline.current = false
      jobsAtDisconnect.current = null
      baselineCache.current = new Map(jobs.map(job => [job.id, { lastRunAt: job.last_run_at ?? null }]))

      return
    }

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
      const lastRunAt = job.last_run_at ?? null
      const newlyRun = lastRunAt !== null && existing.lastRunAt !== lastRunAt

      if (newlyRun) {
        // Dispatch notification
        const status = job.last_status === 'ok' || (!job.last_status && !job.last_error) ? 'success' : 'failure'

        const title = status === 'success' ? t.cron.notify.success.title : t.cron.notify.failure.title

        const name = job.name || t.cron.notify.unnamed

        const errorSummary = job.last_error
          ? job.last_error.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
          : ''

        const jobProfile = job.profile || profile
        const notifyId = encodeCronNotifyId({ connectionId, jobId: job.id, profile: jobProfile, runAt: lastRunAt })
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
  }, [jobs, connectionId, gatewayState, profile, t, navigate])

  return null
}
