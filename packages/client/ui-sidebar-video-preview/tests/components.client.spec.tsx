// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { VideoPreview } from '../src/client/VideoPreview.tsx'
import { createVideoStore } from '../src/client/store.ts'
import { meta, propsFor, TAB_ID } from './fixtures.client.ts'

afterEach(cleanup)

describe('video preview component', () => {
  it('renders the loading placeholder and starts the first load', () => {
    const instance = createVideoStore().create()
    const props = propsFor(instance)
    const view = render(<VideoPreview {...props} />)
    expect(view.container.querySelector('[data-video-preview-state="loading"]')).not.toBeNull()
    expect(props.load).toHaveBeenCalledWith(TAB_ID, expect.objectContaining({ path: 'work/clip.mp4' }), expect.any(AbortSignal))
  })

  it('renders the video element with native playback attributes and actions', () => {
    const instance = createVideoStore().create()
    instance.actions.load(TAB_ID, '/api/sidebar-video-preview/file?sessionId=s-1&path=work%2Fclip.mp4&v=0')
    instance.actions.metadata(TAB_ID, { duration: 65, width: 1280, height: 720 })
    const props = propsFor(instance)
    const resource = meta(true)
    props.useResource = (() => resource) as typeof props.useResource
    const view = render(<VideoPreview {...props} />)
    const video = view.container.querySelector<HTMLVideoElement>('[data-video-preview-player]')!
    expect(video.controls).toBe(true)
    expect(video.preload).toBe('metadata')
    expect(video.playsInline).toBe(true)
    expect(video.getAttribute('src')).toContain('/api/sidebar-video-preview/file')
    expect(view.container.querySelector('[data-video-preview-meta]')?.textContent).toContain('4.0KB')
    expect(view.container.querySelector('[data-video-preview-meta]')?.textContent).toContain('1:05')
    expect(view.container.querySelector('[data-video-preview-meta]')?.textContent).toContain('1280 x 720')
    expect(view.container.querySelector('[data-video-preview-changed]')).not.toBeNull()
    expect(view.container.querySelector<HTMLAnchorElement>('a[download]')?.getAttribute('download')).toBe('clip.mp4')
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[aria-label="reload"]')!)
    expect(resource.reload).toHaveBeenCalledTimes(1)
    expect(props.reload).toHaveBeenCalledWith(TAB_ID, expect.objectContaining({ path: 'work/clip.mp4' }), expect.any(AbortSignal))
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[aria-label="openExternal"]')!)
    expect(props.openExternal).toHaveBeenCalledWith(TAB_ID, '/host/project/work/clip.mp4', expect.any(AbortSignal))
  })

  it('uses workspace paths for native open when file metadata is unavailable', () => {
    const instance = createVideoStore().create()
    instance.actions.load(TAB_ID, '/api/sidebar-video-preview/file?sessionId=s-1&path=work%2Fclip.mp4&v=0')
    const props = propsFor(instance)
    props.useResource = (() => ({
      status: 'loading',
      value: undefined,
      failure: undefined,
      reload: () => {},
    })) as unknown as typeof props.useResource
    const view = render(<VideoPreview {...props} />)
    expect(view.container.querySelector('[data-video-preview-body]')?.textContent).toContain('loading')
    expect(view.container.querySelector('[data-video-preview-meta]')).toBeNull()
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[aria-label="openExternal"]')!)
    expect(props.openExternal).toHaveBeenCalledWith(TAB_ID, 'work/clip.mp4', expect.any(AbortSignal))
  })

  it('records metadata and maps browser media errors into visible failure rows', () => {
    const instance = createVideoStore().create()
    instance.actions.load(TAB_ID, '/api/video')
    const props = propsFor(instance)
    const view = render(<VideoPreview {...props} />)
    const video = view.container.querySelector<HTMLVideoElement>('[data-video-preview-player]')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 12 })
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 })
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 360 })
    fireEvent.loadedMetadata(video)
    expect(instance.getSnapshot().byTab[TAB_ID]?.metadata).toEqual({ duration: 12, width: 640, height: 360 })
    Object.defineProperty(video, 'duration', { configurable: true, value: Number.NaN })
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 0 })
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 0 })
    fireEvent.loadedMetadata(video)
    expect(instance.getSnapshot().byTab[TAB_ID]?.metadata).toEqual({})
    Object.defineProperty(video, 'error', { configurable: true, value: { code: 4 } })
    fireEvent.error(video)
    expect(view.container.querySelector('[data-video-preview-failed]')?.textContent).toContain('errorUnsupported')
    expect(view.container.querySelector('[data-video-preview-player]')).toBeNull()
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[data-video-preview-failed] button')!)
    expect(props.reload).toHaveBeenCalledTimes(1)
  })

  it('maps every native media error code to an actionable localized row', () => {
    for (const [code, key] of [[1, 'errorAborted'], [2, 'errorNetwork'], [3, 'errorDecode'], [4, 'errorUnsupported'], [0, 'errorUnavailable']] as const) {
      const instance = createVideoStore().create()
      instance.actions.load(TAB_ID, '/api/video')
      const props = propsFor(instance)
      const view = render(<VideoPreview {...props} />)
      const video = view.container.querySelector<HTMLVideoElement>('[data-video-preview-player]')!
      Object.defineProperty(video, 'error', { configurable: true, value: { code } })
      fireEvent.error(video)
      expect(view.container.querySelector('[data-video-preview-failed]')?.textContent).toContain(key)
      view.unmount()
    }
  })

  it('renders metadata failures without a blank body', () => {
    const instance = createVideoStore().create()
    instance.actions.load(TAB_ID, '/api/video')
    const props = propsFor(instance)
    props.useResource = (() => ({
      status: 'failed',
      value: undefined,
      failure: { code: 'workspace-file/not-found', message: 'missing', details: {} },
      reload: () => {},
    })) as unknown as typeof props.useResource
    const view = render(<VideoPreview {...props} />)
    expect(view.container.querySelector('[data-video-preview-meta-failed]')?.textContent).toContain('errorUnavailable')
    expect(view.container.querySelector('[data-video-preview-player]')).not.toBeNull()
  })
})
