import { ref } from 'vue'
import { pb } from '@game/pb'

export default function usePlayer(sessionId: string) {
  const player = ref<any>(null)
  const storageKey = `blablind_player_${sessionId}`

  const join = async (name: string) => {
    const record = await pb.collection('players').create({ session: sessionId, name, score: 0 })
    localStorage.setItem(storageKey, record.id)
    player.value = record
    return record
  }

  const restore = async () => {
    const savedId = localStorage.getItem(storageKey)
    if (!savedId) return null
    try {
      player.value = await pb.collection('players').getOne(savedId)
      return player.value
    } catch {
      localStorage.removeItem(storageKey)
      return null
    }
  }

  return { player, join, restore }
}
