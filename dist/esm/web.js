import { WebPlugin } from '@capacitor/core';
import { RmxAudioStatusMessage } from './Constants';
import { validateTrack, validateTracks } from './utils';
export class PlaylistWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.playlistItems = [];
        this.loop = false;
        this.options = {};
        this.currentTrack = null;
        this.lastState = 'stopped';
        this.hlsLoaded = false;
    }
    addAllItems(options) {
        this.playlistItems = this.playlistItems.concat(validateTracks(options.items));
        return Promise.resolve();
    }
    addItem(options) {
        const track = validateTrack(options.item);
        if (track) {
            this.playlistItems.push(track);
            this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_ITEM_ADDED, track, track.trackId);
        }
        return Promise.resolve();
    }
    async clearAllItems() {
        await this.release();
        this.playlistItems = [];
        this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_PLAYLIST_CLEARED, null, "INVALID");
        return Promise.resolve();
    }
    async initialize() {
        this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_INIT, null, "INVALID");
        return Promise.resolve();
    }
    async pause() {
        var _a;
        (_a = this.audio) === null || _a === void 0 ? void 0 : _a.pause();
    }
    async play() {
        var _a;
        await ((_a = this.audio) === null || _a === void 0 ? void 0 : _a.play());
    }
    async playTrackById(options) {
        for (let track of this.playlistItems) {
            if (track.trackId === options.id) {
                if (track !== this.currentTrack) {
                    await this.setCurrent(track);
                    if (this.audio && (options === null || options === void 0 ? void 0 : options.position) && options.position > 0) {
                        this.audio.currentTime = options.position;
                    }
                }
                return this.play();
            }
        }
        return Promise.reject();
    }
    async playTrackByIndex(options) {
        for (let { index, item } of this.playlistItems.map((item, index) => ({ index, item }))) {
            if (index === options.index) {
                if (item !== this.currentTrack) {
                    await this.setCurrent(item);
                    if (this.audio && (options === null || options === void 0 ? void 0 : options.position) && options.position > 0) {
                        this.audio.currentTime = options.position;
                    }
                }
                return this.play();
            }
        }
        return Promise.reject();
    }
    async release() {
        await this.pause();
        this.audio = undefined;
        return Promise.resolve();
    }
    removeItem(options) {
        this.playlistItems.forEach((item, index) => {
            if (options.index && options.index === index) {
                const removedTrack = this.playlistItems.splice(index, 1);
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_ITEM_REMOVED, removedTrack[0], removedTrack[0].trackId);
            }
            else if (options.id && options.id === item.trackId) {
                const removedTrack = this.playlistItems.splice(index, 1);
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_ITEM_REMOVED, removedTrack[0], removedTrack[0].trackId);
            }
        });
        return Promise.resolve();
    }
    removeItems(options) {
        options.items.forEach(async (item) => {
            await this.removeItem(item);
        });
        return Promise.resolve();
    }
    seekTo(options) {
        if (this.audio) {
            this.audio.currentTime = options.position;
            return Promise.resolve();
        }
        return Promise.reject();
    }
    selectTrackById(options) {
        for (const item of this.playlistItems) {
            if (item.trackId === options.id) {
                return this.setCurrent(item);
            }
        }
        return Promise.reject();
    }
    selectTrackByIndex(options) {
        let index = 0;
        for (const item of this.playlistItems) {
            if (index === options.index) {
                return this.setCurrent(item);
            }
            index++;
        }
        return Promise.reject();
    }
    setLoop(options) {
        this.loop = options.loop;
        return Promise.resolve();
    }
    setOptions(options) {
        this.options = options || {};
        return Promise.resolve();
    }
    setPlaybackVolume(options) {
        if (this.audio) {
            this.audio.volume = options.volume;
            return Promise.resolve();
        }
        return Promise.reject();
    }
    async setPlaylistItems(options) {
        var _a, _b, _c;
        this.playlistItems = options.items;
        if (this.playlistItems.length > 0) {
            let currentItem = this.playlistItems.filter(i => { var _a; return i.trackId === ((_a = options.options) === null || _a === void 0 ? void 0 : _a.playFromId); })[0];
            if (!currentItem) {
                currentItem = this.playlistItems[0];
            }
            await this.setCurrent(currentItem, (_b = (_a = options.options) === null || _a === void 0 ? void 0 : _a.playFromPosition) !== null && _b !== void 0 ? _b : 0);
            if (!((_c = options.options) === null || _c === void 0 ? void 0 : _c.startPaused)) {
                await this.play();
            }
        }
        return Promise.resolve();
    }
    async skipForward() {
        let found = null;
        this.playlistItems.forEach((item, index) => {
            if (!found && this.getCurrentTrackId() === item.trackId) {
                found = index;
            }
        });
        if (found === this.playlistItems.length - 1) {
            found = -1;
        }
        if (found !== null) {
            this.updateStatus(RmxAudioStatusMessage.RMX_STATUS_SKIP_BACK, {
                currentIndex: found + 1,
                currentItem: this.playlistItems[found + 1]
            }, this.playlistItems[found + 1].trackId);
            return this.setCurrent(this.playlistItems[found + 1]);
        }
        return Promise.reject();
    }
    async skipBack() {
        let found = null;
        this.playlistItems.forEach((item, index) => {
            if (!found && this.getCurrentTrackId() === item.trackId) {
                found = index;
            }
        });
        if (found === 0) {
            found = this.playlistItems.length - 1;
        }
        if (found !== null) {
            this.updateStatus(RmxAudioStatusMessage.RMX_STATUS_SKIP_BACK, {
                currentIndex: found - 1,
                currentItem: this.playlistItems[found - 1]
            }, this.playlistItems[found - 1].trackId);
            return this.setCurrent(this.playlistItems[found - 1]);
        }
        return Promise.reject();
    }
    setPlaybackRate(options) {
        if (this.audio) {
            this.audio.playbackRate = options.rate;
            return Promise.resolve();
        }
        return Promise.reject();
    }
    // register events
    /*
      private registerHlsListeners(hls: Hls, position?: number) {
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          this.notifyListeners('status', {
            action: "status",
            status: {
              msgType: RmxAudioStatusMessage.RMXSTATUS_CANPLAY,
              trackId: this.getCurrentTrackId(),
              value: this.getCurrentTrackStatus('loading'),
            }
          })
          if(position) {
            await this.seekTo({position});
          }
        });
      }*/
    registerHtmlListeners(position) {
        const canPlayListener = async () => {
            var _a;
            this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_CANPLAY, this.getCurrentTrackStatus('paused'));
            if (position) {
                await this.seekTo({ position });
            }
            (_a = this.audio) === null || _a === void 0 ? void 0 : _a.removeEventListener('canplay', canPlayListener);
        };
        if (this.audio) {
            this.audio.addEventListener('canplay', canPlayListener);
            this.audio.addEventListener('playing', () => {
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_PLAYING, this.getCurrentTrackStatus('playing'));
            });
            this.audio.addEventListener('pause', () => {
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_PAUSE, this.getCurrentTrackStatus('paused'));
            });
            this.audio.addEventListener('error', () => {
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_ERROR, this.getCurrentTrackStatus('error'));
            });
            this.audio.addEventListener('ended', () => {
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_COMPLETED, this.getCurrentTrackStatus('stopped'));
                const currentTrackIndex = this.playlistItems.findIndex(i => i.trackId === this.getCurrentTrackId());
                if (currentTrackIndex === this.playlistItems.length - 1) {
                    if (this.loop) {
                        this.setCurrent(this.playlistItems[0], undefined, true);
                    }
                    else {
                        this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_PLAYLIST_COMPLETED, this.getCurrentTrackStatus('stopped'));
                    }
                }
                else {
                    this.setCurrent(this.playlistItems[currentTrackIndex + 1], undefined, true);
                }
            });
            let lastTrackId, lastPosition;
            this.audio.addEventListener('timeupdate', () => {
                const status = this.getCurrentTrackStatus(this.lastState);
                if (lastTrackId !== this.getCurrentTrackId() || lastPosition !== status.currentPosition) {
                    this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_PLAYBACK_POSITION, status);
                    lastTrackId = this.getCurrentTrackId();
                    lastPosition = status.currentPosition;
                }
            });
            this.audio.addEventListener('durationchange', () => {
                this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_DURATION, this.getCurrentTrackStatus(this.lastState));
            });
        }
    }
    getCurrentTrackId() {
        if (this.currentTrack) {
            return this.currentTrack.trackId;
        }
        return 'INVALID';
    }
    getCurrentIndex() {
        if (this.currentTrack) {
            for (let i = 0; i < this.playlistItems.length; i++) {
                if (this.playlistItems[i].trackId === this.currentTrack.trackId) {
                    return i;
                }
            }
        }
        return -1;
    }
    getCurrentTrackStatus(currentState) {
        var _a, _b, _c;
        this.lastState = currentState;
        return {
            trackId: this.getCurrentTrackId(),
            isStream: !!((_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.isStream),
            currentIndex: this.getCurrentIndex(),
            status: currentState,
            currentPosition: ((_b = this.audio) === null || _b === void 0 ? void 0 : _b.currentTime) || 0,
            duration: ((_c = this.audio) === null || _c === void 0 ? void 0 : _c.duration) || 0,
        };
    }
    async setCurrent(item, position, forceAutoplay = false) {
        let wasPlaying = false;
        if (this.audio) {
            wasPlaying = !this.audio.paused;
            this.audio.pause();
            this.audio.src = '';
            this.audio.removeAttribute('src');
            this.audio.load();
        }
        this.audio = document.createElement('video');
        if (wasPlaying || forceAutoplay) {
            this.audio.addEventListener('canplay', () => {
                this.play();
            });
        }
        this.currentTrack = item;
        if (item.assetUrl.includes('.m3u8')) {
            await this.loadHlsJs();
            const hls = new Hls({
                autoStartLoad: true,
                debug: false,
                enableWorker: true,
            });
            hls.attachMedia(this.audio);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(item.assetUrl);
            });
            //this.registerHlsListeners(hls, position);
        }
        else {
            this.audio.src = item.assetUrl;
        }
        await this.registerHtmlListeners(position);
        this.updateStatus(RmxAudioStatusMessage.RMXSTATUS_TRACK_CHANGED, {
            currentItem: item
        });
    }
    updateStatus(msgType, value, trackId) {
        this.notifyListeners('status', {
            action: 'status',
            status: {
                msgType: msgType,
                trackId: trackId ? trackId : this.getCurrentTrackId(),
                value: value
            }
        });
    }
    loadHlsJs() {
        if (window.Hls !== undefined || this.hlsLoaded) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            console.log("LOADING HLS FROM CDN");
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.1.1';
            document.getElementsByTagName('head')[0].appendChild(script);
            script.onload = () => {
                this.hlsLoaded = true;
                resolve(void 0);
            };
            script.onerror = () => {
                reject();
            };
        });
    }
}
//# sourceMappingURL=web.js.map