/**
 * Replaces the YouTube IFrame API with a synchronous fake so tests never load a
 * real player (slow, flaky, consent-gated). YoutubePlayer.vue checks
 * `window.YT?.Player` and never injects the real script once it is present.
 *
 * The fake fires `onReady` and an immediate "playing" state change, which is what
 * unlocks the buzz UI (audioUnlocked) in Room.vue.
 */
export const ytStubInitScript = `
  (function () {
    function FakePlayer(el, opts) {
      this.opts = opts || {}
      var self = this
      setTimeout(function () {
        self.opts.events && self.opts.events.onReady && self.opts.events.onReady({ target: self })
        self.opts.events && self.opts.events.onStateChange && self.opts.events.onStateChange({ data: 1 })
      }, 0)
    }
    FakePlayer.prototype.playVideo = function () {
      this.opts.events && this.opts.events.onStateChange && this.opts.events.onStateChange({ data: 1 })
    }
    FakePlayer.prototype.pauseVideo = function () {}
    FakePlayer.prototype.stopVideo = function () {}
    FakePlayer.prototype.loadVideoById = function () {
      this.opts.events && this.opts.events.onStateChange && this.opts.events.onStateChange({ data: 1 })
    }
    FakePlayer.prototype.seekTo = function () {}
    FakePlayer.prototype.getCurrentTime = function () { return 0 }
    FakePlayer.prototype.destroy = function () {}
    window.YT = { Player: FakePlayer, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } }
  })()
`
