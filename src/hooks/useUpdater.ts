import { useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; notes: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready' }
  | { status: 'upToDate' }
  | { status: 'error'; message: string }

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({ status: 'idle' })

  const sprawdz = async () => {
    setState({ status: 'checking' })
    try {
      const update = await check()
      if (!update) {
        setState({ status: 'upToDate' })
        setTimeout(() => setState({ status: 'idle' }), 3000)
        return
      }
      setState({
        status: 'available',
        version: update.version,
        notes: update.body ?? '',
      })
    } catch (e) {
      setState({ status: 'error', message: String(e) })
      setTimeout(() => setState({ status: 'idle' }), 5000)
    }
  }

  const pobierzIZainstaluj = async () => {
    setState({ status: 'downloading', percent: 0 })
    try {
      const update = await check()
      if (!update) return
      let downloaded = 0
      let total = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0
          setState({ status: 'downloading', percent })
        } else if (event.event === 'Finished') {
          setState({ status: 'ready' })
        }
      })
    } catch (e) {
      setState({ status: 'error', message: String(e) })
      setTimeout(() => setState({ status: 'idle' }), 5000)
    }
  }

  const uruchomPonownie = () => relaunch()

  return { state, sprawdz, pobierzIZainstaluj, uruchomPonownie }
}
