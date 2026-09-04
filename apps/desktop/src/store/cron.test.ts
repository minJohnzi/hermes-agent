import { beforeEach, describe, expect, it } from 'vitest'

import {
  $cronJobs,
  beginCronJobsRequest,
  commitCronJobsRequest,
  decodeCronNotifyId,
  encodeCronNotifyId,
  setCronJobs,
  updateCronJobs
} from './cron'

const oldJob = { id: 'old' } as never
const newJob = { id: 'new' } as never

describe('cron jobs request fencing', () => {
  beforeEach(() => {
    setCronJobs([])
  })

  it('rejects an older refresh after a newer refresh commits', () => {
    const older = beginCronJobsRequest('all')
    const newer = beginCronJobsRequest('all')

    expect(commitCronJobsRequest(newer, [newJob])).toBe(true)
    expect(commitCronJobsRequest(older, [oldJob])).toBe(false)
    expect($cronJobs.get()).toEqual([newJob])
  })

  it('rejects a refresh from the previous profile scope', () => {
    const work = beginCronJobsRequest('work')

    beginCronJobsRequest('personal')

    expect(commitCronJobsRequest(work, [oldJob])).toBe(false)
    expect($cronJobs.get()).toEqual([])
  })

  it('rejects an in-flight poll after a local mutation', () => {
    const poll = beginCronJobsRequest('all')

    updateCronJobs(() => [newJob])

    expect(commitCronJobsRequest(poll, [oldJob])).toBe(false)
    expect($cronJobs.get()).toEqual([newJob])
  })
})

describe('cron focus ID encoding', () => {
  it('encodes and decodes job ID safely', () => {
    const jobId = 'test/job/id with spaces'
    const notifyId = encodeCronNotifyId(jobId)
    expect(notifyId).toBe('cron-focus:test%2Fjob%2Fid%20with%20spaces')
    expect(decodeCronNotifyId(notifyId)).toBe(jobId)
  })

  it('returns null for unrelated notification IDs', () => {
    expect(decodeCronNotifyId('other-id')).toBeNull()
  })

  it('handles invalid decode gracefully', () => {
    // Malformed URI component
    expect(decodeCronNotifyId('cron-focus:%E0%A4%A')).toBeNull()
  })
})
