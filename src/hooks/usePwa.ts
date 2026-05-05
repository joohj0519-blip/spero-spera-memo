import { useEffect, useState } from 'react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useStandalone(): boolean {
  const [isStandalone, set] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(display-mode: standalone)')
    const apply = () => set(m.matches || (window.navigator as { standalone?: boolean }).standalone === true)
    apply()
    m.addEventListener('change', apply)
    return () => m.removeEventListener('change', apply)
  }, [])
  return isStandalone
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
    }
    const onInstalled = () => {
      setEvt(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!evt) return 'unavailable'
    await evt.prompt()
    const choice = await evt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setEvt(null)
    }
    return choice.outcome
  }

  return { canInstall: !!evt, installed, install }
}
