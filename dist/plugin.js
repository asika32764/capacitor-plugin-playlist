var capacitorPlugin = (function (exports, core) {
    'use strict';

    /**
     * Validates the list of AudioTrack items to ensure they are valid.
     * Used internally but you can call this if you need to :)
     *
     * @param items The AudioTrack items to validate
     */
    const validateTracks = (items) => {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        return items.map(validateTrack).filter(x => !!x); // may produce an empty array!
    };
    /**
     * Validate a single track and ensure it is valid for playback.
     * Used internally but you can call this if you need to :)
     *
     * @param track The AudioTrack to validate
     */
    const validateTrack = (track) => {
        if (!track) {
            return null;
        }
        // For now we will rely on TS to do the heavy lifting, but we can add a validation here
        // that all the required fields are valid. For now we just take care of the unique ID.
        track.trackId = track.trackId || generateUUID();
        return track;
    };
    /**
     * Generate a v4 UUID for use as a unique trackId. Used internally, but you can use this to generate track ID's if you want.
     */
    const generateUUID = () => {
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now(); //use high-precision timer if available
        }
        // There are better ways to do this in ES6, we are intentionally avoiding the import
        // of an ES6 polyfill here.
        const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        return [].slice.call(template).map(function (c) {
            if (c === '-' || c === '4') {
                return c;
            }
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }).join('');
    };

    /**
     * Enum describing the possible errors that may come from the plugins
     */
    (function (RmxAudioErrorType) {
        RmxAudioErrorType[RmxAudioErrorType["RMXERR_NONE_ACTIVE"] = 0] = "RMXERR_NONE_ACTIVE";
        RmxAudioErrorType[RmxAudioErrorType["RMXERR_ABORTED"] = 1] = "RMXERR_ABORTED";
        RmxAudioErrorType[RmxAudioErrorType["RMXERR_NETWORK"] = 2] = "RMXERR_NETWORK";
        RmxAudioErrorType[RmxAudioErrorType["RMXERR_DECODE"] = 3] = "RMXERR_DECODE";
        RmxAudioErrorType[RmxAudioErrorType["RMXERR_NONE_SUPPORTED"] = 4] = "RMXERR_NONE_SUPPORTED";
    })(exports.RmxAudioErrorType || (exports.RmxAudioErrorType = {}));
    /**
     * String descriptions corresponding to the RmxAudioErrorType values
     */
    const RmxAudioErrorTypeDescriptions = [
        'No Active Sources',
        'Aborted',
        'Network',
        'Failed to Decode',
        'No Supported Sources',
    ];
    (function (RmxAudioStatusMessage) {
        /**
         * The starting state of the plugin. You will never see this value;
         * it changes before the callbacks are even registered to report changes to this value.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_NONE"] = 0] = "RMXSTATUS_NONE";
        /**
         * Raised when the plugin registers the callback handler for onStatus callbacks.
         * You will probably not be able to see this (nor do you need to).
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_REGISTER"] = 1] = "RMXSTATUS_REGISTER";
        /**
         * Reserved for future use
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_INIT"] = 2] = "RMXSTATUS_INIT";
        /**
         * Indicates an error is reported in the 'value' field.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_ERROR"] = 5] = "RMXSTATUS_ERROR";
        /**
         * The reported track is being loaded by the player
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_LOADING"] = 10] = "RMXSTATUS_LOADING";
        /**
         * The reported track is able to begin playback
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_CANPLAY"] = 11] = "RMXSTATUS_CANPLAY";
        /**
         * The reported track has loaded 100% of the file (either from disc or network)
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_LOADED"] = 15] = "RMXSTATUS_LOADED";
        /**
         * (iOS only): Playback has stalled due to insufficient network
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_STALLED"] = 20] = "RMXSTATUS_STALLED";
        /**
         * Reports an update in the reported track's buffering status
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_BUFFERING"] = 25] = "RMXSTATUS_BUFFERING";
        /**
         * The reported track has started (or resumed) playing
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_PLAYING"] = 30] = "RMXSTATUS_PLAYING";
        /**
         * The reported track has been paused, either by the user or by the system.
         * (iOS only): This value is raised when MP3's are malformed (but still playable).
         * These require the user to explicitly press play again. This can be worked
         * around and is on the TODO list.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_PAUSE"] = 35] = "RMXSTATUS_PAUSE";
        /**
         * Reports a change in the reported track's playback position.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_PLAYBACK_POSITION"] = 40] = "RMXSTATUS_PLAYBACK_POSITION";
        /**
         * The reported track has seeked.
         * On Android, only the plugin consumer can generate this (Notification controls on Android do not include a seek bar).
         * On iOS, the Command Center includes a seek bar so this will be reported when the user has seeked via Command Center.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_SEEK"] = 45] = "RMXSTATUS_SEEK";
        /**
         * The reported track has completed playback.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_COMPLETED"] = 50] = "RMXSTATUS_COMPLETED";
        /**
         * The reported track's duration has changed. This is raised once, when duration is updated for the first time.
         * For streams, this value is never reported.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_DURATION"] = 55] = "RMXSTATUS_DURATION";
        /**
         * All playback has stopped, probably because the plugin is shutting down.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_STOPPED"] = 60] = "RMXSTATUS_STOPPED";
        /**
         * The playlist has skipped forward to the next track.
         * On both Android and iOS, this will be raised if the notification controls/Command Center were used to skip.
         * It is unlikely you need to consume this event: RMXSTATUS_TRACK_CHANGED is also reported when this occurs,
         * so you can generalize your track change handling in one place.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMX_STATUS_SKIP_FORWARD"] = 90] = "RMX_STATUS_SKIP_FORWARD";
        /**
         * The playlist has skipped back to the previous track.
         * On both Android and iOS, this will be raised if the notification controls/Command Center were used to skip.
         * It is unlikely you need to consume this event: RMXSTATUS_TRACK_CHANGED is also reported when this occurs,
         * so you can generalize your track change handling in one place.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMX_STATUS_SKIP_BACK"] = 95] = "RMX_STATUS_SKIP_BACK";
        /**
         * Reported when the current track has changed in the native player. This event contains full data about
         * the new track, including the index and the actual track itself. The type of the 'value' field in this case
         * is OnStatusTrackChangedData.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_TRACK_CHANGED"] = 100] = "RMXSTATUS_TRACK_CHANGED";
        /**
         * The entire playlist has completed playback.
         * After this event has been raised, the current item is set to null and the current index to -1.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_PLAYLIST_COMPLETED"] = 105] = "RMXSTATUS_PLAYLIST_COMPLETED";
        /**
         * An item has been added to the playlist. For the setPlaylistItems and addAllItems methods, this status is
         * raised once for every track in the collection.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_ITEM_ADDED"] = 110] = "RMXSTATUS_ITEM_ADDED";
        /**
         * An item has been removed from the playlist. For the removeItems and clearAllItems methods, this status is
         * raised once for every track that was removed.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_ITEM_REMOVED"] = 115] = "RMXSTATUS_ITEM_REMOVED";
        /**
         * All items have been removed from the playlist
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_PLAYLIST_CLEARED"] = 120] = "RMXSTATUS_PLAYLIST_CLEARED";
        /**
         * Just for testing.. you don't need this and in fact can never receive it, the plugin is destroyed before it can be raised.
         */
        RmxAudioStatusMessage[RmxAudioStatusMessage["RMXSTATUS_VIEWDISAPPEAR"] = 200] = "RMXSTATUS_VIEWDISAPPEAR";
    })(exports.RmxAudioStatusMessage || (exports.RmxAudioStatusMessage = {}));
    /**
     * String descriptions corresponding to the RmxAudioStatusMessage values
     */
    const RmxAudioStatusMessageDescriptions = {
        0: 'No Status',
        1: 'Plugin Registered',
        2: 'Plugin Initialized',
        5: 'Error',
        10: 'Loading',
        11: 'CanPlay',
        15: 'Loaded',
        20: 'Stalled',
        25: 'Buffering',
        30: 'Playing',
        35: 'Paused',
        40: 'Playback Position Changed',
        45: 'Seeked',
        50: 'Playback Completed',
        55: 'Duration Changed',
        60: 'Stopped',
        90: 'Skip Forward',
        95: 'Skip Backward',
        100: 'Track Changed',
        105: 'Playlist Completed',
        110: 'Track Added',
        115: 'Track Removed',
        120: 'Playlist Cleared',
        200: 'DEBUG_View_Disappeared',
    };

    var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    class PlaylistWeb extends core.WebPlugin {
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
                        msgType: exports.RmxAudioStatusMessage.RMXSTATUS_CANPLAY,
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
                            msgType: exports.RmxAudioStatusMessage.RMXSTATUS_PLAYING,
                            trackId: this.getCurrentTrackId(),
                            value: this.getCurrentTrackStatus('playing'),
                        }
                    });
                });
                this.audio.addEventListener('pause', () => {
                    this.notifyListeners('status', {
                        action: "status",
                        status: {
                            msgType: exports.RmxAudioStatusMessage.RMXSTATUS_PAUSE,
                            trackId: this.getCurrentTrackId(),
                            value: this.getCurrentTrackStatus('paused'),
                        }
                    });
                });
                this.audio.addEventListener('error', () => {
                    this.notifyListeners('status', {
                        action: "status",
                        status: {
                            msgType: exports.RmxAudioStatusMessage.RMXSTATUS_ERROR,
                            trackId: this.getCurrentTrackId(),
                            value: this.getCurrentTrackStatus('error'),
                        }
                    });
                });
                this.audio.addEventListener('ended', () => {
                    this.notifyListeners('status', {
                        action: "status",
                        status: {
                            msgType: exports.RmxAudioStatusMessage.RMXSTATUS_STOPPED,
                            trackId: this.getCurrentTrackId(),
                            value: this.getCurrentTrackStatus('stopped'),
                        }
                    });
                });
                this.audio.addEventListener('timeupdate', () => {
                    this.notifyListeners('status', {
                        action: "status",
                        status: {
                            msgType: exports.RmxAudioStatusMessage.RMXSTATUS_PLAYBACK_POSITION,
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
                        msgType: exports.RmxAudioStatusMessage.RMXSTATUS_TRACK_CHANGED,
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
    core.registerWebPlugin(Playlist);

    const Playlist$1 = core.Plugins.PlaylistPlugin;
    const log = console;
    const itemStatusChangeTypes = [
        exports.RmxAudioStatusMessage.RMXSTATUS_PLAYBACK_POSITION,
        exports.RmxAudioStatusMessage.RMXSTATUS_DURATION,
        exports.RmxAudioStatusMessage.RMXSTATUS_BUFFERING,
        exports.RmxAudioStatusMessage.RMXSTATUS_CANPLAY,
        exports.RmxAudioStatusMessage.RMXSTATUS_LOADING,
        exports.RmxAudioStatusMessage.RMXSTATUS_LOADED,
        exports.RmxAudioStatusMessage.RMXSTATUS_PAUSE,
        exports.RmxAudioStatusMessage.RMXSTATUS_COMPLETED,
        exports.RmxAudioStatusMessage.RMXSTATUS_ERROR,
    ];
    /**
     * AudioPlayer class implementation. A singleton of this class is exported for use by Cordova,
     * but nothing stops you from creating another instance. Keep in mind that the native players
     * are in fact singletons, so the only thing the separate instance gives you would be
     * separate onStatus callback streams.
     */
    class RmxAudioPlayer {
        /**
         * Creates a new RmxAudioPlayer instance.
         */
        constructor() {
            this.handlers = {};
            this.options = { verbose: false, resetStreamOnPause: true };
            this._inititialized = false;
            this._currentState = 'unknown';
            this._hasError = false;
            this._hasLoaded = false;
            this._currentItem = null;
            /**
             * Player interface
             */
            /**
             * Returns a promise that resolves when the plugin is ready.
             */
            this.ready = () => {
                return this._initPromise;
            };
            this.initialize = () => {
                Playlist$1.addListener('status', (data) => {
                    if (data.action === 'status') {
                        this.onStatus(data.status.trackId, data.status.msgType, data.status.value);
                    }
                    else {
                        console.warn('Unknown audio player onStatus message:', data);
                    }
                });
                Playlist$1.initialize()
                    .then(() => {
                    this._inititialized = true;
                    this._readyResolve(true);
                })
                    .catch((args) => {
                    const message = 'CORDOVA RMXAUDIOPLAYER: Error storing message channel:';
                    console.warn(message, args);
                    this._readyReject(true);
                });
                return this._initPromise;
            };
            /**
             * Sets the player options. This can be called at any time and is not required before playback can be initiated.
             */
            this.setOptions = (options) => {
                this.options = Object.assign(Object.assign({}, this.options), options);
                return Playlist$1.setOptions(this.options);
            };
            /**
             * Playlist item management
             */
            /**
             * Sets the entire list of tracks to be played by the playlist.
             * This will clear all previous items from the playlist.
             * If you pass options.retainPosition = true, the current playback position will be
             * recorded and used when playback restarts. This can be used, for example, to set the
             * playlist to a new set of tracks, but retain the currently-playing item to avoid skipping.
             */
            this.setPlaylistItems = (items, options) => {
                return Playlist$1.setPlaylistItems({ items: validateTracks(items), options: options || {} });
            };
            /**
             * Add a single track to the end of the playlist
             */
            this.addItem = (trackItem) => {
                const validTrackItem = validateTrack(trackItem);
                if (!validTrackItem) {
                    throw new Error('Provided track is null or not an audio track');
                }
                return Playlist$1.addItem({ item: validTrackItem });
            };
            /**
             * Adds the list of tracks to the end of the playlist.
             */
            this.addAllItems = (items) => {
                return Playlist$1.addAllItems({ items: validateTracks(items) });
            };
            /**
             * Removes a track from the playlist. If this is the currently playing item, the next item will automatically begin playback.
             */
            this.removeItem = (removeItem) => {
                if (!removeItem) {
                    throw new Error('Track removal spec is empty');
                }
                if (!removeItem.trackId && !removeItem.trackIndex) ;
                return Playlist$1.removeItem({ item: removeItem });
            };
            /**
             * Removes all given tracks from the playlist; these can be specified either by trackId or trackIndex. If the removed items
             * include the currently playing item, the next available item will automatically begin playing.
             */
            this.removeItems = (items) => {
                return Playlist$1.removeItems({ items });
            };
            /**
             * Clear the entire playlist. This will result in the STOPPED event being raised.
             */
            this.clearAllItems = () => {
                return Playlist$1.clearAllItems();
            };
            /**
             * Playback management
             */
            /**
             * Begin playback. If no tracks have been added, this has no effect.
             */
            this.play = () => {
                return Playlist$1.play();
            };
            /**
             * Play the track at the given index. If the track does not exist, this has no effect.
             */
            this.playTrackByIndex = (index, position) => {
                return Playlist$1.playTrackByIndex({ index, position: position || 0 });
            };
            /**
             * Play the track matching the given trackId. If the track does not exist, this has no effect.
             */
            this.playTrackById = (id, position) => {
                return Playlist$1.playTrackById({ id, position: position || 0 });
            };
            /**
             * Play the track matching the given trackId. If the track does not exist, this has no effect.
             */
            this.selectTrackByIndex = (index, position) => {
                return Playlist$1.selectTrackByIndex({ index, position: position || 0 });
            };
            /**
             * Play the track matching the given trackId. If the track does not exist, this has no effect.
             */
            this.selectTrackById = (id, position) => {
                return Playlist$1.selectTrackById({ id, position: position || 0 });
            };
            /**
             * Pause playback
             */
            this.pause = () => {
                return Playlist$1.pause();
            };
            /**
             * Skip to the next track. If you are already at the end, and loop is false, this has no effect.
             * If you are at the end, and loop is true, playback will begin at the beginning of the playlist.
             */
            this.skipForward = () => {
                return Playlist$1.skipForward();
            };
            /**
             * Skip to the previous track. If you are already at the beginning, this has no effect.
             */
            this.skipBack = () => {
                return Playlist$1.skipBack();
            };
            /**
             * Seek to the given position in the currently playing track. If the value exceeds the track length,
             * the track will complete and playback of the next track will begin.
             */
            this.seekTo = (position) => {
                return Playlist$1.seekTo({ position });
            };
            /**
             * Set the playback speed; a float value between [-1, 1] inclusive. If set to 0, this pauses playback.
             */
            this.setPlaybackRate = (rate) => {
                return Playlist$1.setPlaybackRate({ rate });
            };
            /**
             * Set the playback volume. Float value between [0, 1] inclusive.
             * On both Android and iOS, this sets the volume of the media stream, which can be externally
             * controlled by setting the overall hardware volume.
             */
            this.setVolume = (volume) => {
                return Playlist$1.setPlaybackVolume({ volume });
            };
            /**
             * Sets a flag indicating whether the playlist should loop back to the beginning once it reaches the end.
             */
            this.setLoop = (loop) => {
                return Playlist$1.setLoop({ loop: loop });
            };
            this.handlers = {};
            this._initPromise = new Promise((resolve, reject) => {
                this._readyResolve = resolve;
                this._readyReject = reject;
            });
            new Promise((resolve) => {
                window.addEventListener('beforeunload', () => resolve(), { once: true });
            }).then(() => Playlist$1.release());
        }
        /**
         * The current summarized state of the player, as a string. It is preferred that you use the 'isX' accessors,
         * because they properly interpret the range of these values, but this field is exposed if you wish to observe
         * or interrogate it.
         */
        get currentState() {
            return this._currentState;
        }
        /**
         * True if the plugin has been initialized. You'll likely never see this state; it is handled internally.
         */
        get isInitialized() {
            return this._inititialized;
        }
        get currentTrack() {
            return this._currentItem;
        }
        /**
         * If the playlist is currently playling a track.
         */
        get isPlaying() {
            return this._currentState === 'playing';
        }
        /**
         * True if the playlist is currently paused
         */
        get isPaused() {
            return this._currentState === 'paused' || this._currentState === 'stopped';
        }
        /**
         * True if the plugin is currently loading its *current* track.
         * On iOS, many tracks are loaded in parallel, so this only reports for the *current item*, e.g.
         * the item that will begin playback if you press pause.
         * If you need track-specific data, it is better to watch the onStatus stream and watch for RMXSTATUS_LOADING,
         * which will be raised independently & simultaneously for every track in the playlist.
         * On Android, tracks are only loaded as they begin playback, so this value and RMXSTATUS_LOADING should always
         * apply to the same track.
         */
        get isLoading() {
            return this._currentState === 'loading';
        }
        /**
         * True if the *currently playing track* has been loaded and can be played (this includes if it is *currently playing*).
         */
        get hasLoaded() {
            return this._hasLoaded;
        }
        /**
         * True if the *current track* has reported an error. In almost all cases,
         * the playlist will automatically skip forward to the next track, in which case you will also receive
         * an RMXSTATUS_TRACK_CHANGED event.
         */
        get hasError() {
            return this._hasError;
        }
        /**
         * Status event handling
         */
        /**
         * @internal
         * Call this function to emit an onStatus event via the on('status') handler.
         * Internal use only, to raise events received from the native interface.
         */
        onStatus(trackId, type, value) {
            var _a;
            const status = { type: type, trackId: trackId, value: value };
            if (this.options.verbose) {
                log.log(`RmxAudioPlayer.onStatus: ${RmxAudioStatusMessageDescriptions[type]}(${type}) [${trackId}]: `, value);
            }
            if (status.type === exports.RmxAudioStatusMessage.RMXSTATUS_TRACK_CHANGED) {
                this._hasError = false;
                this._hasLoaded = false;
                this._currentState = 'loading';
                this._currentItem = (_a = status.value) === null || _a === void 0 ? void 0 : _a.currentItem;
            }
            // The plugin's status changes only in response to specific events.
            if (itemStatusChangeTypes.indexOf(status.type) >= 0) {
                // Only change the plugin's *current status* if the event being raised is for the current active track.
                if (this._currentItem && this._currentItem.trackId === trackId) {
                    if (status.value && status.value.status) {
                        this._currentState = status.value.status;
                    }
                    if (status.type === exports.RmxAudioStatusMessage.RMXSTATUS_CANPLAY) {
                        this._hasLoaded = true;
                    }
                    if (status.type === exports.RmxAudioStatusMessage.RMXSTATUS_ERROR) {
                        this._hasError = true;
                    }
                }
            }
            this.emit('status', status);
        }
        on(eventName, callback) {
            if (!Object.prototype.hasOwnProperty.call(this.handlers, eventName)) {
                this.handlers[eventName] = [];
            }
            this.handlers[eventName].push(callback);
        }
        /**
         * Remove an event handler from the plugin
         * @param eventName The name of the event whose subscription is to be removed
         * @param handle The event handler to destroy. Ensure that this is the SAME INSTANCE as the handler
         * that was passed in to create the subscription!
         */
        off(eventName, handle) {
            if (Object.prototype.hasOwnProperty.call(this.handlers, eventName)) {
                const handleIndex = this.handlers[eventName].indexOf(handle);
                if (handleIndex >= 0) {
                    this.handlers[eventName].splice(handleIndex, 1);
                }
            }
        }
        /**
         * @internal
         * Raises an event via the corresponding event handler. Internal use only.
         * @param args Event args to pass through to the handler.
         */
        emit(...args) {
            const eventName = args.shift();
            if (!Object.prototype.hasOwnProperty.call(this.handlers, eventName)) {
                return false;
            }
            const handler = this.handlers[eventName];
            for (let i = 0; i < handler.length; i++) {
                const callback = this.handlers[eventName][i];
                if (typeof callback === 'function') {
                    callback(...args);
                }
            }
            return true;
        }
    }

    exports.Playlist = Playlist;
    exports.PlaylistWeb = PlaylistWeb;
    exports.RmxAudioErrorTypeDescriptions = RmxAudioErrorTypeDescriptions;
    exports.RmxAudioPlayer = RmxAudioPlayer;
    exports.RmxAudioStatusMessageDescriptions = RmxAudioStatusMessageDescriptions;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}, capacitorExports));
//# sourceMappingURL=plugin.js.map
