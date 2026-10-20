import { describe, it, expect, vi } from 'vitest'
import { runFreshnessSweep } from '../src/services/ingestion'

describe('runFreshnessSweep (C1/C2 freshness)', () => {
  function fakePrisma(count: number) {
    return {
      disasterEvent: {
        updateMany: vi.fn().mockResolvedValue({ count }),
      },
    }
  }

  it('marca stale los eventos vencidos y retorna el count', async () => {
    const prisma = fakePrisma(3)
    const n = await runFreshnessSweep(prisma as any, 30 * 60_000)

    expect(n).toBe(3)
    expect(prisma.disasterEvent.updateMany).toHaveBeenCalledTimes(1)
    const call = (prisma.disasterEvent.updateMany as any).mock.calls[0][0]
    expect(call.data).toEqual({ stale: true })
    expect(call.where).toEqual({ stale: false, fetchedAt: { lt: expect.any(Date) }, isActive: true })
  })

  it('no lanza si el provider falla (catch interno retorna 0)', async () => {
    const prisma = {
      disasterEvent: {
        updateMany: vi.fn().mockRejectedValue(new Error('db down')),
      },
    }
    const n = await runFreshnessSweep(prisma as any, 30 * 60_000)
    expect(n).toBe(0)
  })
})
