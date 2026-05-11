import { computed } from 'vue'
import useAuth from '@admin/composables/useAuth'
import useSettings, { type TSettings } from '@admin/composables/useSettings'

export type TUserSettings = Partial<Omit<TSettings, 'id'>>

export default function useUserSettings() {
  const { user, pb, refreshAuth } = useAuth()
  const { settings: appSettings, loadSettings } = useSettings()

  const userOverrides = computed<TUserSettings>(() => {
    return (user.value?.user_settings as TUserSettings) ?? {}
  })

  const effective = computed<Omit<TSettings, 'id'> | null>(() => {
    if (!appSettings.value) {
      return null
    }
    return { ...appSettings.value, ...userOverrides.value }
  })

  const isOverridden = (key: keyof TUserSettings): boolean => {
    return key in userOverrides.value
  }

  const saveOverrides = async (overrides: TUserSettings) => {
    await pb.collection('users').update(user.value.id, { user_settings: overrides })
    await refreshAuth()
  }

  const resetOverride = async (key: keyof TUserSettings) => {
    const updated = { ...userOverrides.value }
    delete updated[key]
    await saveOverrides(updated)
  }

  return {
    appSettings,
    userOverrides,
    effective,
    isOverridden,
    saveOverrides,
    resetOverride,
    loadSettings,
    refreshAuth,
  }
}
