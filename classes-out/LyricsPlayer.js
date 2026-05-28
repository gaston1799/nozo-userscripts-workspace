class LyricsPlayer {
                    #songs;
                    #urlFn;
                    #timers = [];
                    #mainLyrics = [];
                    #extraLyrics = [];    // [ lyrics1, lyrics2, â€¦ ]
                    audio = null;

                    constructor(songs, urlFn) {
                        this.#songs = songs;
                        this.#urlFn = urlFn;
                    }

                    attachAudioElement(audioEl) {
                        this.audio = audioEl;

                        this.audio.addEventListener('loadedmetadata', () => {
                            console.log('Audio loaded, duration:', this.audio.duration);
                        });

                        this.audio.addEventListener('play', () => {
                            this._scheduleLyrics();
                        });

                        this.audio.addEventListener('pause', () => {
                            this.clearTimers();
                        });

                        this.audio.addEventListener('seeked', () => {
                            if (!this.audio.paused) {
                                this._scheduleLyrics();
                            }
                        });
                    }

                    playSong(name) {
                        if (!this.audio) throw new Error('Attach an <audio> first!');
                        this.clearTimers();

                        // load & play
                        this.audio.src = this.#urlFn(encodeURIComponent(name));
                        this.audio.load();
                        this.audio.play();

                        // set up the main lyrics
                        this.#mainLyrics = this.#songs[name].lyrics || [];

                        // collect any lyricsN properties: lyrics1, lyrics2, â€¦
                        this.#extraLyrics = [];
                        for (let i = 1; ; i++) {
                            const arr = this.#songs[name][`lyrics${i}`];
                            if (!Array.isArray(arr)) break;
                            this.#extraLyrics.push(arr);
                        }
                    }

                    _scheduleLyrics() {
                        this.clearTimers();
                        const now = this.audio.currentTime;

                        // schedule the â€œmainâ€ lyrics
                        this.#mainLyrics.forEach(({ time, text }) => {
                            if (time > now) {
                                this.#timers.push(
                                    setTimeout(() => chat(text), (time - now) * 1000)
                                );
                            }
                        });

                        // schedule channels 1..N
                        this.#extraLyrics.forEach((arr, idx) => {
                            const channel = idx + 1;
                            const target = _origGM_getValue(`chat${channel}`);
                            if (!target) return;

                            arr.forEach(({ time, text }) => {
                                if (time > now) {
                                    this.#timers.push(
                                        setTimeout(() => {
                                            _origGM_setValue(`chat:${target}`, text);
                                            sendUpdate(`chat:${target}`, text, 1)
                                            // console.log(`Sending lyrics to chat ${target}:`, text);
                                        }, (time - now) * 1000)
                                    );
                                }
                            });
                        });
                    }

                    clearTimers() {
                        this.#timers.forEach(clearTimeout);
                        this.#timers = [];
                    }

                    get songList() {
                        return Object.keys(this.#songs).map(name => ({
                            name,
                            url: this.#urlFn(encodeURIComponent(name)),
                            play: () => this.playSong(name),
                            stop: () => this.audio && this.audio.pause()
                        }));
                    }
                }
