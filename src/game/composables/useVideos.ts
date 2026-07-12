import { pb } from '@game/pb'
import { normalizeSearch } from '@game/utils'

export const findOrCreateVideo = async (data: {
  video_id: string
  title?: string
  artist?: string
  duration?: number
}) => {
  const existing = await pb.collection('videos').getList(1, 1, {
    filter: pb.filter('video_id = {:videoId}', { videoId: data.video_id }),
  })
  if (existing.items.length > 0) return existing.items[0]
  try {
    return await pb.collection('videos').create({
      video_id: data.video_id,
      title: data.title,
      artist: data.artist,
      duration: data.duration,
      search_text: normalizeSearch(`${data.title ?? ''} ${data.artist ?? ''}`),
    })
  } catch {
    // Race condition: another client created it first
    const retry = await pb.collection('videos').getList(1, 1, {
      filter: pb.filter('video_id = {:videoId}', { videoId: data.video_id }),
    })
    return retry.items[0]
  }
}
