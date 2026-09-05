import { beforeEach, describe, expect, it, vi } from 'vitest'

import { $cronFocusJobId, setCronFocusJobId } from '@/store/cron'

import { openCronNotificationTarget } from './notification-target'

const { selectConnection, setShowAllProfiles } = vi.hoisted(() => ({
  selectConnection: vi.fn(async () => undefined),
  setShowAllProfiles: vi.fn()
}))

vi.mock('@/store/connections', () => ({ selectConnection }))
vi.mock('@/store/profile', () => ({ setShowAllProfiles }))

describe('openCronNotificationTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCronFocusJobId(null)
  })

  it('restores the owning connection and profile before navigating', async () => {
    const navigate = vi.fn()

    await openCronNotificationTarget(
      { connectionId: 'vps', jobId: 'job-1', profile: 'research', runAt: 't2' },
      navigate
    )

    expect(selectConnection).toHaveBeenCalledWith('vps', { profile: 'research' })
    expect($cronFocusJobId.get()).toBe('job-1')
    expect(navigate).toHaveBeenCalledWith('/cron')
  })

  it('restores the all-profiles view for aggregated notifications', async () => {
    await openCronNotificationTarget({ connectionId: 'local', jobId: 'job-2', profile: 'all' }, vi.fn())

    expect(selectConnection).toHaveBeenCalledWith('local')
    expect(setShowAllProfiles).toHaveBeenCalledWith(true)
  })
})
