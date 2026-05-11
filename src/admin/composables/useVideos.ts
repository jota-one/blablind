import { ref } from 'vue'
import config from '../../config'
import PocketBase from 'pocketbase'
import { normalizeSearch } from '@game/utils'

export interface TVideo {
  id: string
  video_id: string
  title: string
  artist: string
  duration: number
  search_text: string
  created: string
  updated: string
}

export default function useVideos() {
  const pb = new PocketBase(config.apiBaseUrl)

  const videos = ref<TVideo[]>([])
  const totalVideos = ref(0)

  const loadVideos = async (query?: string, sort = '-created') => {
    const options = {
      sort,
      fields: 'id,video_id,title,artist,duration,created,updated',
    }

    if (query?.trim()) {
      const tokens = normalizeSearch(query)
        .split(/\s+/)
        .filter(t => t.length >= 2)
      const filter = tokens.map(t => `search_text ~ "${t.replace(/"/g, '\\"')}"`).join(' && ')
      videos.value = await pb.collection<TVideo>('videos').getFullList({
        ...options,
        filter,
      })
    } else {
      const result = await pb.collection<TVideo>('videos').getList(1, 100, options)
      videos.value = result.items
      totalVideos.value = result.totalItems
    }
  }

  const updateVideo = async (
    id: string,
    payload: { title: string; artist: string; duration: number },
  ) => {
    return pb.collection('videos').update(id, {
      title: payload.title.trim(),
      artist: payload.artist.trim(),
      duration: payload.duration,
      search_text: normalizeSearch(`${payload.title} ${payload.artist}`),
    })
  }

  const deleteVideo = async (id: string) => {
    return pb.collection('videos').delete(id)
  }

  return { videos, totalVideos, loadVideos, updateVideo, deleteVideo }
}
