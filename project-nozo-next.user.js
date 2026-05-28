// ==UserScript==
// @name        .PROJECT NOZO w NEXT
// @author       Gaston_
// @description  Rebuilt modular version of .PROJECT NOZO w
// @version      next
// @match        *://*.moomoo.io/*
// @match        *://dev.moomoo.io/*
// @match         https://gaston1799.github.io/HostedFiles/bot/
// @icon         https://moomoo.io/img/animals/cow_1.png
// @grant   GM_getValue
// @grant   GM_setValue
// @grant   GM_deleteValue
// @grant GM_xmlhttpRequest
// @run-at document-idle
// @grant unsafeWindow
// @grant   GM_addValueChangeListener
// @grant   GM_removeValueChangeListener
// @namespace https://greasyfork.org/users/1404332
// @downloadURL https://update.greasyfork.org/scripts/519513/%21%20za%27s%20mod%20-%20unpatched.user.js
// @updateURL https://update.greasyfork.org/scripts/519513/%21%20za%27s%20mod%20-%20unpatched.meta.js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/object-model.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/object-manager.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/tick-scheduler.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/autoplace.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/replacer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/preplacer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/autobuy.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/instakill.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/kb-simulator.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/healer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c409591/dist/html.min.js
// ==/UserScript==

(function () {
    "use strict";

    const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    const Nozo = root.NozoNext = root.NozoNext || {};
    Object.defineProperty(Nozo, "config", {
        configurable: true,
        enumerable: true,
        get: function getConfig() {
            return (root.config && typeof root.config === "object") ? root.config : {};
        }
    });

    Nozo.version = "next";
    Nozo.root = root;
    Nozo.modules = Nozo.modules || {};
    Nozo.state = Nozo.state || {};
    Nozo.debug = Nozo.debug || {
        enabled: true,
        logs: []
    };

    Nozo.log = function log(type, payload) {
        if (!Nozo.debug.enabled) return;
        const entry = { type, payload, time: Date.now() };
        Nozo.debug.logs.push(entry);
        if (Nozo.debug.logs.length > 250) Nozo.debug.logs.shift();
        console.log("[NozoNext]", type, payload);
    };

    Nozo.register = function register(name, moduleFactory) {
        if (!name || typeof moduleFactory !== "function") return null;
        const mod = moduleFactory(Nozo);
        Nozo.modules[name] = mod;
        Nozo.log("module:registered", name);
        return mod;
    };

    Nozo.getState = function getState(key, fallback) {
        const val = Nozo.state[key];
        return val !== undefined ? val : fallback;
    };

    Nozo.setState = function setState(key, value) {
        Nozo.state[key] = value;
    };

    Nozo.events = Nozo.events || {
        wired: false,
        off: [],
        on: function on(target, type, handler, opts) {
            if (!target || !target.addEventListener) return false;
            const useOpts = opts || false;
            target.addEventListener(type, handler, useOpts);
            this.off.push(function () { target.removeEventListener(type, handler, useOpts); });
            return true;
        },
        clear: function clear() {
            while (this.off.length) {
                const fn = this.off.pop();
                fn();
            }
            this.wired = false;
        }
    };

    Nozo.bridge = Nozo.bridge || {};
    Nozo.bridge._tickTimer = null;
    Nozo.bridge._netHandlersBound = false;
    Nozo.bridge._rafOverridden = false;
    Nozo.bridge._nativeRaf = null;
    Nozo.bridge._nativeCancelRaf = null;
    Nozo.bridge._nativeRequestAnimFrame = null;
    Nozo.bridge._nativeRAFShim = null;
    Nozo.bridge._wsRef = null;
    Nozo.bridge._wsOnMessage = null;
    // "hard-block" drops all RAF callbacks.
    // "passthrough" forwards them to the native RAF (emergency fallback for live testing).
    // Default to passthrough so native game render (players/objects) stays active.
    Nozo.bridge._rafMode = "passthrough";

    Nozo.bridge.setRafMode = function setRafMode(mode) {
        if (mode !== "hard-block" && mode !== "passthrough") return;
        Nozo.bridge._rafMode = mode;
        if (Nozo.bridge._rafOverridden) {
            root.blockRedraw = (mode === "hard-block");
        }
        Nozo.log("bridge:raf-mode", { mode: mode, active: Nozo.bridge._rafOverridden });
    };

    Nozo.bridge.overrideRaf = function overrideRaf() {
        if (Nozo.bridge._rafOverridden) return;
        Nozo.bridge._nativeRaf = root.requestAnimationFrame;
        Nozo.bridge._nativeCancelRaf = root.cancelAnimationFrame;
        Nozo.bridge._nativeRequestAnimFrame = root.requestAnimFrame;
        Nozo.bridge._nativeRAFShim = root.rAF;
        const bridge = Nozo.bridge;
        // Gate: hard-block drops callbacks; passthrough forwards to native RAF.
        root.requestAnimationFrame = function nozoRafGate(cb) {
            if (bridge._rafMode === "passthrough") {
                return bridge._nativeRaf.call(root, cb);
            }
            return 0;
        };
        // Legacy aliases used by moomoo.js internals/mod scripts.
        root.requestAnimFrame = function nozoLegacyRaf(cb) {
            if (bridge._rafMode === "passthrough") {
                if (typeof bridge._nativeRequestAnimFrame === "function") {
                    return bridge._nativeRequestAnimFrame.call(root, cb);
                }
                return bridge._nativeRaf.call(root, cb);
            }
            return null;
        };
        root.rAF = function nozoRafShim(cb) {
            if (bridge._rafMode === "passthrough") {
                if (typeof bridge._nativeRAFShim === "function") {
                    return bridge._nativeRAFShim.call(root, cb);
                }
                if (typeof root.requestAnimationFrame === "function") {
                    return root.requestAnimationFrame(cb);
                }
                return root.setTimeout(cb, 1000 / 60);
            }
            return null;
        };
        root.cancelAnimationFrame = function nozoCancelRafGate(id) {
            if (bridge._rafMode === "passthrough") {
                return bridge._nativeCancelRaf.call(root, id);
            }
        };
        // Mirror moomoo.js redraw gate behavior.
        root.blockRedraw = (bridge._rafMode === "hard-block");
        Nozo.bridge._rafOverridden = true;
        Nozo.log("bridge:raf-blocked", { active: true, mode: Nozo.bridge._rafMode });
    };

    Nozo.bridge.normalizeObjectLists = function normalizeObjectLists() {
        if (!Array.isArray(Nozo.state.gameObjects)) Nozo.state.gameObjects = [];
        // Sync liztobj from closeObjects every tick so reference changes are picked up.
        // Canonical ownership stays with liztobj; closeObjects is the legacy source.
        if (Array.isArray(Nozo.state.closeObjects)) {
            Nozo.state.liztobj = Nozo.state.closeObjects;
        } else if (!Array.isArray(Nozo.state.liztobj)) {
            Nozo.state.liztobj = [];
        }
    };

    Nozo.bridge.rebuildNearEnemy = function rebuildNearEnemy() {
        const player = Nozo.state.player;
        const list = Array.isArray(Nozo.state.players) ? Nozo.state.players : [];
        if (!player || !list.length) {
            Nozo.state.near = [];
            Nozo.state.enemy = [];
            return;
        }
        const pTeam = player.team;
        const near = [];
        const enemy = [];
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (!p || p === player) continue;
            if (player.sid != null && p.sid === player.sid) continue;
            near.push(p);
            if (pTeam == null || p.team == null || p.team !== pTeam) enemy.push(p);
        }
        Nozo.state.near = near;
        Nozo.state.enemy = enemy;
    };

    // Default net-event handlers are registered by net-events.js at load time.
    // This function exists for backward compat and simply marks the bridge as ready.
    Nozo.bridge.bindNetEventHandlers = function bindNetEventHandlers() {
        if (Nozo.bridge._netHandlersBound) return;
        Nozo.bridge._netHandlersBound = true;
        Nozo.log("bridge:net-handlers", { bound: true, source: "net-events-module" });
    };

    Nozo.bridge.tick = function tick() {
        Nozo.state.tick = (Nozo.state.tick || 0) + 1;
        // Tick scheduler runs first so deferred callbacks fire before other modules read state.
        if (Nozo.tickScheduler && typeof Nozo.tickScheduler.runTick === "function") {
            Nozo.tickScheduler.runTick(Nozo.state.tick);
        }
        Nozo.bridge.normalizeObjectLists();
        Nozo.bridge.rebuildNearEnemy();
        if (Nozo.combat && typeof Nozo.combat.updateWeaponRange === "function") {
            Nozo.combat.updateWeaponRange({ player: Nozo.state.player });
        }

        // Re-attach render overlay if canvas was replaced or first attach failed.
        if (Nozo.render && !Nozo.render.state.attached && (Nozo.state.tick % 20 === 0)) {
            const gameCanvas = root.document && root.document.getElementById("gameCanvas");
            Nozo.render.attach(gameCanvas || null);
        }

        const ctx = {
            player: Nozo.state.player || null,
            enemy: Nozo.state.enemy || null,
            gameObjects: Nozo.state.gameObjects || [],
            liztobj: Nozo.state.liztobj || [],
            traps: Nozo.state.traps || null,
            autoBreak: Nozo.state.autoBreak || null,
            tick: Nozo.state.tick
        };

        if (Nozo.traps && Nozo.traps.scan) Nozo.traps.scan(ctx);
        if (Nozo.autoBreak && Nozo.autoBreak.scan) Nozo.autoBreak.scan(ctx);
        if (Nozo.preplacer && Nozo.preplacer.step) Nozo.preplacer.step(ctx);
        if (Nozo.replacer && Nozo.replacer.step) Nozo.replacer.step(ctx);
        if (Nozo.autoPlace && Nozo.autoPlace.step) Nozo.autoPlace.step(ctx);
        if (Nozo.autoBuy && Nozo.autoBuy.step) Nozo.autoBuy.step(ctx);
        if (Nozo.instaKill && Nozo.instaKill.step) Nozo.instaKill.step(ctx);
        if (Nozo.healer && Nozo.healer.onTick) Nozo.healer.onTick(ctx);
        if (Nozo.movement && Nozo.movement.step) Nozo.movement.step(ctx);
        if (Nozo.render && Nozo.render.draw) Nozo.render.draw(ctx);
    };

    Nozo.bridge.startTickLoop = function startTickLoop() {
        if (Nozo.bridge._tickTimer) return;
        Nozo.bridge._tickTimer = root.setInterval(Nozo.bridge.tick, 50);
        Nozo.events.wired = true;
        Nozo.log("bridge:tick-loop", { intervalMs: 50 });
    };

    Nozo.bridge.stopTickLoop = function stopTickLoop() {
        if (!Nozo.bridge._tickTimer) return;
        root.clearInterval(Nozo.bridge._tickTimer);
        Nozo.bridge._tickTimer = null;
        Nozo.events.wired = false;
        Nozo.log("bridge:tick-loop-stopped", {});
    };

    Nozo.bootstrap = Nozo.bootstrap || {};
    Nozo.bootstrap._tokenFlowBound = false;
    Nozo.bootstrap._wsHookBound = false;

    Nozo.bootstrap.getApiBase = function getApiBase() {
        const host = (root.location && root.location.hostname) || "";
        const isSandbox = host === "sandbox-dev.moomoo.io" || host === "sandbox.moomoo.io";
        const isDev = host === "dev.moomoo.io" || host === "dev2.moomoo.io";
        if (isSandbox) return "https://api-sandbox.moomoo.io";
        if (isDev) return "https://api-dev.moomoo.io";
        return "https://api.moomoo.io";
    };

    Nozo.bootstrap.getServerParam = function getServerParam() {
        const raw = new URLSearchParams((root.location && root.location.search) || "").get("server");
        if (!raw || raw.indexOf(":") === -1) return null;
        const parts = raw.split(":");
        if (parts.length < 2) return null;
        return { raw: raw, region: parts[0], name: parts[1] };
    };

    Nozo.bootstrap.refreshServerContext = function refreshServerContext() {
        const sp = Nozo.bootstrap.getServerParam();
        if (!sp) return null;
        Nozo.state.serverParam = sp.raw;
        Nozo.state.region = sp.region;
        Nozo.state.name = sp.name;
        Nozo.state.In = sp.raw;
        return sp;
    };

    Nozo.bootstrap.setToken = function setToken(tokenValue, source) {
        if (!tokenValue) return false;
        Nozo.state.token = tokenValue;
        root.token = tokenValue;
        Nozo.log("token:set", { source: source || "unknown" });
        return true;
    };

    Nozo.bootstrap.bindTokenFlow = function bindTokenFlow() {
        if (Nozo.bootstrap._tokenFlowBound) return;
        Nozo.bootstrap._tokenFlowBound = true;

        Nozo.bootstrap.refreshServerContext();

        const altchaEl = root.document.getElementById("altcha");
        if (altchaEl && altchaEl.addEventListener) {
            altchaEl.addEventListener("statechange", function onStateChange(e) {
                const detail = e && e.detail ? e.detail : {};
                if (detail.state !== "verified") return;

                Nozo.bootstrap.refreshServerContext();
                Nozo.bootstrap.setToken(detail.payload, "altcha:verified");

                const visualizer = root.document.getElementById("wideAdCard");
                if (visualizer) {
                    visualizer.style.maxWidth = "1056.95px";
                    visualizer.style.height = "300px";
                }

                const enterGame = root.document.getElementById("enterGame");
                setTimeout(function () {
                    if (enterGame && enterGame.classList && enterGame.classList.contains("disabled")) {
                        root.location.reload();
                        return;
                    }

                    if ((root.name || "").indexOf("authWindow-") === 0 && root.opener && root.opener.postMessage) {
                        const id = (root.name || "").replace("authWindow-", "");
                        root.opener.postMessage({
                            type: "TOKEN",
                            id: id,
                            token: detail.payload
                        }, "*");
                        root.close();
                    }
                }, 500)
            });
        }

        const altchaCheckbox = root.document.getElementById("altcha_checkbox");
        if (altchaCheckbox && !altchaCheckbox.checked && altchaCheckbox.click) {
            setTimeout(function () {
                if (!altchaCheckbox.checked) altchaCheckbox.click();
            }, 1000);
        }
    };

    Nozo.bootstrap.bindWsHook = function bindWsHook() {
        if (Nozo.bootstrap._wsHookBound) return;
        Nozo.bootstrap._wsHookBound = true;

        const NativeWS = root.WebSocket;
        if (!NativeWS) return;

        function HookedWebSocket(url, protocols) {
            // Remove stale message listener from the previous WS before replacing it.
            if (Nozo.bridge._wsRef && Nozo.bridge._wsOnMessage) {
                try { Nozo.bridge._wsRef.removeEventListener("message", Nozo.bridge._wsOnMessage); } catch (e) {}
            }

            const ws = protocols !== undefined ? new NativeWS(url, protocols) : new NativeWS(url);
            Nozo.state.WS = ws;
            Nozo.bridge._wsRef = ws;
            if (Nozo.packet && Nozo.packet.setSocket) Nozo.packet.setSocket(ws);
            if (Nozo.log) Nozo.log("ws:hooked", { url: url || null });

            const onMessage = function onMessage(message) {
                if (!root.msgpack || !Nozo.netEvents || !Nozo.netEvents.dispatch) return;
                if (!message || !message.data) return;

                // Handle string messages (e.g. io-init handshake) before binary decode.
                if (typeof message.data === "string") {
                    if (message.data === "io-init") {
                        Nozo.netEvents.dispatch("io-init", [], Nozo.state);
                    } else {
                        Nozo.log("ws:msg:string-drop", { preview: message.data.slice(0, 80) });
                    }
                    return;
                }

                let parsed = null;
                if (message.data instanceof ArrayBuffer) {
                    parsed = root.msgpack.decode(new Uint8Array(message.data));
                } else if (message.data && message.data.buffer instanceof ArrayBuffer) {
                    parsed = root.msgpack.decode(new Uint8Array(message.data.buffer));
                } else {
                    Nozo.log("ws:msg:unhandled-type", { type: typeof message.data });
                    return;
                }

                if (!Array.isArray(parsed) || parsed.length < 2) {
                    Nozo.log("ws:msg:malformed", { parsed: Array.isArray(parsed) ? parsed.length : typeof parsed });
                    return;
                }
                const type = parsed[0];
                const data = parsed[1];
                Nozo.netEvents.dispatch(type, data, Nozo.state);
            };

            Nozo.bridge._wsOnMessage = onMessage;
            ws.addEventListener("message", onMessage);

            ws.addEventListener("close", function onClose() {
                // Only clear state if this WS is still the active one (not already replaced).
                if (Nozo.state.WS === ws) {
                    Nozo.state.WS = null;
                    if (Nozo.packet && Nozo.packet.setSocket) Nozo.packet.setSocket(null);
                    if (Nozo.log) Nozo.log("ws:closed", { url: url || null });
                }
            });

            return ws;
        }

        HookedWebSocket.prototype = NativeWS.prototype;
        Object.setPrototypeOf(HookedWebSocket, NativeWS);
        root.WebSocket = HookedWebSocket;
    };

    Nozo.bootstrap.getToken = async function getToken() {
        Nozo.bootstrap.bindTokenFlow();
        // Poll at 50 ms to avoid tight spin while waiting for altcha verification.
        while (!Nozo.state.token && !root.token) {
            await new Promise(function (resolve) { setTimeout(resolve, 50); });
        }
        Nozo.bootstrap.refreshServerContext();
        return {
            token: Nozo.state.token || root.token,
            In: Nozo.state.In || null
        };
    };

    Nozo.bootstrap.findServer = async function findServer(serverParam) {
        if (!serverParam) return null;
        const dn = Nozo.bootstrap.getApiBase();
        const res = await fetch(dn + "/servers?v=1.26");
        if (!res.ok) {
            Nozo.log("bootstrap:findServer:error", { status: res.status, url: dn });
            return null;
        }
        const servers = await res.json();
        if (!Array.isArray(servers)) return null;
        return servers.find(function (e) {
            return e && e.region === serverParam.region && e.name === serverParam.name;
        }) || null;
    };

    Nozo.bootstrap.run = async function runBootstrap() {
        try {
            const serverParam = Nozo.bootstrap.getServerParam();
            const auth = await Nozo.bootstrap.getToken();
            Nozo.bootstrap.bindWsHook();
            const server_ = await Nozo.bootstrap.findServer(serverParam);
            Nozo.state.bootstrap = {
                server: server_,
                token: auth.token,
                In: auth.In,
                at: Date.now()
            };
            Nozo.start(server_, auth.token, auth.In);
        } catch (err) {
            Nozo.log("bootstrap:error", { message: err && err.message ? err.message : String(err) });
            console.error("Nozo bootstrap failed:", err);
        }
    };

    // Compatibility aliases — all legacy names live here; no new globals are created.
    if (!Nozo.compat) {
        Nozo.compat = {
            get NozoNext() { return Nozo; },
            get UTILS() { return Nozo.Utils || null; },
            get createUtils() { return Nozo.createUtils || null; },
            get kbSimulator() { return Nozo.kbSimulator || null; }
        };
    }

    // Legacy global bridge used by ported code paths.
    if (!Nozo.globals) {
        Nozo.globals = {
            get player() { return Nozo.state.player || null; },
            get near() { return (Array.isArray(Nozo.state.enemy) && Nozo.state.enemy.length) ? Nozo.state.enemy[0] : null; },
            get enemy() { return Nozo.state.enemy || []; },
            get traps() { return Nozo.state.traps || null; },
            get autoBreak() { return Nozo.state.autoBreak || null; },
            get autoBuy() { return Nozo.state.autoBuy || null; },
            // instaC: direct reference to mutable instaKill state; writes (instaC.isTrue = x) work in-place.
            get instaC() { return Nozo.state.instaKill || null; },
            // canInsta: legacy flat alias for instaC.can (readiness flag).
            get canInsta() { return !!(Nozo.state.instaKill && Nozo.state.instaKill.can); },
            // instaWait / instaTicking: convenience mirrors for render/gating checks.
            get instaWait() { return !!(Nozo.state.instaKill && Nozo.state.instaKill.wait); },
            get instaTicking() { return !!(Nozo.state.instaKill && Nozo.state.instaKill.ticking); },
            get clicks() { return Nozo.input && Nozo.input.getClicks ? Nozo.input.getClicks() : { left: false, right: false, middle: false }; },
            get kbSimulator() { return Nozo.kbSimulator || null; },
            get closeObjects() { return Nozo.state.liztobj || []; },
            get gameObjects() { return Nozo.state.gameObjects || []; },
            get packet() { return Nozo.packet || null; }
        };
    }

    // Optional legacy aliases for existing scripts/tools that still reference globals.
    if (typeof root.kbSimulator === "undefined") root.kbSimulator = Nozo.kbSimulator || null;
    if (typeof root._things === "undefined") root._things = Nozo.globals;

    Nozo.start = function start(server_, token, In) {
        const externals = {
            "Nozo.Utils": typeof Nozo.Utils !== "undefined",
            "Nozo.createUtils": typeof Nozo.createUtils === "function",
            "Nozo.constants": typeof Nozo.constants !== "undefined",
            "Nozo.packet": typeof Nozo.packet !== "undefined",
            "Nozo.input": typeof Nozo.input !== "undefined",
            "Nozo.combat": typeof Nozo.combat !== "undefined",
            "Nozo.playerModel": typeof Nozo.playerModel !== "undefined",
            "Nozo.objectModel": typeof Nozo.objectModel !== "undefined",
            "Nozo.objectManager": typeof Nozo.objectManager !== "undefined",
            "Nozo.netEvents": typeof Nozo.netEvents !== "undefined",
            "Nozo.tickScheduler": typeof Nozo.tickScheduler !== "undefined",
            "Nozo.bridge": typeof Nozo.bridge !== "undefined",
            "Nozo.traps": typeof Nozo.traps !== "undefined",
            "Nozo.autoBreak": typeof Nozo.autoBreak !== "undefined",
            "Nozo.autoPlace": typeof Nozo.autoPlace !== "undefined",
            "Nozo.replacer": typeof Nozo.replacer !== "undefined",
            "Nozo.preplacer": typeof Nozo.preplacer !== "undefined",
            "Nozo.autoBuy": typeof Nozo.autoBuy !== "undefined",
            "Nozo.instaKill": typeof Nozo.instaKill !== "undefined",
            "Nozo.kbSimulator": typeof Nozo.kbSimulator !== "undefined",
            "Nozo.movement": typeof Nozo.movement !== "undefined",
            "Nozo.healer": typeof Nozo.healer !== "undefined",
            "Nozo.render": typeof Nozo.render !== "undefined",
            "Nozo.html": typeof Nozo.html !== "undefined",
            "window.EasyStar": typeof root.EasyStar !== "undefined",
            "window.msgpack": typeof root.msgpack !== "undefined"
        };

        if (Nozo.combat && Nozo.input) {
            Nozo.combat.wireInput(Nozo.input);
        }
        Nozo.bridge.overrideRaf();
        if (Nozo.render && Nozo.render.attach) {
            const gameCanvas = root.document && root.document.getElementById("gameCanvas");
            Nozo.render.attach(gameCanvas || null);
        }
        if (Nozo.html && Nozo.html.mount) {
            Nozo.html.mount();
        }
        Nozo.bridge.bindNetEventHandlers();
        Nozo.bridge.startTickLoop();

        Nozo.log("start", {
            phase: "Phase 22 - Remaining Class Parity + Bridge Burn-Down",
            href: root.location && root.location.href,
            server: server_ || null,
            token: token ? "[present]" : null,
            In: In || null,
            modules: Object.keys(Nozo.modules),
            externals: externals
        });
    };

    Nozo.bootstrap.run();
})();
