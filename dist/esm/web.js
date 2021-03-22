var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WebPlugin } from '@capacitor/core';
import { validateTrack, validateTracks } from "./utils";
export class PlaylistWeb extends WebPlugin {
    constructor() {
        super({
            name: 'PlaylistPlugin',
            platforms: ['web'],
        });
        this.playlistItems = [];
        this.loop = false;
        this.options = {};
        this.currentTrack = null;
        this.lastState = "stopped";
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
        }
        return Promise.resolve();
    }
    clearAllItems() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.release();
            this.playlistItems = [];
            return Promise.resolve();
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve();
        });
    }
    pause() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            (_a = this.audio) === null || _a === void 0 ? void 0 : _a.pause();
        });
    }
    play() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return (_a = this.audio) === null || _a === void 0 ? void 0 : _a.play();
        });
    }
    playTrackById(options) {
        console.log("da");
        this.playlistItems.forEach((item) => __awaiter(this, void 0, void 0, function* () {
            if (item.trackId === options.id) {
                yield this.setCurrent(item);
                return this.play();
            }
        }));
        return Promise.reject();
    }
    playTrackByIndex(options) {
        this.playlistItems.forEach((item, index) => __awaiter(this, void 0, void 0, function* () {
            if (index === options.index) {
                yield this.setCurrent(item);
                return this.play();
            }
        }));
        return Promise.reject();
    }
    release() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pause();
            this.audio = undefined;
            return Promise.resolve();
        });
    }
    removeItem(options) {
        this.playlistItems.forEach((item, index) => {
            if (options.item.trackIndex && options.item.trackIndex === index) {
                this.playlistItems.splice(index, 1);
            }
            else if (options.item.trackId && options.item.trackId === item.trackId) {
                this.playlistItems.splice(index, 1);
            }
        });
        return Promise.resolve();
    }
    removeItems(options) {
        options.items.forEach((item) => {
            this.removeItem({ item });
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
    setPlaylistItems(options) {
        var _a;
        this.playlistItems = options.items;
        if (this.playlistItems.length > 0) {
            return this.setCurrent(this.playlistItems[0], ((_a = options.options) === null || _a === void 0 ? void 0 : _a.playFromPosition) || 0);
        }
        return Promise.resolve();
    }
    skipForward() {
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
            return this.setCurrent(this.playlistItems[found + 1]);
        }
        return Promise.reject();
    }
    skipBack() {
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
            this.setCurrent(this.playlistItems[found - 1]);
            return Promise.resolve();
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
        const canPlayListener = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.notifyListeners('status', {
                action: "status",
                status: {
                    msgType: RmxAudioStatusMessage.RMXSTATUS_CANPLAY,
                    trackId: this.getCurrentTrackId(),
                    value: this.getCurrentTrackStatus('loading'),
                }
            });
            if (position) {
                yield this.seekTo({ position });
            }
            (_a = this.audio) === null || _a === void 0 ? void 0 : _a.removeEventListener('canplay', canPlayListener);
        });
        if (this.audio) {
            this.audio.addEventListener('canplay', canPlayListener);
            this.audio.addEventListener('playing', () => {
                this.notifyListeners('status', {
                    action: "status",
                    status: {
                        msgType: RmxAudioStatusMessage.RMXSTATUS_PLAYING,
                        trackId: this.getCurrentTrackId(),
                        value: this.getCurrentTrackStatus('playing'),
                    }
                });
            });
            this.audio.addEventListener('pause', () => {
                this.notifyListeners('status', {
                    action: "status",
                    status: {
                        msgType: RmxAudioStatusMessage.RMXSTATUS_PAUSE,
                        trackId: this.getCurrentTrackId(),
                        value: this.getCurrentTrackStatus('paused'),
                    }
                });
            });
            this.audio.addEventListener('error', () => {
                this.notifyListeners('status', {
                    action: "status",
                    status: {
                        msgType: RmxAudioStatusMessage.RMXSTATUS_ERROR,
                        trackId: this.getCurrentTrackId(),
                        value: this.getCurrentTrackStatus('error'),
                    }
                });
            });
            this.audio.addEventListener('ended', () => {
                this.notifyListeners('status', {
                    action: "status",
                    status: {
                        msgType: RmxAudioStatusMessage.RMXSTATUS_STOPPED,
                        trackId: this.getCurrentTrackId(),
                        value: this.getCurrentTrackStatus('stopped'),
                    }
                });
            });
            this.audio.addEventListener('timeupdate', () => {
                this.notifyListeners('status', {
                    action: "status",
                    status: {
                        msgType: RmxAudioStatusMessage.RMXSTATUS_PLAYBACK_POSITION,
                        trackId: this.getCurrentTrackId(),
                        value: this.getCurrentTrackStatus(this.lastState),
                    }
                });
            });
        }
    }
    getCurrentTrackId() {
        if (this.currentTrack) {
            return this.currentTrack.trackId;
        }
        return "INVALID";
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
        var _a, _b;
        this.lastState = currentState;
        return {
            trackId: this.getCurrentTrackId(),
            isStream: !!((_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.isStream),
            currentIndex: this.getCurrentIndex(),
            status: currentState,
            currentPosition: (_b = this.audio) === null || _b === void 0 ? void 0 : _b.currentTime,
        };
    }
    // more internal methods
    setCurrent(item, position) {
        return __awaiter(this, void 0, void 0, function* () {
            let wasPlaying = false;
            if (this.audio) {
                wasPlaying = !this.audio.paused;
                this.audio.pause();
                this.audio.src = "";
                this.audio.removeAttribute('src');
                this.audio.load();
            }
            this.audio = document.createElement('video');
            this.currentTrack = item;
            if (item.assetUrl.includes('.m3u8')) {
                yield this.loadHlsJs();
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
            yield this.registerHtmlListeners(position);
            if (wasPlaying) {
                this.audio.addEventListener('canplay', () => {
                    this.play();
                });
            }
            this.notifyListeners("status", {
                action: "status",
                status: {
                    msgType: RmxAudioStatusMessage.RMXSTATUS_TRACK_CHANGED,
                    trackId: this.getCurrentTrackId(),
                    value: {
                        currentItem: item
                    }
                }
            });
        });
    }
    log(message, ...optionalParams) {
        if (this.options.verbose) {
            console.log(message, ...optionalParams);
        }
    }
    loadHlsJs() {
        if (this.hlsLoaded) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@0.9.1';
            document.getElementsByTagName('head')[0].appendChild(script);
            script.onload = () => {
                this.hlsLoaded = true;
                resolve();
            };
            script.onerror = () => {
                reject();
            };
        });
    }
}
const Playlist = new PlaylistWeb();
export { Playlist };
import { registerWebPlugin } from '@capacitor/core';
import { RmxAudioStatusMessage } from "./Constants";
registerWebPlugin(Playlist);
//# sourceMappingURL=web.js.map