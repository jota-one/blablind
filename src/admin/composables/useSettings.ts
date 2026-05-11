import { ref } from 'vue'
import config from '../../config'
import PocketBase from 'pocketbase'

export interface TSettings {
  id: string
  max_buzz_attempts: number
  rebuzz_delay: number
  auto_reject_delay: number
  continue_after_success: boolean
  stop_method: 'vote_unanimous' | 'host_choice'
  force_equity: boolean
}

export default function useSettings() {
  const pb = new PocketBase(config.apiBaseUrl)
  const settings = ref<TSettings | null>(null)

  const loadSettings = async () => {
    const result = await pb.collection<TSettings>('app_settings').getList(1, 1)
    settings.value = result.items[0] ?? null
  }

  const saveSettings = async (payload: Omit<TSettings, 'id'>) => {
    if (!settings.value) { return }
    return pb.collection('app_settings').update(settings.value.id, payload)
  }

  return { settings, loadSettings, saveSettings }
}
