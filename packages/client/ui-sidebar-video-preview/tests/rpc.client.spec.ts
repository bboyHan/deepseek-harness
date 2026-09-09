import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { downloadNameOf, hostFileOf, videoUrlOf } from '../src/client/rpc.ts'

const SESSION = 's-main' as SessionId

describe('video preview rpc helpers', () => {
  it('translates session and absolute file resource addresses', () => {
    expect(hostFileOf('dsh-resource://file/session/s%2F1/work/a%20b.mp4', SESSION)).toEqual({
      sessionId: 's/1',
      path: 'work/a b.mp4',
    })
    expect(hostFileOf('dsh-resource://file/absolute/etc/video.mp4', SESSION)).toEqual({
      sessionId: SESSION,
      path: '/etc/video.mp4',
    })
    expect(hostFileOf('dsh-resource://file/absolute/C:/w/a.mp4', SESSION)).toEqual({
      sessionId: SESSION,
      path: 'C:/w/a.mp4',
    })
    expect(() => hostFileOf('dsh-resource://thread/session/s%2F1/work/a.mp4', SESSION)).toThrow('not a file address')
  })

  it('builds encoded route URLs and stable download names', () => {
    expect(videoUrlOf({ sessionId: 's/1' as SessionId, path: 'work/a b.mp4' }, 3))
      .toBe('/api/sidebar-video-preview/file?sessionId=s%2F1&path=work%2Fa+b.mp4&v=3')
    expect(downloadNameOf('/host/project/work/clip.mp4')).toBe('clip.mp4')
    expect(downloadNameOf('C:\\host\\clip.webm')).toBe('clip.webm')
    expect(downloadNameOf('')).toBe('video')
  })
})
