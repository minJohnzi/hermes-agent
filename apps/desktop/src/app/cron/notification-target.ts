import { selectConnection } from '@/store/connections'
import { type CronNotificationTarget, setCronFocusJobId } from '@/store/cron'
import { setShowAllProfiles } from '@/store/profile'

export async function openCronNotificationTarget(
  target: CronNotificationTarget,
  navigate: (path: string) => void
): Promise<void> {
  if (target.connectionId) {
    if (target.profile === 'all') {
      await selectConnection(target.connectionId)
      setShowAllProfiles(true)
    } else {
      await selectConnection(target.connectionId, { profile: target.profile || undefined })
    }
  }

  setCronFocusJobId(target.jobId)
  navigate('/cron')
}
