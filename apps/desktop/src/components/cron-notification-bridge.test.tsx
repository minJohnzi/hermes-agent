import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setCronJobs } from '@/store/cron'
import { dispatchNativeNotification } from '@/store/native-notifications'
import { notify } from '@/store/notifications'
import { $activeGatewayProfile, $activeProfile, $showAllProfiles } from '@/store/profile'
import { $connection, $gatewayState } from '@/store/session'
import type { CronJob } from '@/types/hermes'

import { CronNotificationBridge } from './cron-notification-bridge'

vi.mock('@/store/native-notifications', () => ({
  dispatchNativeNotification: vi.fn()
}))

vi.mock('@/store/notifications', () => ({
  notify: vi.fn()
}))

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      cron: {
        notify: {
          action: { view: 'View Cron Job' },
          failure: { title: 'Cron Job Failed' },
          success: { title: 'Cron Job Completed' },
          unnamed: 'Unnamed Cron Job'
        }
      }
    }
  })
}))

function setWindowState(focused: boolean, hidden: boolean) {
  Object.defineProperty(window.document, 'hidden', { configurable: true, value: hidden })
  Object.defineProperty(window.document, 'hasFocus', { configurable: true, value: () => focused })
}

function renderBridge() {
  return render(<CronNotificationBridge />)
}

describe('CronNotificationBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      setCronJobs([])
      $activeProfile.set('local')
      $activeGatewayProfile.set('default')
      $showAllProfiles.set(false)
      $connection.set(null)
      $gatewayState.set('open')
    })
    setWindowState(true, false) // Default to foreground
  })

  it('does not notify on initial load', () => {
    act(() => {
      setCronJobs([{ id: 'j1', last_run_at: 't1', name: 'Job 1' } as CronJob])
    })
    renderBridge()
    expect(notify).not.toHaveBeenCalled()
    expect(dispatchNativeNotification).not.toHaveBeenCalled()
  })

  it('notifies when known job goes from null to timestamp', () => {
    const job = { id: 'j1', last_run_at: null, last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    expect(notify).not.toHaveBeenCalled()

    act(() => {
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('does not notify when timestamp is unchanged', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([{ ...job, name: 'Changed Name' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('does not treat an omitted timestamp as a completed run', () => {
    const job = { id: 'j1', name: 'Job A' } as CronJob
    act(() => setCronJobs([job]))
    const { rerender } = renderBridge()

    act(() => setCronJobs([{ ...job }]))
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('uses the first refreshed snapshot after reconnect as a new baseline', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => setCronJobs([job]))
    const { rerender } = renderBridge()

    act(() => $gatewayState.set('closed'))
    rerender(<CronNotificationBridge />)
    act(() => $gatewayState.set('open'))
    rerender(<CronNotificationBridge />)
    act(() => setCronJobs([{ ...job, last_run_at: 't2' }]))
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('does not notify when a completely new job is added', () => {
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([{ id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('notifies when last_run_at changes', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    expect(notify).not.toHaveBeenCalled()

    act(() => {
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('uses native notification when backgrounded', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    setWindowState(false, true)

    act(() => {
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
    expect(dispatchNativeNotification).toHaveBeenCalledTimes(1)
    expect(dispatchNativeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Job A',
        kind: 'cron'
      })
    )
  })

  it('differentiates success and failure based on last_status', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job B' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([{ ...job, last_error: 'Some error occurred', last_run_at: 't2', last_status: 'error' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith({
      action: expect.objectContaining({ label: 'View Cron Job' }),
      durationMs: 0,
      id: expect.any(String),
      kind: 'error',
      message: 'Job B: Some error occurred',
      title: 'Cron Job Failed'
    })
  })

  it('maps missing last_status with last_error to failure', () => {
    const job = { id: 'j1', last_error: 'Fallback err', last_run_at: 't1', name: 'Job B' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }))
  })

  it('maps missing last_status and last_error to success', () => {
    const job = { id: 'j1', last_run_at: 't1', name: 'Job B' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }))
  })

  it('re-establishes baseline after profile change', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()
    // Change profile and jobs simultaneously (simulating connection switch receiving new state)
    act(() => {
      $activeGatewayProfile.set('remote')
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('re-establishes baseline after connection change', () => {
    const job = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'Job A' } as CronJob
    act(() => {
      setCronJobs([job])
    })
    const { rerender } = renderBridge()

    act(() => {
      $connection.set({ connectionId: 'vps' } as never)
      setCronJobs([{ ...job, last_run_at: 't2' }])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).not.toHaveBeenCalled()
  })

  it('notifies for multiple jobs simultaneously', () => {
    const jobA = { id: 'j1', last_run_at: 't1', last_status: 'ok', name: 'A' } as CronJob
    const jobB = { id: 'j2', last_run_at: 't1', last_status: 'ok', name: 'B' } as CronJob
    act(() => {
      setCronJobs([jobA, jobB])
    })
    const { rerender } = renderBridge()

    act(() => {
      setCronJobs([
        { ...jobA, last_run_at: 't2' },
        { ...jobB, last_run_at: 't2' }
      ])
    })
    rerender(<CronNotificationBridge />)

    expect(notify).toHaveBeenCalledTimes(2)
  })
})
