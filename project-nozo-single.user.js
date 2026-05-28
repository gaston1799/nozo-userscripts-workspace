// ==UserScript==
// @name         Project Nozo Single
// @namespace    nozo.single
// @version      0.1.0
// @description  Single-file rewrite scaffold
// @match        *://*.moomoo.io/*
// @run-at       document-idle
// @grant        unsafeWindow
// @require      https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals/dist/msgpack.js
// @require      https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals/dist/vendor/easystar.min.js
// ==/UserScript==


"use strict";

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
// TEMP: disable packet handoff while event parity port is in progress.
// REMOVE THIS GUARD WHEN EVENT PORTING IS FINISHED.
const BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE = false;

class CustomLogging {
    constructor(scope) {
        this.scope = scope || "NozoSingle";
    }

    log(...args) {
        console.log(`[${this.scope}]`, ...args);
    }

    warn(...args) {
        console.warn(`[${this.scope}]`, ...args);
    }

    error(...args) {
        console.error(`[${this.scope}]`, ...args);
    }
}

class Utils {
    getDistance(x1, y1, x2, y2) {
        return Math.hypot((x2 - x1), (y2 - y1));
    }

    // Legacy-compatible object distance helper.
    getDist(a, b, aTicks, bTicks) {
        const at = Number(aTicks || 0);
        const bt = Number(bTicks || 0);
        const ax = (Number(a.x2 ?? a.x) + Number(a.xVel || 0) * at);
        const ay = (Number(a.y2 ?? a.y) + Number(a.yVel || 0) * at);
        const bx = (Number(b.x2 ?? b.x) + Number(b.xVel || 0) * bt);
        const by = (Number(b.y2 ?? b.y) + Number(b.yVel || 0) * bt);
        return Math.hypot(bx - ax, by - ay);
    }

    // Direction from src->dst (legacy signature: getDirect(dst, src, dstTicks, srcTicks))
    getDirect(dst, src, dstTicks, srcTicks) {
        const dt = Number(dstTicks || 0);
        const st = Number(srcTicks || 0);
        const dx = (Number(dst.x2 ?? dst.x) + Number(dst.xVel || 0) * dt) - (Number(src.x2 ?? src.x) + Number(src.xVel || 0) * st);
        const dy = (Number(dst.y2 ?? dst.y) + Number(dst.yVel || 0) * dt) - (Number(src.y2 ?? src.y) + Number(src.yVel || 0) * st);
        return Math.atan2(dy, dx);
    }

    getAngleDist(a, b) {
        const tau = Math.PI * 2;
        let d = Math.abs(a - b) % tau;
        if (d > Math.PI) d = tau - d;
        return d;
    }

    randInt(min, max) {
        const lo = Math.ceil(Number(min || 0));
        const hi = Math.floor(Number(max || 0));
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    randFloat(min, max) {
        const lo = Number(min || 0);
        const hi = Number(max || 0);
        return Math.random() * (hi - lo) + lo;
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Safer containsPoint: avoids hard dependency on unsafeWindow symbol.
    containsPoint(el, x, y) {
        if (!el || typeof el.getBoundingClientRect !== "function") return false;
        const rect = el.getBoundingClientRect();
        const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        const sx = Number(uw.scrollX || window.scrollX || 0);
        const sy = Number(uw.scrollY || window.scrollY || 0);
        const lx = x - sx;
        const ly = y - sy;
        return lx >= rect.left && lx <= rect.right && ly >= rect.top && ly <= rect.bottom;
    }
}

const _log = new CustomLogging("NozoSingle");
const UTILS = new Utils();

function getEl(id) {
    return document.getElementById(id);
}

// Local config bridge: starts with safe defaults and syncs from game's window.config.
const _config = {
    serverUpdateRate: 9,
    clientSendRate: 5,
    mapScale: 14400,
    playerScale: 35,
    playerSpeed: 0.0016,
    playerDecel: 0.993,
    gatherAngle: 1.208304866765305,
    gatherWiggle: 10,
    hitReturnRatio: 0.25,
    hitAngle: 1.5707963267948966,
    riverWidth: 724,
    riverPadding: 114,
    snowBiomeTop: 2400,
    maxNameLength: 15
};

const _configs = {
    showDir: false,
    attackDir: false,
    autoPush: true,
    spikeCones: false,
    tracerGhost: true,
    debug: false,
    packetLogs: false,
    renderOverlay: true,
    movementAssist: false
};

function syncConfigFromWindowConfig() {
    const live = root.config;
    if (!live || typeof live !== "object") return _config;
    const keys = Object.keys(_config);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (live[k] !== undefined) _config[k] = live[k];
    }
    return _config;
}

function setConfigs(next) {
    if (!next || typeof next !== "object") return _configs;
    const keys = Object.keys(next);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        _configs[k] = next[k];
    }
    return _configs;
}

function getConfigs() {
    return _configs;
}

class element {
    static get br() {
        return new element("br");
    }
    constructor(name, obj) {
        this.element = name && name.constructor && name.constructor.name.includes("HTML")
            ? name
            : (function (tag, attrs) {
                const el = document.createElement(tag);
                const a = attrs || {};
                for (const k in a) el.setAttribute(k, a[k]);
                return el;
            })(name, obj);
    }
    style(obj) {
        for (const i in obj) this.element.style[i] = obj[i];
        return this;
    }
    append(target, ...targets) {
        this.element.append((target && target.element) || target);
        for (let i = 0; i < targets.length; i++) {
            const a = targets[i];
            this.element.append((a && a.element) || a);
        }
        return this;
    }
    appendTo(target) {
        (target && target.element
            ? target.element
            : typeof target === "string"
                ? document.querySelector(target)
                : target
        ).append(this.element);
        return this;
    }
    on(event, a) {
        this.element["on" + event] = a;
        return this;
    }
    set(prop, value) {
        this.element[prop] = value;
        return this;
    }
    remove() {
        this.element.remove();
        return this;
    }
    get(prop) {
        return this.element[prop];
    }
    get children() {
        return new (class {
            constructor(arr) {
                for (let i = 0; i < arr.length; i += 1) this[i] = arr[i];
                Object.defineProperty(this, "length", { get: () => arr.length });
                Object.freeze(this);
            }
            item(i) {
                return this[i] != null ? this[i] : null;
            }
            namedItem(name) {
                for (let i = 0; i < this.length; i += 1) {
                    if (this[i].id === name || this[i].name === name) return this[i];
                }
                return null;
            }
            get toArray() {
                return [...this];
            }
        })([...this.element.children]);
    }
}

class HtmlAction {
    constructor(elementRef) {
        this.element = elementRef;
    }
    add(code) {
        if (!this.element) return;
        this.element.innerHTML += code;
    }
    newLine(amount) {
        let result = "<br>";
        if (amount > 0) {
            result = "";
            for (let i = 0; i < amount; i++) result += "<br>";
        }
        this.add(result);
    }
    checkBox(setting) {
        let s = '<input type="checkbox"';
        setting.id && (s += ` id="${setting.id}"`);
        setting.style && (s += ` style="${String(setting.style).replaceAll('"', "&quot;")}"`);
        setting.class && (s += ` class="${setting.class}"`);
        setting.checked && (s += " checked");
        s += ">";
        this.add(s);
    }
    text(setting) {
        let s = '<input type="text"';
        setting.id && (s += ` id="${setting.id}"`);
        setting.style && (s += ` style="${String(setting.style).replaceAll('"', "&quot;")}"`);
        setting.class && (s += ` class="${setting.class}"`);
        setting.size && (s += ` size="${setting.size}"`);
        setting.maxLength && (s += ` maxLength="${setting.maxLength}"`);
        setting.value && (s += ` value="${setting.value}"`);
        setting.placeHolder && (s += ` placeHolder="${setting.placeHolder}"`);
        s += ">";
        this.add(s);
    }
    select(setting) {
        let s = "<select";
        setting.id && (s += ` id="${setting.id}"`);
        setting.style && (s += ` style="${String(setting.style).replaceAll('"', "&quot;")}"`);
        setting.class && (s += ` class="${setting.class}"`);
        s += ">";
        for (const label in setting.option) {
            const opt = setting.option[label];
            s += `<option value="${opt.id}"${opt.selected ? " selected" : ""}>${label}</option>`;
        }
        s += "</select>";
        this.add(s);
    }
    button(setting) {
        let s = "<button";
        setting.id && (s += ` id="${setting.id}"`);
        setting.style && (s += ` style="${String(setting.style).replaceAll('"', "&quot;")}"`);
        setting.class && (s += ` class="${setting.class}"`);
        s += ">";
        setting.innerHTML && (s += setting.innerHTML);
        s += "</button>";
        this.add(s);
    }
}

class LyricsPlayer {
    #songs;
    #urlFn;
    #timers = [];
    #mainLyrics = [];
    #extraLyrics = [];
    audio = null;

    constructor(songs, urlFn) {
        this.#songs = songs;
        this.#urlFn = urlFn;
    }

    attachAudioElement(audioEl) {
        this.audio = audioEl;

        this.audio.addEventListener("loadedmetadata", () => {
            console.log("Audio loaded, duration:", this.audio.duration);
        });

        this.audio.addEventListener("play", () => {
            this._scheduleLyrics();
        });

        this.audio.addEventListener("pause", () => {
            this.clearTimers();
        });

        this.audio.addEventListener("seeked", () => {
            if (!this.audio.paused) this._scheduleLyrics();
        });
    }

    playSong(name) {
        if (!this.audio) throw new Error("Attach an <audio> first!");
        this.clearTimers();
        this.audio.src = this.#urlFn(encodeURIComponent(name));
        this.audio.load();
        this.audio.play();
        this.#mainLyrics = this.#songs[name].lyrics || [];
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
        this.#mainLyrics.forEach(({ time, text }) => {
            if (time > now) {
                this.#timers.push(setTimeout(() => chat(text), (time - now) * 1000));
            }
        });
        this.#extraLyrics.forEach((arr, idx) => {
            const channel = idx + 1;
            const target = _origGM_getValue(`chat${channel}`);
            if (!target) return;
            arr.forEach(({ time, text }) => {
                if (time > now) {
                    this.#timers.push(setTimeout(() => {
                        _origGM_setValue(`chat:${target}`, text);
                        sendUpdate(`chat:${target}`, text, 1);
                    }, (time - now) * 1000));
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

class Html {
    constructor() {
        this.element = null;
        this.action = null;
        this.divElement = null;
        this.startDiv = function (setting, func) {
            const newDiv = document.createElement("div");
            setting.id && (newDiv.id = setting.id);
            setting.style && (newDiv.style = setting.style);
            setting.class && (newDiv.className = setting.class);
            this.element.appendChild(newDiv);
            this.divElement = newDiv;
            const addRes = new HtmlAction(newDiv);
            typeof func === "function" && func(addRes);
        };
        this.addDiv = function (setting, func) {
            const newDiv = document.createElement("div");
            setting.id && (newDiv.id = setting.id);
            setting.style && (newDiv.style = setting.style);
            setting.class && (newDiv.className = setting.class);
            setting.appendID && getEl(setting.appendID).appendChild(newDiv);
            this.divElement = newDiv;
            const addRes = new HtmlAction(newDiv);
            typeof func === "function" && func(addRes);
        };
    }
    set(id) {
        this.element = getEl(id);
        this.action = new HtmlAction(this.element);
    }
    resetHTML() {
        this.element.innerHTML = "";
    }
    setStyle(style) {
        this.element.style = style;
    }
    setCSS(style) {
        this.action.add("<style>" + style + "</style>");
    }
}

class Entity {
    constructor(name, rootRef) {
        this.name = name || "Entity";
        this.root = rootRef || window;
        this.state = {};
        this.modules = {};
        this.flags = {
            initialized: false,
            running: false
        };
        this.events = {};
    }

    setState(key, value) {
        this.state[key] = value;
        return value;
    }

    getState(key, fallback) {
        return this.state[key] !== undefined ? this.state[key] : fallback;
    }

    registerModule(name, moduleRef) {
        if (!name) return null;
        this.modules[name] = moduleRef;
        return moduleRef;
    }

    getModule(name) {
        return this.modules[name] || null;
    }

    on(event, fn) {
        if (!event || typeof fn !== "function") return () => { };
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(fn);
        return () => {
            this.events[event] = (this.events[event] || []).filter((cb) => cb !== fn);
        };
    }

    emit(event, payload) {
        const list = this.events[event] || [];
        for (let i = 0; i < list.length; i++) {
            try {
                list[i](payload, this);
            } catch (err) {
                console.error(`[${this.name}] emit error:`, event, err);
            }
        }
    }

    init() {
        this.flags.initialized = true;
        this.emit("init", { at: Date.now() });
    }

    start() {
        if (!this.flags.initialized) this.init();
        this.flags.running = true;
        this.emit("start", { at: Date.now() });
    }

    stop() {
        this.flags.running = false;
        this.emit("stop", { at: Date.now() });
    }
}

class Player {
    constructor(sid) {
        this.sid = sid == null ? null : sid;
        this.id = null;
        this.name = null;
        this.team = null;
        this.skinColor = 0;
        this.skinIndex = 0;
        this.tailIndex = 0;
        this.iconIndex = 0;
        this.weaponIndex = 0;
        this.weaponVariant = 0;
        this.buildIndex = -1;
        this.zIndex = 0;
        this.x = 0;
        this.y = 0;
        this.x2 = 0;
        this.y2 = 0;
        this.x1 = 0;
        this.y1 = 0;
        this.x3 = 0;
        this.y3 = 0;
        this.x4 = 0;
        this.y4 = 0;
        this.x5 = 0;
        this.y5 = 0;
        this.oldPos = { x2: 0, y2: 0 };
        this.t1 = 0;
        this.t2 = 0;
        this.d1 = 0;
        this.d2 = 0;
        this.dt = 0;
        this.forcePos = false;
        this.direct = 0;
        this.dist = 0;
        this.dist2 = 0;
        this.dist3 = 0;
        this.dist4 = 0;
        this.dist5 = 0;
        this.aim2 = 0;
        this.aim3 = 0;
        this.aim4 = 0;
        this.aim5 = 0;
        this.lu = 0;
        this.dir = 0;
        this.scale = 35;
        this.health = 100;
        this.oldHealth = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.active = true;
        this.visible = false;
        this.items = [];
        this.weapons = [0, 0];
        this.primaryIndex = 0;
        this.secondaryIndex = 0;
        this.itemCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
        this.reloads = {
            0: 0, 1: 0, 2: 0, 3: 0,
            4: 0, 5: 0, 6: 0, 7: 0,
            8: 0, 9: 0, 10: 0, 11: 0,
            12: 0, 13: 0, 14: 0, 15: 0,
            53: 0
        };
        this.lastSeenAt = 0;
        this.XP = 0;
        this.maxXP = 300;
        this.age = 1;
        this.upgradePoints = 0;
        this.upgrAge = 1;
        this.isOwner = false;
        this.skins = {};
        this.tails = {};
        this.latestSkin = 0;
        this.latestTail = 0;
        this.chatMessages = [];
        this.gathering = 0;
        this.gatherIndex = 0;
        this.shooting = {};
        this.shootIndex = 9;
        this.attacked = false;
        this.damaged = 0;
        this.shameTimer = 0;
        this.shameCount = 0;

        // Derived from live skin transition (45), not timer assumptions.
        this.shameActive = false;
        this.shameTransitions = 0;
        this.lastShameAt = 0;
        this.lastShameClearAt = 0;
    }

    updateShame(prevSkin, nextSkin) {
        if (prevSkin !== 45 && nextSkin === 45) {
            this.shameActive = true;
            this.shameTransitions += 1;
            this.lastShameAt = Date.now();
        } else if (prevSkin === 45 && nextSkin !== 45) {
            this.shameActive = false;
            this.lastShameClearAt = Date.now();
        }
    }

    applyTuple(tuple, offset) {
        const i = offset || 0;
        const prevSkin = this.skinIndex;
        this.sid = tuple[i + 0];
        this.x = tuple[i + 1];
        this.y = tuple[i + 2];
        this.x2 = tuple[i + 1];
        this.y2 = tuple[i + 2];
        this.dir = tuple[i + 3];
        this.buildIndex = tuple[i + 4];
        this.weaponIndex = tuple[i + 5];
        this.weaponVariant = tuple[i + 6];
        this.team = tuple[i + 7];
        this.isLeader = tuple[i + 8];
        this.skinIndex = tuple[i + 9];
        this.tailIndex = tuple[i + 10];
        this.iconIndex = tuple[i + 11];
        this.zIndex = tuple[i + 12];
        this.visible = true;
        this.active = true;
        this.alive = true;
        this.lastSeenAt = Date.now();
        this.updateShame(prevSkin, this.skinIndex);
    }

    applyHealth(v) {
        if (typeof v !== "number") return;
        this.oldHealth = this.health;
        this.health = v;
    }

    setReload(index, value) {
        if (index == null) return;
        this.reloads[index] = typeof value === "number" ? value : 0;
    }

    update(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
        if (this.shameTimer > 0) {
            this.shameTimer = Math.max(0, this.shameTimer - deltaMs);
        }
    }

    addShameTimer() {
        this.shameTimer = 30000;
        this.shameCount = Number(this.shameCount || 0) + 1;
    }

    resetMoveDir() {
        this.moveDir = undefined;
    }

    resetResources(configObj, moofoll) {
        const types = (configObj && Array.isArray(configObj.resourceTypes)) ? configObj.resourceTypes : ["wood", "food", "stone", "points"];
        for (let i = 0; i < types.length; i++) this[types[i]] = moofoll ? 100 : 0;
    }

    spawn(configObj, moofoll) {
        this.attacked = false;
        this.active = true;
        this.alive = true;
        this.gathering = 0;
        this.gatherIndex = 0;
        this.shooting = {};
        this.shootIndex = 9;
        this.buildIndex = -1;
        this.weaponIndex = 0;
        this.weaponVariant = 0;
        this.primaryIndex = 0;
        this.secondaryIndex = 0;
        this.shameCount = 0;
        this.shameTimer = 0;
        this.maxHealth = 100;
        this.health = 100;
        this.oldHealth = 100;
        this.damageThreat = 0;
        this.resetMoveDir();
        this.resetResources(configObj, moofoll);
        this.items = [0, 3, 6, 10];
        this.weapons = [0];
        this.reloads = {
            0: 0, 1: 0, 2: 0, 3: 0,
            4: 0, 5: 0, 6: 0, 7: 0,
            8: 0, 9: 0, 10: 0, 11: 0,
            12: 0, 13: 0, 14: 0, 15: 0,
            53: 0
        };
    }

    judgeShame(gameObj) {
        if (this.oldHealth < this.health) {
            if (this.hitTime) {
                const timeSinceHit = gameObj.tick - this.hitTime;
                this.lastHit = gameObj.tick;
                this.hitTime = 0;
                if (timeSinceHit < 2) this.shameCount++;
                else this.shameCount = Math.max(0, this.shameCount - 2);
            }
        } else if (this.oldHealth > this.health) {
            this.hitTime = gameObj.tick;
        }
    }

    manageReload(gameObj, itemsObj, isLocalPlayer, onLocalReloadTick) {
        if (this.shooting[53]) {
            this.shooting[53] = 0;
            this.reloads[53] = 2500 - gameObj.tickRate;
        } else if (this.reloads[53] > 0) {
            this.reloads[53] = Math.max(0, this.reloads[53] - gameObj.tickRate);
        }

        if (this.gathering || this.shooting[1]) {
            if (this.gathering) {
                this.gathering = 0;
                this.reloads[this.gatherIndex] = itemsObj.weapons[this.gatherIndex].speed * (this.skinIndex == 20 ? 0.78 : 1);
                this.attacked = true;
            }
            if (this.shooting[1]) {
                this.shooting[1] = 0;
                this.reloads[this.shootIndex] = itemsObj.weapons[this.shootIndex].speed * (this.skinIndex == 20 ? 0.78 : 1);
                this.attacked = true;
            }
        } else {
            this.attacked = false;
            if (this.buildIndex < 0 && this.reloads[this.weaponIndex] > 0) {
                this.reloads[this.weaponIndex] = Math.max(0, this.reloads[this.weaponIndex] - gameObj.tickRate);
            }
        }
        //check if playerside matches this.sid
        
        if (isLocalPlayer && typeof onLocalReloadTick === "function") onLocalReloadTick(this);
    }

    isTeam(tmpObj) {
        return (this === tmpObj || (this.team && this.team === tmpObj.team));
    }

    addDamageThreat(tmpObj, itemsObj, configObj, gameObj) {
        const cfg = configObj || {};
        const variants = Array.isArray(cfg.weaponVariants) ? cfg.weaponVariants : [];
        const primary = {
            weapon: this.primaryIndex,
            variant: this.primaryVariant
        };
        primary.dmg = primary.weapon == undefined ? 45 : itemsObj.weapons[primary.weapon].dmg;
        const secondary = {
            weapon: this.secondaryIndex,
            variant: this.secondaryVariant
        };
        secondary.dmg = secondary.weapon == undefined ? 50 : itemsObj.weapons[secondary.weapon].Pdmg;
        const bull = 1.5;
        const pV = primary.variant != undefined && variants[primary.variant] ? variants[primary.variant].val : 1.18;
        const sV = secondary.variant != undefined && variants[secondary.variant]
            ? ([9, 12, 13, 15].includes(secondary.weapon) ? 1 : variants[secondary.variant].val)
            : 1.18;
        if (primary.weapon == undefined ? true : this.reloads[primary.weapon] == 0) {
            this.damageThreat += primary.dmg * pV * bull;
        }
        if (secondary.weapon == undefined ? true : this.reloads[secondary.weapon] == 0) {
            this.damageThreat += secondary.dmg * sV;
        }
        if (this.reloads[53] <= gameObj.tickRate) {
            this.damageThreat += 25;
        }
        this.damageThreat *= tmpObj.skinIndex == 6 ? 0.75 : 1;
        if (!this.isTeam(tmpObj) && this.dist2 <= 300) {
            tmpObj.damageThreat += this.damageThreat;
        }
    }
}

class Items {
    constructor(rootRef) {
        this.root = rootRef || window;
        this.groups = [];
        this.projectiles = [];
        this.onReloadHudUpdate = null;
        this.weapons = [];
        this.list = [];
        this.hats = [];
        this.accessories = [];
        this.weaponVariants = [];
        this._seedDefaults();
        this._hydrateFromRoot();
    }

    _seedDefaults() {
        this.groups = [
            { id: 0, name: "food", layer: 0 },
            { id: 1, name: "walls", place: true, limit: 30, layer: 0 },
            { id: 2, name: "spikes", place: true, limit: 15, layer: 0 },
            { id: 3, name: "mill", place: true, limit: 7, layer: 1 },
            { id: 4, name: "mine", place: true, limit: 1, layer: 0 },
            { id: 5, name: "trap", place: true, limit: 6, layer: -1 },
            { id: 6, name: "booster", place: true, limit: 12, layer: -1 },
            { id: 7, name: "turret", place: true, limit: 2, layer: 1 },
            { id: 8, name: "watchtower", place: true, limit: 12, layer: 1 },
            { id: 9, name: "buff", place: true, limit: 4, layer: -1 },
            { id: 10, name: "spawn", place: true, limit: 1, layer: -1 },
            { id: 11, name: "sapling", place: true, limit: 2, layer: 0 },
            { id: 12, name: "blocker", place: true, limit: 3, layer: -1 },
            { id: 13, name: "teleporter", place: true, limit: 2, layer: -1 }
        ];
        this.projectiles = [
            { indx: 0, layer: 0, src: "arrow_1", dmg: 25, speed: 1.6, scale: 103, range: 1000 },
            { indx: 1, layer: 1, dmg: 25, scale: 20, speed: 1.5 },
            { indx: 0, layer: 0, src: "arrow_1", dmg: 35, speed: 2.5, scale: 103, range: 1200 },
            { indx: 0, layer: 0, src: "arrow_1", dmg: 30, speed: 2, scale: 103, range: 1200 },
            { indx: 1, layer: 1, dmg: 16, scale: 20 },
            { indx: 0, layer: 0, src: "bullet_1", dmg: 50, speed: 3.6, scale: 160, range: 1400 }
        ];
        this.weapons = [
            { id: 0, type: 0, name: "tool hammer", dmg: 25, range: 65, gather: 1, speed: 300 },
            { id: 1, type: 0, age: 2, name: "hand axe", dmg: 30, range: 70, gather: 2, speed: 400 },
            { id: 2, type: 0, age: 8, pre: 1, name: "great axe", dmg: 35, range: 75, gather: 4, speed: 400 },
            { id: 3, type: 0, age: 2, name: "short sword", dmg: 35, range: 110, gather: 1, speed: 300 },
            { id: 4, type: 0, age: 8, pre: 3, name: "katana", dmg: 40, range: 118, gather: 1, speed: 300 },
            { id: 5, type: 0, age: 2, name: "polearm", dmg: 45, range: 142, gather: 1, speed: 700 },
            { id: 6, type: 0, age: 2, name: "bat", dmg: 20, range: 110, gather: 1, speed: 300 },
            { id: 7, type: 0, age: 2, name: "daggers", dmg: 20, range: 65, gather: 1, speed: 100 },
            { id: 8, type: 0, age: 2, name: "stick", dmg: 1, range: 70, gather: 7, speed: 400 },
            { id: 9, type: 1, age: 6, name: "hunting bow", Pdmg: 25, projectile: 0, speed: 600 },
            { id: 10, type: 1, age: 6, name: "great hammer", dmg: 10, Pdmg: 10, range: 75, speed: 400 },
            { id: 11, type: 1, age: 6, name: "wooden shield", speed: 700 },
            { id: 12, type: 1, age: 8, pre: 9, name: "crossbow", Pdmg: 35, projectile: 2, speed: 700 },
            { id: 13, type: 1, age: 9, pre: 12, name: "repeater crossbow", Pdmg: 30, projectile: 3, speed: 300 },
            { id: 14, type: 1, age: 6, name: "mc grabby", dmg: 0, range: 125, speed: 700 },
            { id: 15, type: 1, age: 9, pre: 12, name: "musket", Pdmg: 50, projectile: 5, speed: 1500 }
        ];
        this.list = [
            { id: 16, group: 0, name: "apple", healing: 20 },
            { id: 17, group: 0, age: 2, name: "cookie", healing: 40 },
            { id: 18, group: 0, age: 7, name: "cheese", healing: 30 }
        ];
    }

    _hydrateFromRoot() {
        const r = this.root;
        if (Array.isArray(r.weapons) && r.weapons.length) this.weapons = r.weapons.slice();
        if (Array.isArray(r.groups) && r.groups.length) this.groups = r.groups.slice();
        if (Array.isArray(r.projectiles) && r.projectiles.length) this.projectiles = r.projectiles.slice();
        if (Array.isArray(r.list) && r.list.length) this.list = r.list.slice();
        if (Array.isArray(r.hats) && r.hats.length) this.hats = r.hats.slice();
        if (Array.isArray(r.accessories) && r.accessories.length) this.accessories = r.accessories.slice();
        if (r.config && Array.isArray(r.config.weaponVariants)) this.weaponVariants = r.config.weaponVariants.slice();
    }

    applyInitCatalog(payload) {
        if (!payload) return;
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
            if (Array.isArray(payload.groups)) this.groups = payload.groups.slice();
            if (Array.isArray(payload.projectiles)) this.projectiles = payload.projectiles.slice();
            if (Array.isArray(payload.weapons)) this.weapons = payload.weapons.slice();
            if (Array.isArray(payload.list)) this.list = payload.list.slice();
            if (Array.isArray(payload.hats)) this.hats = payload.hats.slice();
            if (Array.isArray(payload.accessories)) this.accessories = payload.accessories.slice();
        } else if (Array.isArray(payload)) {
            // Keep raw for strict index mapping pass later.
            this.rawInitCatalog = payload;
        }
        this.publish();
    }

    publish() {
        this.root.items = this;
        if (this.root._things && typeof this.root._things === "object") {
            this.root._things.items = this;
        }
    }
}

class GameObject {
    constructor(sid) {
        this.sid = sid;
        this.active = false;
        this.alive = false;
        this.render = false;
        this.xWiggle = 0;
        this.yWiggle = 0;
    }

    init(x, y, dir, scale, type, data, owner) {
        const cfg = (typeof root !== "undefined" && root.config) ? root.config : {};
        data = data || {};
        this.active = true;
        this.alive = true;
        this.x = x;
        this.y = y;
        this.dir = cfg && cfg.anotherVisual ? dir + Math.PI : dir;
        this.lastDir = dir;
        this.scale = scale;
        this.visScale = scale;
        this.type = type;
        this.id = data.id;
        this.owner = owner || null;
        this.ownerSid = owner && owner.sid != null ? owner.sid : null;
        this.name = data.name;
        this.isItem = this.id !== undefined;
        this.group = data.group;
        this.maxHealth = data.health;
        this.health = this.maxHealth;
        this.layer = this.group != null ? (this.group.layer || 0) : (type === 0 ? 3 : type === 2 ? 0 : type === 4 ? -1 : 2);
        this.colDiv = data.colDiv || 1;
        this.blocker = data.blocker;
        this.ignoreCollision = data.ignoreCollision;
        this.dontGather = data.dontGather;
        this.hideFromEnemy = data.hideFromEnemy;
        this.friction = data.friction;
        this.projDmg = data.projDmg;
        this.dmg = data.dmg;
        this.pDmg = data.pDmg;
        this.pps = data.pps;
        this.zIndex = data.zIndex || 0;
        this.turnSpeed = data.turnSpeed;
        this.req = data.req;
        this.trap = data.trap;
        this.healCol = data.healCol;
        this.teleport = data.teleport;
        this.boostSpeed = data.boostSpeed;
        this.projectile = data.projectile;
        this.shootRange = data.shootRange;
        this.shootRate = data.shootRate;
        this.shootCount = this.shootRate;
        this.spawnPoint = data.spawnPoint;
        this.alpha = data.alpha || 1;
        this.maxAlpha = data.alpha || 1;
        this.damaged = 0;
        this.render = true;
    }

    getScale(sM, ig) {
        sM = sM || 1;
        return this.scale * ((this.isItem || this.type === 2 || this.type === 3 || this.type === 4) ? 1 : (0.6 * sM)) * (ig ? 1 : this.colDiv);
    }

    isTeamObject(tmpObj) {
        return this.owner == null ? true : (this.owner && (tmpObj.sid === this.owner.sid || (typeof tmpObj.findAllianceBySid === "function" && tmpObj.findAllianceBySid(this.owner.sid))));
    }
}

class Projectile {
    constructor() {
        this.active = false;
        this.tickActive = false;
    }

    init(indx, x, y, dir, spd, dmg, rng, scl, owner) {
        this.active = true;
        this.tickActive = true;
        this.indx = indx;
        this.x = x;
        this.y = y;
        this.x2 = x;
        this.y2 = y;
        this.dir = dir;
        this.skipMov = true;
        this.speed = spd;
        this.dmg = dmg;
        this.scale = scl;
        this.range = rng;
        this.r2 = rng;
        this.owner = owner;
    }
}

class Objectmanager {
    constructor(gameObjectsRef) {
        this.gameObjects = gameObjectsRef;
        this.hitObj = [];
    }

    _findObjectBySid(sid) {
        for (let i = 0; i < this.gameObjects.length; i++) {
            if (this.gameObjects[i].sid === sid) return this.gameObjects[i];
        }
        return null;
    }

    add(sid, x, y, dir, scale, type, data, setSID, owner) {
        let obj = this._findObjectBySid(sid);
        if (!obj) {
            obj = new GameObject(sid);
            this.gameObjects.push(obj);
        }
        if (setSID) obj.sid = sid;
        obj.init(x, y, dir, scale, type, data, owner);
        return obj;
    }

    disableBySid(sid) {
        const obj = this._findObjectBySid(sid);
        if (obj) obj.active = false;
    }

    removeAllItems(ownerSid) {
        for (let i = 0; i < this.gameObjects.length; i++) {
            const obj = this.gameObjects[i];
            if (obj.active && obj.ownerSid === ownerSid) obj.active = false;
        }
    }
}

class ProjectileManager {
    constructor(projectilesRef, itemsRef) {
        this.projectiles = projectilesRef;
        this.items = itemsRef;
    }

    _findBySid(sid) {
        for (let i = 0; i < this.projectiles.length; i++) {
            if (this.projectiles[i].sid === sid) return this.projectiles[i];
        }
        return null;
    }

    addProjectile(x, y, dir, range, speed, indx, owner, ignoreObj, layer, inWindow, sid) {
        const tmpData = (this.items && this.items.projectiles && this.items.projectiles[indx]) ? this.items.projectiles[indx] : { dmg: 0, scale: 0, layer: 0, src: "" };
        let proj = null;
        for (let i = 0; i < this.projectiles.length; i++) {
            if (!this.projectiles[i].active) { proj = this.projectiles[i]; break; }
        }
        if (!proj) {
            proj = new Projectile();
            proj.sid = sid != null ? sid : this.projectiles.length;
            this.projectiles.push(proj);
        }
        proj.init(indx, x, y, dir, speed, tmpData.dmg, range, tmpData.scale, owner);
        proj.ignoreObj = ignoreObj;
        proj.layer = layer || tmpData.layer;
        proj.inWindow = inWindow;
        proj.src = tmpData.src;
        if (sid != null) proj.sid = sid;
        return proj;
    }

    removeProjectile(sid, range) {
        const p = this._findBySid(sid);
        if (!p) return null;
        p.range = range;
        p.active = false;
        return p;
    }
}

class AI {
    constructor(sid, rootRef) {
        this.sid = sid;
        this.root = rootRef || window;
        this.isAI = true;
        this.active = false;
        this.visible = false;
        this.alive = true;
        this.forcePos = true;
        this.animTime = 0;
        this.animSpeed = 0;
        this.targetAngle = 0;
        this.dirPlus = 0;
    }

    init(x, y, dir, index, data) {
        data = data || {};
        this.x = x; this.y = y;
        this.x1 = x; this.y1 = y;
        this.x2 = x; this.y2 = y;
        this.dir = dir;
        this.d1 = dir; this.d2 = dir;
        this.index = index;
        this.src = data.src || null;
        this.name = data.name || null;
        this.scale = data.scale || 72;
        this.maxHealth = data.health || 100;
        this.health = this.maxHealth;
        this.active = true;
        this.visible = true;
        this.alive = true;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        this.t1 = now;
        this.t2 = now;
        this.dt = 0;
    }

    startAnim() {
        this.animTime = this.animSpeed = 600;
        this.targetAngle = Math.PI * 0.8;
        this.dirPlus = 0;
    }
}

class AiManager {
    constructor(aisRef, rootRef) {
        this.ais = aisRef;
        this.root = rootRef || window;
        this.aiTypes = [
            { id: 0, src: "cow_1", killScore: 150, health: 500, weightM: 0.8, speed: 0.00095, turnSpeed: 0.001, scale: 72, drop: ["food", 50] },
            { id: 1, src: "pig_1", killScore: 200, health: 800, weightM: 0.6, speed: 0.00085, turnSpeed: 0.001, scale: 72, drop: ["food", 80] },
            { id: 2, name: "Bull", src: "bull_2", hostile: true, dmg: 20, killScore: 1000, health: 1800, weightM: 0.5, speed: 0.00094, turnSpeed: 0.00074, scale: 78, viewRange: 800, chargePlayer: true, drop: ["food", 100] }
        ];
    }

    _type(index) {
        return this.aiTypes[index] || this.aiTypes[0] || { id: index, src: "cow_1", health: 100, scale: 72 };
    }

    _findBySid(sid) {
        for (let i = 0; i < this.ais.length; i++) {
            if (this.ais[i].sid === sid) return this.ais[i];
        }
        return null;
    }

    spawnWithSid(sid, x, y, dir, index) {
        let ai = this._findBySid(sid);
        if (!ai) {
            ai = new AI(sid, this.root);
            this.ais.push(ai);
        }
        ai.init(x, y, dir, index, this._type(index));
        return ai;
    }
}

class Animtext {
    constructor() {
        this.init = function (x, y, scale, speed, life, text, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.scale = scale;
            this.startScale = this.scale;
            this.maxScale = scale * 1.5;
            this.scaleSpeed = 0.7;
            this.speed = speed;
            this.life = life;
            this.text = text;
            this.acc = 1;
            this.alpha = 0;
            this.maxLife = life;
            this.ranX = UTILS.randFloat(-1, 1);
        };

        this.update = function (delta) {
            if (!this.life) return;
            this.life -= delta;
            const anotherVisual = !!((root.config && root.config.anotherVisual) || _config.anotherVisual);
            if (anotherVisual) {
                this.y -= this.speed * delta * this.acc;
                this.acc -= delta / (this.maxLife / 2.5);
                if (this.life <= 200) {
                    if (this.alpha > 0) this.alpha = Math.max(0, this.alpha - (delta / 300));
                } else if (this.alpha < 1) {
                    this.alpha = Math.min(1, this.alpha + (delta / 100));
                }
                this.x += this.ranX;
            } else {
                this.y -= this.speed * delta;
            }
            this.scale += this.scaleSpeed * delta;
            if (this.scale >= this.maxScale) {
                this.scale = this.maxScale;
                this.scaleSpeed *= -1;
            } else if (this.scale <= this.startScale) {
                this.scale = this.startScale;
                this.scaleSpeed = 0;
            }
            if (this.life <= 0) this.life = 0;
        };

        this.render = function (ctxt, xOff, yOff) {
            const anotherVisual = !!((root.config && root.config.anotherVisual) || _config.anotherVisual);
            ctxt.lineWidth = 10;
            ctxt.fillStyle = this.color;
            ctxt.font = this.scale + "px " + (anotherVisual ? "Ubuntu" : "Hammersmith One");
            if (anotherVisual) {
                ctxt.globalAlpha = this.alpha;
                ctxt.strokeStyle = "#3d3f42";
                ctxt.strokeText(this.text, this.x - xOff, this.y - yOff);
            }
            ctxt.fillText(this.text, this.x - xOff, this.y - yOff);
            ctxt.globalAlpha = 1;
        };
    }
}

class Textmanager {
    constructor() {
        this.texts = [];
        this.stack = [];
    }

    update(delta, ctxt, xOff, yOff) {
        if (!ctxt) return;
        ctxt.textBaseline = "middle";
        ctxt.textAlign = "center";
        for (let i = 0; i < this.texts.length; ++i) {
            if (this.texts[i].life) {
                this.texts[i].update(delta);
                this.texts[i].render(ctxt, xOff, yOff);
            }
        }
    }

    showText(x, y, scale, speed, life, text, color) {
        let tmpText = null;
        for (let i = 0; i < this.texts.length; ++i) {
            if (!this.texts[i].life) {
                tmpText = this.texts[i];
                break;
            }
        }
        if (!tmpText) {
            tmpText = new Animtext();
            this.texts.push(tmpText);
        }
        tmpText.init(x, y, scale, speed, life, text, color);
    }
}

class DeadPlayer {
    constructor(x, y, dir, buildIndex, weaponIndex, weaponVariant, skinColor, scale, name) {
        this.x = x;
        this.y = y;
        this.lastDir = dir;
        this.dir = dir + Math.PI;
        this.buildIndex = buildIndex;
        this.weaponIndex = weaponIndex;
        this.weaponVariant = weaponVariant;
        this.skinColor = skinColor;
        this.scale = scale;
        this.visScale = 0;
        this.name = name;
        this.alpha = 1;
        this.active = true;
    }

    animate(delta) {
        let d2 = UTILS.getAngleDist(this.lastDir, this.dir);
        if (d2 > 0.01) this.dir += d2 / 20;
        else this.dir = this.lastDir;
        if (this.visScale < this.scale) {
            this.visScale += delta / (this.scale / 2);
            if (this.visScale >= this.scale) this.visScale = this.scale;
        }
        this.alpha -= delta / 30000;
        if (this.alpha <= 0) {
            this.alpha = 0;
            this.active = false;
        }
    }
}

class addCh {
    constructor(x, y, chat, tmpObj) {
        this.x = x;
        this.y = y;
        this.alpha = 0;
        this.active = true;
        this.alive = false;
        this.chat = chat;
        this.owner = tmpObj;
    }
}

class Petal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.damage = 10;
        this.health = 10;
        this.maxHealth = this.health;
        this.active = false;
        this.alive = false;
        this.timer = 1500;
        this.time = 0;
        this.damaged = 0;
        this.alpha = 1;
        this.scale = 9;
        this.visScale = this.scale;
    }
}

class MapPing {
    constructor(color, scale, rootRef) {
        this.color = color;
        this.maxScale = scale;
        this.root = rootRef || root;
        this.scale = 0;
        this.active = false;
    }

    init(x, y) {
        this.scale = 0;
        this.x = x;
        this.y = y;
        this.active = true;
    }

    update(ctxt, delta, opts) {
        const o = opts || {};
        const compute = o.compute !== false;
        const draw = o.draw !== false;
        if (!this.active) return;
        if (compute) this.scale += 0.05 * delta;
        if (compute && this.scale >= this.maxScale) {
            this.active = false;
            return;
        }
        if (!draw || !ctxt) return;
        const mapDisplay = this.root.mapDisplay || document.getElementById("mapDisplay");
        if (!mapDisplay) return;
        const cfg = this.root.config || _config;
        const mapScale = Number(cfg.mapScale || _config.mapScale || 14400);
        ctxt.globalAlpha = (1 - Math.max(0, this.scale / this.maxScale));
        ctxt.strokeStyle = this.color;
        ctxt.beginPath();
        ctxt.arc((this.x / mapScale) * mapDisplay.width, (this.y / mapScale) * mapDisplay.width, this.scale, 0, 2 * Math.PI);
        ctxt.stroke();
        ctxt.globalAlpha = 1;
    }
}

class Store {
    constructor(rootRef) {
        this.root = rootRef || root;
        this.hats = Array.isArray(this.root.hats) ? this.root.hats.slice() : [];
        this.accessories = Array.isArray(this.root.accessories) ? this.root.accessories.slice() : [];
    }

    syncFromRoot() {
        if (Array.isArray(this.root.hats) && this.root.hats.length) this.hats = this.root.hats.slice();
        if (Array.isArray(this.root.accessories) && this.root.accessories.length) this.accessories = this.root.accessories.slice();
    }
}

class Damages {
    constructor(items) {
        this.calcDmg = function (dmg, val) {
            return dmg * val;
        };
        this.getAllDamage = function (dmg) {
            return [this.calcDmg(dmg, 0.75), dmg, this.calcDmg(dmg, 1.125), this.calcDmg(dmg, 1.5)];
        };
        this.weapons = [];
        const src = items && Array.isArray(items.weapons) ? items.weapons : [];
        for (let i = 0; i < src.length; i++) {
            const wp = src[i];
            const parts = String(wp.name || "unknown").split(" ");
            const name = parts.length <= 1 ? parts[0] : (parts[0] + "_" + parts[1]);
            this.weapons.push(this.getAllDamage(i > 8 ? wp.Pdmg : wp.dmg));
            this[name] = this.weapons[i];
        }
    }
}

class Autoupgrade {
    constructor() {
        this.sb = function (upg) {
            upg(3); upg(17); upg(31); upg(23); upg(9); upg(38);
        };
        this.kh = function (upg) {
            upg(3); upg(17); upg(31); upg(23); upg(10); upg(38); upg(4); upg(25);
        };
        this.pb = function (upg) {
            upg(5); upg(17); upg(32); upg(23); upg(9); upg(38);
        };
        this.ph = function (upg) {
            upg(5); upg(17); upg(32); upg(23); upg(10); upg(38); upg(28); upg(25);
        };
        this.db = function (upg) {
            upg(7); upg(17); upg(31); upg(23); upg(9); upg(34);
        };
        this.km = function (upg) {
            upg(7); upg(17); upg(31); upg(23); upg(10); upg(38); upg(4); upg(15);
        };
    }
}

class Autobuy {
    constructor(buyHatOrder, buyAccOrder, deps) {
        this.buyHatOrder = Array.isArray(buyHatOrder) ? buyHatOrder : [];
        this.buyAccOrder = Array.isArray(buyAccOrder) ? buyAccOrder : [];
        this.deps = deps || {};
        this.pending = null;
        this.lastBuy = 0;
        this.buyDelay = 180;
    }

    _player() {
        return this.deps.getPlayer();
    }

    _store() {
        return this.deps.getStore();
    }

    _send(packetType, action, id, type) {
        this.deps.sendPacket(packetType, action, id, type);
        return true;
    }

    getList(type) {
        const store = this._store();
        if (!store) return [];
        return type === 0 ? (store.hats || []) : (store.accessories || []);
    }

    getOrder(type) {
        return type === 0 ? this.buyHatOrder : this.buyAccOrder;
    }

    typeName(type) {
        return type === 0 ? "hat" : "acc";
    }

    canTryBuy() {
        const now = Date.now();
        if (this.pending && now - this.pending.time < 700) return false;
        if (this.pending && now - this.pending.time >= 700) this.pending = null;
        if (now - this.lastBuy < this.buyDelay) return false;
        return true;
    }

    isOwned(type, id) {
        const player = this._player();
        if (!player) return false;
        return type === 0 ? !!player.skins[id] : !!player.tails[id];
    }

    findItem(type, id) {
        return this.getList(type).find(function (e) { return e.id == id; });
    }

    getNext(type) {
        const order = this.getOrder(type);
        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const item = this.findItem(type, id);
            if (!item) continue;
            if (this.isOwned(type, id)) continue;
            return item;
        }
        return null;
    }

    tryBuyList(order, type) {
        const player = this._player();
        if (!player || !this.canTryBuy()) return false;
        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const item = this.findItem(type, id);
            if (!item) continue;
            if (this.isOwned(type, id)) continue;
            if (player.points < item.price) continue;
            if (!this._send("c", 1, id, type)) return false;
            this.pending = { id, type, name: item.name, price: item.price, time: Date.now() };
            this.lastBuy = Date.now();
            return true;
        }
        return false;
    }

    tick() {
        const player = this._player();
        if (!player) return;
        if (this.pending && this.isOwned(this.pending.type, this.pending.id)) this.pending = null;
        if (this.tryBuyList(this.buyHatOrder, 0)) return;
        this.tryBuyList(this.buyAccOrder, 1);
    }
}

// Legacy combat refs used by Phase 4 classes (strict: expected to be wired every tick).
// nearObjs and traps removed: no longer read by any active code after Phase 25 Traps/Traps_ migration.
let player = null;
let items = null;
let enemy = [];
let near = null;
let objectManager = null;
let configs = _configs;
let config = _config;
let gameObjects = [];
let game = null;
let instaC = null;
let my = null;
let useWasd = false;
let _things = null;
let buyEquip = null;
let selectWeapon = null;
let sendAutoGather = null;
let place = null;
let checkPlace = null;
let canplace = null;
let chat = null;
let stop = null;
let _random = null;
let pingTime = 0;
let io = null;
let importantDirs = null;
let tmpObj = null;
let findObjectBySid = null;
let _origGM_getValue = null;
let _origGM_setValue = null;
let sendUpdate = null;

class AutoBreaker {
    constructor(ctx) {
        this.ctx = ctx || null;
        this.active = false;
        this.aim = 0;
        this.priority = [[], [], [], []];
        this.target = null;
    }
    deactivate() {
        this.active = false;
        this.aim = 0;
        this.target = null;
    }
    objectsHit(aim) {
        if (!Number.isFinite(aim)) return [];
        const ctx = this.ctx;
        let results = [];
        ctx.nearObjs.forEach(e => {
            let dir = UTILS.getDirect(e, ctx.player, 0, 2);
            const weapon = ctx.items.weapons[this.useHammer(e) ? ctx.player.weapons[1] : ctx.player.weapons[0]];
            if (e.active && e.type == null && weapon && Number.isFinite(dir) && UTILS.getDist(ctx.player, e, 2, 0) <= weapon.range + e.scale && UTILS.getAngleDist(dir, aim) <= Math.PI / 2.6) {
                results.push(e);
            }
        });
        return results;
    }
    getFilteredPriority() {
        const ctx = this.ctx;
        return this.priority.map(list =>
            list.filter(obj => {
                if (!obj || !obj.active) return false;
                const weapon = ctx.items.weapons[this.useHammer(obj) ? ctx.player.weapons[1] : ctx.player.weapons[0]];
                const dist = UTILS.getDist(obj, ctx.player, 0, 2);
                const aimv = UTILS.getDirect(obj, ctx.player, 0, 2);
                return !!weapon && Number.isFinite(dist) && Number.isFinite(aimv) && dist <= weapon.range + obj.scale;
            })
        );
    }
    getPriorityTarget() {
        const { player } = this.ctx;
        for (let list of this.priority) {
            if (!Array.isArray(list)) continue;
            const target = list
                .filter(obj => obj && obj.active)
                .sort((a, b) => UTILS.getDist(a, player, 0, 2) - UTILS.getDist(b, player, 0, 2))[0];
            if (target) return target;
        }
        return this.target && this.target.active ? this.target : null;
    }
    calculateAim() {
        const { enemy, near } = this.ctx;
        const filteredPriority = this.getFilteredPriority();
        for (let level = 0; level < filteredPriority.length; level++) {
            const targets = filteredPriority[level];
            if (level == 3 && enemy.length && near && near.dist2 <= 569) {
                this.deactivate();
                return;
            }
            if (targets.length > 0) {
                this.processTargets(targets, level);
                return;
            }
        }
        this.deactivate();
    }
    processTargets(targetObjs, level) {
        const { player, traps, objectManager } = this.ctx;
        targetObjs = targetObjs.filter(obj => obj && obj.active && Number.isFinite(UTILS.getDirect(obj, player, 0, 2)));
        if (!targetObjs.length) {
            this.deactivate();
            return;
        }
        const checkedAims = new Set();
        if (targetObjs.length > 1) {
            let aimAngles = [];
            for (let i = 0; i < targetObjs.length; i++) {
                for (let j = i + 1; j < targetObjs.length; j++) {
                    const adjust = (angle) => angle < 0 ? angle + 2 * Math.PI : angle;
                    let aim1 = UTILS.getDirect(targetObjs[i], player, 0, 2);
                    let aim2 = UTILS.getDirect(targetObjs[j], player, 0, 2);
                    const aAdjusted = adjust(aim1);
                    const bAdjusted = adjust(aim2);
                    let avg = (aAdjusted + bAdjusted) / 2;
                    let diff = Math.abs(aAdjusted - bAdjusted);
                    if (diff > Math.PI) avg += Math.PI;
                    avg = avg % (2 * Math.PI);
                    if (avg > Math.PI) avg -= 2 * Math.PI;
                    let aimBetween = avg;
                    if (!Number.isFinite(aimBetween) || checkedAims.has(aimBetween)) continue;
                    checkedAims.add(aimBetween);
                    const objectsHit = this.objectsHit(aimBetween);
                    let reward = 0;
                    objectsHit.forEach((obj) => {
                        if (obj.isTeamObject(player)) {
                            if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                            else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                            else reward -= level != 3 ? 10 : -50;
                        } else {
                            if (obj.dmg) reward += 70;
                            else if (obj.trap) reward += 60;
                            else reward += 50;
                        }
                    });
                    aimAngles.push({ aim: aimBetween, reward });
                }
            }
            for (let i = 0; i < targetObjs.length; i++) {
                const aimDirect = UTILS.getDirect(targetObjs[i], player, 0, 2);
                if (!Number.isFinite(aimDirect) || checkedAims.has(aimDirect)) continue;
                checkedAims.add(aimDirect);
                const objectsHit = this.objectsHit(aimDirect);
                let reward = 0;
                objectsHit.forEach((obj) => {
                    if (obj.isTeamObject(player)) {
                        if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                        else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                        else reward -= level != 3 ? 10 : -50;
                    } else {
                        if (obj.dmg) reward += 70;
                        else if (obj.trap) reward += 60;
                        else reward += 50;
                    }
                });
                aimAngles.push({ aim: aimDirect, reward });
            }
            const bestAim = aimAngles.filter(a => Number.isFinite(a.aim)).sort((a, b) => b.reward - a.reward)[0];
            if (!bestAim) return this.deactivate();
            this.aim = bestAim.aim;
            this.target = targetObjs.filter(obj => objectManager.canHit(player, obj, player.weapons[0])).sort((a, b) => a.health - b.health)[0] || { health: 9999 };
            this.active = true;
            return;
        }
        const target = targetObjs[0];
        const aimDirect = UTILS.getDirect(targetObjs[0], player, 0, 2);
        if (!Number.isFinite(aimDirect)) return this.deactivate();
        let aimAngles = [];
        let objectsHit = this.objectsHit(aimDirect);
        let reward = 0;
        objectsHit.forEach((obj) => {
            if (obj.isTeamObject(player)) {
                if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                else reward -= level != 3 ? 10 : -50;
            } else reward += 60;
        });
        aimAngles.push({ aim: aimDirect, reward });
        const saferAngles = [Math.PI / 2.6 / 3, Math.PI / 2.6 / 2, Math.PI / 2.6 - 0.1];
        for (let saferAngle of saferAngles) {
            for (let saferAim of [aimDirect - saferAngle, aimDirect + saferAngle]) {
                let oh = this.objectsHit(saferAim);
                let r = 0;
                oh.forEach((obj) => {
                    if (obj.isTeamObject(player)) {
                        if (traps.inTrap && traps.info && obj.sid == traps.info.sid) r -= level != 3 ? 50 : -50;
                        else if (obj.dmg || obj.trap) r -= level != 3 ? 30 : -50;
                        else r -= level != 3 ? 10 : -50;
                    } else r += 60;
                });
                aimAngles.push({ aim: saferAim, reward: r });
            }
        }
        const bestAim = aimAngles.filter(a => Number.isFinite(a.aim)).sort((a, b) => b.reward - a.reward)[0];
        if (!bestAim) return this.deactivate();
        this.aim = bestAim.aim;
        this.target = target;
        this.active = true;
    }
    useHammer(object) {
        const { player, items } = this.ctx;
        if (player.weapons[1] != 10) return false;
        const primaryId = player.weapons[0];
        const primaryDmg = (items.weapons[primaryId] && Number(items.weapons[primaryId].dmg)) || 0;
        if (object && object.trap) return true;
        const spikeInfo = (object && object.dmg) ? object : this.ctx.nearSpikeInfo;
        const spikeHealth = spikeInfo && Number.isFinite(Number(spikeInfo.health)) ? Number(spikeInfo.health) : null;
        if (primaryId == 5) return true;
        if (spikeHealth === null) return true;
        return spikeHealth > primaryDmg;
    }
}

class Traps {
    constructor(UTILS, items, ctx) {
        this.ctx = ctx || null;
        this.dist = 0;
        this.aim = 0;
        this.inTrap = false;
        this.replaced = false;
        this.antiTrapped = false;
        this.info = {};
        this.replaceSids = [];
        this.radObjs = [];
        this.preplaces = [[], []];
        this.nest = { rad: 0, x: 0, y: 0 };
        this.notFast = function () {
            const p = this.ctx.player;
            const it = this.ctx.items;
            return p.weapons[1] == 10 && ((this.info.health > it.weapons[p.weapons[0]].dmg) || p.weapons[0] == 5);
        }
        this.createObj = function (item, direct) {
            const p = this.ctx.player;
            let preObj = {
                id: item.id,
                dir: direct,
                scale: item.scale,
                getScale: function () {
                    return this.scale;
                },
            };
            preObj.x = p.x2 + (p.scale + preObj.scale + (item.placeOffset || 0)) * Math.cos(preObj.dir);
            preObj.y = p.y2 + (p.scale + preObj.scale + (item.placeOffset || 0)) * Math.sin(preObj.dir);
            return preObj;
        };
        this.radCalc = function (obj, direct, item, type) {
            const _ctx = this.ctx;
            let preObj = this.createObj(item, direct);
            let getScale = typeof obj.getScale === "function" ? obj.getScale(0.6, obj.isItem) : obj.scale;
            let dist = UTILS.getDist(obj, preObj, 0, 0);
            let scale = getScale + preObj.scale;
            let angles = [];
            const tooCloseToPreplace = (candidate, group) => {
                return this.preplaces[group].length && this.preplaces[group].some(pos => UTILS.getDist(pos, candidate, 0, 0) < pos.scale + candidate.scale);
            };
            const canUse = (candidate) => {
                if (tooCloseToPreplace(candidate, 1)) return false;
                if (tooCloseToPreplace(candidate, 0)) return false;
                if (candidate.y >= _ctx.config.mapScale / 2 - _ctx.config.riverWidth / 2 && candidate.y <= _ctx.config.mapScale / 2 + _ctx.config.riverWidth / 2) return false;
                return _ctx.objectManager.checkItemLocation(candidate.x, candidate.y, candidate.scale, 0.6, candidate.id, false, _ctx.player);
            };
            if (dist < scale) {
                let calc = Math.acos(Math.min(1, dist / scale));
                let sum = [calc, -calc];
                for (let i = 0; i < sum.length; i++) {
                    let angle = direct + sum[i];
                    preObj = this.createObj(item, angle);
                    if (canUse(preObj)) {
                        angles.push(angle);
                        this.preplaces[1].push(preObj);
                    }
                }
            } else {
                if (type) return [];
                preObj = this.createObj(item, direct);
                if (canUse(preObj)) {
                    angles.push(direct);
                    this.preplaces[1].push(preObj);
                }
            }
            return angles;
        };
        const shouldSpikeTickPlace = (id, target) => {
            if (target === undefined) target = ctx.near;
            if (id !== 2 || !ctx.configs.spikeTick) return false;
            if (!target || !ctx.player || !ctx.items || !ctx.items.weapons) return true;
            const primary = ctx.player.weapons[0];
            const range = (ctx.items.weapons[primary] && ctx.items.weapons[primary].range) || 0;
            const dist = Number.isFinite(target.dist2) ? target.dist2 : UTILS.getDist(target, ctx.player, 0, 2);
            return dist <= range + (ctx.player.scale * 1.8);
        };
        const getKbiSpikePlan = (baseDir, spread = Math.PI / 2, step = Math.PI / 24, allowFallback = false) => {
            if (!ctx.configs.spikeTick || ctx.player.items[2] == undefined || !ctx.near) return null;
            const targetX = ctx.near.x2 || ctx.near.x;
            const targetY = ctx.near.y2 || ctx.near.y;
            if (!Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(baseDir)) return null;

            const offsets = [0];
            for (let off = step; off <= spread; off += step) {
                offsets.push(off, -off);
            }

            let best = null;
            for (let i = 0; i < offsets.length; i++) {
                const dir = baseDir + offsets[i];
                if (!ctx.canplace(2, dir)) continue;

                let dmg = 0, trap = 0, tp = 0;
                if (typeof kbSimulator !== "undefined" && kbSimulator.spikeKB) {
                    try {
                        const seat = this.getItemPlaceLocation(2, dir);
                        const sim = kbSimulator.spikeKB(
                            { x: targetX, y: targetY, scale: 35, tmpObj: ctx.near },
                            { x: seat.x, y: seat.y, scale: 35 },
                            true
                        );
                        const data = (sim && sim.data) || [];
                        for (let j = 0; j < data.length; j++) {
                            if (data[j].id === "spiek") dmg += data[j].dmg || 0;
                            else if (data[j].id === "trap") trap++;
                            else if (data[j].id === "tp") tp++;
                        }
                    } catch (e) {
                        console.error("[NozoSingle:Traps:catch@19584]", e);
                        throw e;
                    }
                }

                const align = 1 - Math.min(Math.PI, Math.abs(UTILS.getAngleDist(dir, baseDir))) / Math.PI;
                const score = (dmg * 4.5) + (trap * 26) - (tp * 22) + (align * 6);
                if (!best || score > best.score) best = { dir, score, dmg, trap, tp };
            }

            if (!best) return null;
            if (best.dmg > 0 || best.trap > 0 || allowFallback || shouldSpikeTickPlace(2)) return best;
            return null;
        };
        const doPlace = (id, dir, render, spikeTick) => {
            const reserve = getSpikeTickReserve();
            if (id == 4) {
                const spikePlan = reserve
                    ? getKbiSpikePlan(Number.isFinite(reserve.dir) ? reserve.dir : dir, Math.PI / 2, Math.PI / 24, true)
                    : getKbiSpikePlan(dir, Math.PI / 3, Math.PI / 24, false);
                if (spikePlan) return doPlace(2, spikePlan.dir, render, true);
                if (reserve) return false;
            } else if (id == 2 && reserve && Number.isFinite(reserve.dir)) {
                dir = reserve.dir;
            }
            ctx.place(id, dir, render, !!spikeTick || shouldSpikeTickPlace(id));
            return true;
        };
        this.testCanPlace = function (id, first = -(Math.PI / 2), repeat = (Math.PI / 2), plus = (Math.PI / 18), radian, replacer, yaboi, spikeTick) {
            const _ctx = this.ctx;
            try {
                let item = _ctx.items.list[_ctx.player.items[id]];
                let tmpS = _ctx.player.scale + item.scale + (item.placeOffset || 0);
                let counts = {
                    attempts: 0,
                    placed: 0
                };
                let tmpObjects = [];
                _ctx.gameObjects.forEach((p) => {
                    tmpObjects.push({
                        x: p.x,
                        y: p.y,
                        active: p.active,
                        blocker: p.blocker,
                        scale: p.scale,
                        isItem: p.isItem,
                        type: p.type,
                        colDiv: p.colDiv,
                        getScale: function (sM, ig) {
                            sM = sM || 1;
                            return this.scale * ((this.isItem || this.type == 2 || this.type == 3 || this.type == 4)
                                ? 1 : (0.6 * sM)) * (ig ? 1 : this.colDiv);
                        },
                    });
                });
                for (let i = first; i < repeat; i += plus) {
                    counts.attempts++;
                    let relAim = radian + i;
                    let tmpX = _ctx.player.x2 + tmpS * Math.cos(relAim);
                    let tmpY = _ctx.player.y2 + tmpS * Math.sin(relAim);
                    let cantPlace = tmpObjects.find((tmp) => tmp.active && UTILS.getDistance(tmpX, tmpY, tmp.x, tmp.y) < item.scale + (tmp.blocker ? tmp.blocker : tmp.getScale(0.6, tmp.isItem)));
                    if (cantPlace) continue;
                    if (item.id != 19 && tmpY >= _ctx.config.mapScale / 2 - _ctx.config.riverWidth / 2 && tmpY <= _ctx.config.mapScale / 2 + _ctx.config.riverWidth / 2) continue;
                    if ((!replacer && yaboi) || _ctx.useWasd) {
                        if (_ctx.useWasd ? false : yaboi.inTrap) {
                            if (UTILS.getAngleDist(_ctx.near.aim2 + Math.PI, relAim + Math.PI) <= Math.PI) {
                                doPlace(2, relAim, 1, spikeTick);
                            } else {
                                _ctx.player.items[4] == 15 && doPlace(4, relAim, 1, spikeTick);
                            }
                        } else {
                            if (UTILS.getAngleDist(_ctx.near.aim2, relAim) <= _ctx.config.gatherAngle / 1.5) {
                                doPlace(2, relAim, 1, spikeTick);
                            } else {
                                _ctx.player.items[4] == 15 && doPlace(4, relAim, 1, spikeTick);
                            }
                        }
                    } else {
                        doPlace(id, relAim, 1, spikeTick || replacer);
                    }
                    tmpObjects.push({
                        x: tmpX,
                        y: tmpY,
                        active: true,
                        blocker: item.blocker,
                        scale: item.scale,
                        isItem: true,
                        type: null,
                        colDiv: item.colDiv,
                        getScale: function () {
                            return this.scale;
                        },
                    });
                    if (UTILS.getAngleDist(_ctx.near.aim2, relAim) <= 1) {
                        counts.placed++;
                    }
                }
                if (counts.placed > 0 && replacer && item.dmg) {
                    if (_ctx.near.dist2 <= _ctx.items.weapons[_ctx.player.weapons[0]].range + (_ctx.player.scale * 1.8) && _ctx.configs.spikeTick) {
                        _ctx.instaC.canSpikeTick = true;
                    }
                }
            } catch (err) {
                console.error("[NozoSingle:Traps:catch@19687]", err);
                throw err;
            }
        };

        this.checkSpikeTick = function () {
            const _ctx = this.ctx;
            try {
                if (![3, 4, 5].includes(_ctx.near.primaryIndex)) return false;
                if ((getEl("safeAntiSpikeTick").checked || _ctx.my.autoPush) ? false : _ctx.near.primaryIndex == undefined ? true : (_ctx.near.reloads[_ctx.near.primaryIndex] > _ctx.game.tickRate)) return false;
                // more range for safe. also testing near.primaryIndex || 5
                if (_ctx.near.dist2 <= _ctx.items.weapons[_ctx.near.primaryIndex || 5].range + (_ctx.near.scale * 1.8)) {
                    let item = _ctx.items.list[9];
                    let tmpS = _ctx.near.scale + item.scale + (item.placeOffset || 0);
                    let danger = 0;
                    let counts = {
                        attempts: 0,
                        block: `unblocked`
                    };
                    for (let i = -1; i <= 1; i += 1 / 10) {
                        counts.attempts++;
                        let relAim = UTILS.getDirect(_ctx.player, _ctx.near, 2, 2) + i;
                        let tmpX = _ctx.near.x2 + tmpS * Math.cos(relAim);
                        let tmpY = _ctx.near.y2 + tmpS * Math.sin(relAim);
                        let cantPlace = _ctx.gameObjects.find((tmp) => tmp.active && UTILS.getDistance(tmpX, tmpY, tmp.x, tmp.y) < item.scale + (tmp.blocker ? tmp.blocker : tmp.getScale(0.6, tmp.isItem)));
                        if (cantPlace) continue;
                        if (tmpY >= _ctx.config.mapScale / 2 - _ctx.config.riverWidth / 2 && tmpY <= _ctx.config.mapScale / 2 + _ctx.config.riverWidth / 2) continue;
                        danger++;
                        counts.block = `blocked`;
                        break;
                    }
                    if (danger) {
                        _ctx.my.anti0Tick = 1;
                        _ctx.player.chat.count = 100000;
                        return true;
                    }
                }
            } catch (err) {
                console.error("[NozoSingle:Traps:catch@19722]", err);
                throw err;
            }
            return false;
        }
        this.protect = function (aim) {
            const _ctx = this.ctx;
            sendChat("");
            if (!_ctx.configs.antiTrap) return;
            if (_ctx.player.items[4]) {
                this.testCanPlace(4, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 18), aim + Math.PI);
                this.antiTrapped = true;
            }
        };
        /*this.autoPlace = function() {
        if (enemy.length && configs.autoPlace && !instaC.ticking) {
            if (game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) === 0) {
                if (gameObjects.length) {
                    let near2 = {
                        inTrap: false,
                    };
                    let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, near, 0, 2) <= (near.scale + e.getScale() + 5)).sort(function(a, b) {
                        return UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2);
                    })[0];
                    if (nearTrap) {
                        near2.inTrap = true;
                    } else {
                        near2.inTrap = false;
                    }
                    if ((near.dist3 <= 450)) {
                        if (near.dist3 <= 200) {
                            this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2, 0, {
                                inTrap: near2.inTrap
                            });
                        } else {
                            player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                        }
                    }
                } else {
                    if ((near.dist3 <= 450)) {
                        player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                    }
                }
            }
        }
    };*/
        function getEnemyVelocity(near) {
            return Math.sqrt(near.xVel * near.xVel + near.yVel * near.yVel);
        }

        function getEnemyDirection(near) {
            return Math.atan2(near.yVel, near.xVel);
        }
        function isPositionValid(position) {
            const playerX = ctx.player.x2;
            const playerY = ctx.player.y2;
            const distToPosition = Math.hypot(position[0] - playerX, position[1] - playerY);
            return distToPosition > 35;
        }
        this.unsafeGameObjects = {
            near: [],
            near350: [],
            spikes: [],
        };

        function n(e) {
            return e && e.isBuffer && e
        }

        function calculatePossibleTrapPositions(x, y, radius) {
            const trapPositions = [];
            const numPositions = 8;
            for (let i = 0; i < numPositions; i++) {
                const angle = (2 * Math.PI * i) / numPositions;
                const offsetX = x + radius * Math.cos(angle);
                const offsetY = y + radius * Math.sin(angle);
                const position = [offsetX, offsetY];
                if (!trapPositions.some((pos) => isPositionTooClose(position, pos))) {
                    trapPositions.push(position);
                }
            }
            return trapPositions;
        }
        function isPositionTooClose(position1, position2, minDistance = 50) {
            const dist = Math.hypot(position1[0] - position2[0], position1[1] - position2[1]);
            return dist < minDistance;
        }

        function dotProduct(vector1, vector2) {
            return vector1.x * vector2.x + vector1.y * vector2.y;
        }

        function magnitude(vector) {
            return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        }

        this.getItemPlaceLocation = function (obj, dir) {
            const p = this.ctx.player;
            const it = this.ctx.items;
            let item = it.list[p.items[obj]];
            let tmpS = p.scale + item.scale + (item.placeOffset || 0);
            let tmpX = p.x2 + tmpS * Math.cos(dir);
            let tmpY = p.y2 + tmpS * Math.sin(dir);
            return {
                x: tmpX,
                y: tmpY
            };
        };
        function vectorDifference(point1, point2) {
            return {
                x: point2.x - point1.x,
                y: point2.y - point1.y
            };
        }
        function calculateAngleUsingDotProduct(point1, point2) {
            let diffVector = vectorDifference(point1, point2);
            let playerDirection = {
                x: Math.cos(ctx.player.dir),
                y: Math.sin(ctx.player.dir)
            };
            let dotProd = dotProduct(playerDirection, diffVector);
            let magnitudeProd = magnitude(playerDirection) * magnitude(diffVector);
            let cosTheta = dotProd / magnitudeProd;
            let dynamicAngle = Math.acos(cosTheta);
            dynamicAngle *= 180 / Math.PI;
            if (dynamicAngle < 0) dynamicAngle += 360;
            return dynamicAngle;
        }
        function caf(e, t) {
            try {
                return Math.atan2((t.y2 || t.y) - (e.y2 || e.y), (t.x2 || t.x) - (e.x2 || e.x));
            } catch (e) {
                console.error("[NozoSingle:Traps:catch@19850]", e);
                throw e;
            }
        }
        function toR(e) {
            var n = (e * Math.PI / 180) % (2 * Math.PI);
            return n > Math.PI ? Math.PI - n : n
        }

        function toD(e) {
            var n = (e / Math.PI * 360) % 360;
            return n >= 360 ? n - 360 : n;
        }
        function calculatePerfectAngle(x1, y1, x2, y2) {
            return Math.atan2(y2 - y1, x2 - x1);
        }
        this.autoPlace = function (type, id, id2, reasonhaha) {
            const _ctx = this.ctx;
            if (arguments.length) {
                if (!_ctx.enemy.length) return false;
                if (!_ctx.configs.autoPlace) return false;
                if (_ctx.instaC.ticking) return false;
                if (_ctx.game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) !== 0) return false;

                let placed = false;
                if (type == 0) {
                    if (id == undefined) return false;
                    let itemId = _ctx.player.items[id];
                    if (itemId == undefined) return false;
                    let item = _ctx.items.list[itemId];
                    let itemId2 = id2 == undefined ? null : _ctx.player.items[id2];
                    let item2 = itemId2 == undefined ? null : _ctx.items.list[itemId2];

                    this.radObjs = _ctx.nearObjs.filter(obj => obj.active && UTILS.getDist(obj, _ctx.player, 0, 2) < 300);
                    if (this.radObjs.length) {
                        for (let i = 0; i < this.radObjs.length; i++) {
                            let obj = this.radObjs[i];
                            let direct = UTILS.getDirect(obj, _ctx.player, 0, 2);
                            let placeAngles = this.radCalc(obj, direct, item);
                            if (placeAngles.length) {
                                for (let j = 0; j < placeAngles.length; j++) {
                                    doPlace(id, placeAngles[j], 1, shouldSpikeTickPlace(id));
                                    placed = true;
                                }
                            } else if (item2) {
                                let placeAngles2 = this.radCalc(obj, direct, item2);
                                for (let j = 0; j < placeAngles2.length; j++) {
                                    doPlace(id2, placeAngles2[j], 1, shouldSpikeTickPlace(id2));
                                    placed = true;
                                }
                            }
                        }
                    } else {
                        for (let i = 0; i < Math.PI * 2; i += Math.PI / 2) {
                            if (_ctx.checkPlace(id, _ctx.near.aim2 + i, shouldSpikeTickPlace(id))) placed = true;
                        }
                    }
                } else if (type == 1) {
                    if (id == undefined) return false;
                    let itemId = _ctx.player.items[id];
                    if (itemId == undefined) return false;
                    let item = _ctx.items.list[itemId];

                    this.nest.rad = 0;
                    this.nest.x = _ctx.near.x2;
                    this.nest.y = _ctx.near.y2;
                    this.radObjs = _ctx.nearObjs.filter(obj => {
                        if ((id == 4 ? obj.dmg : obj.trap) && obj.active) {
                            let dist = UTILS.getDist(obj, _ctx.near, 0, 2);
                            if (dist < 500) {
                                if (this.nest.rad < dist) this.nest.rad = dist;
                                return true;
                            }
                        }
                        return false;
                    });
                    if (this.radObjs.length) {
                        for (let i = 0; i < this.radObjs.length; i++) {
                            let obj = this.radObjs[i];
                            let direct = UTILS.getDirect(obj, _ctx.player, 0, 2);
                            let placeAngles = this.radCalc(obj, direct, item, 1);
                            for (let j = 0; j < placeAngles.length; j++) {
                                doPlace(id, placeAngles[j], 1, shouldSpikeTickPlace(id));
                                placed = true;
                            }
                        }
                    }
                    if (reasonhaha && this.preplaces[1].length < 1) {
                        if (this.autoPlace(1, id2, id, false)) placed = true;
                    }
                }
                return placed;
            }
            let placed
            if (_ctx.enemy.length && _ctx.configs.autoPlace && !_ctx.instaC.ticking) {
                if (_ctx.game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) === 0) {
                    const hasSpike = _ctx.player.items[2] !== undefined && !!_ctx.items.list[_ctx.player.items[2]];
                    const hasTrap = _ctx.player.items[4] == 15 && !!_ctx.items.list[_ctx.player.items[4]];
                    if (!hasSpike && !hasTrap) return false;

                    const dist = _ctx.near.dist2 || UTILS.getDist(_ctx.near, _ctx.player, 0, 2) || 9999;
                    const self = this;
                    const baseAim = Number.isFinite(_ctx.near.aim2) ? _ctx.near.aim2 : calculatePerfectAngle(_ctx.player.x2, _ctx.player.y2, _ctx.near.x2 || _ctx.near.x, _ctx.near.y2 || _ctx.near.y);

                    // Smart spike placement first (bounded, high-quality angles only).
                    if (hasSpike && dist <= 120) {
                        const usedSpikeSeats = [];
                        let spikeCalls = 0;
                        const MAX_SMART_SPIKES = 2//dist <= 120 ? 6 : (dist <= 220 ? 5 : 4);
                        const vel = getEnemyVelocity(_ctx.near) || 0;
                        const eDir = getEnemyDirection(_ctx.near) || baseAim;

                        const getSeat = (ang) => {
                            try {
                                return self.getItemPlaceLocation(2, ang);
                            } catch (e) {
                                console.error("[NozoSingle:Traps:catch@19964]", e);
                                throw e;
                            }
                        };
                        const seatValid = (ang) => {
                            const s = getSeat(ang);
                            if (!s || !isPositionValid([s.x, s.y])) return false;
                            if (s.y >= _ctx.config.mapScale / 2 - _ctx.config.riverWidth / 2 && s.y <= _ctx.config.mapScale / 2 + _ctx.config.riverWidth / 2) return false;
                            for (let i = 0; i < usedSpikeSeats.length; i++) {
                                if (isPositionTooClose([s.x, s.y], [usedSpikeSeats[i].x, usedSpikeSeats[i].y], 26)) return false;
                            }
                            return true;
                        };
                        const kbScore = (ang) => {
                            if (typeof kbSimulator === "undefined" || !kbSimulator.spikeKB) return { dmg: 0, trap: 0, tp: 0 };
                            const seat = getSeat(ang);
                            if (!seat) return { dmg: 0, trap: 0, tp: 0 };
                            try {
                                const sim = kbSimulator.spikeKB(
                                    { x: _ctx.near.x2 || _ctx.near.x, y: _ctx.near.y2 || _ctx.near.y, scale: 35, tmpObj: _ctx.near },
                                    { x: seat.x, y: seat.y, scale: 35 },
                                    true
                                );
                                const data = (sim && sim.data) || [];
                                let dmg = 0, trap = 0, tp = 0;
                                for (let i = 0; i < data.length; i++) {
                                    if (data[i].id === "spiek") dmg += data[i].dmg || 0;
                                    else if (data[i].id === "trap") trap++;
                                    else if (data[i].id === "tp") tp++;
                                }
                                return { dmg, trap, tp };
                            } catch (e) {
                                console.error("[NozoSingle:Traps:catch@19995]", e);
                                throw e;
                            }
                        };
                        const placeSpike = (ang) => {
                            if (spikeCalls >= MAX_SMART_SPIKES) return false;
                            if (!seatValid(ang)) return false;
                            self.testCanPlace(2, 0, 0.000001, 1, ang, 1, null, true);
                            const s = getSeat(ang);
                            if (s) usedSpikeSeats.push({ x: s.x, y: s.y });
                            spikeCalls++;
                            placed = true;
                            return true;
                        };

                        const offsets = [0, Math.PI / 18, -(Math.PI / 18), Math.PI / 12, -(Math.PI / 12), Math.PI / 8, -(Math.PI / 8), Math.PI / 6, -(Math.PI / 6), Math.PI / 4, -(Math.PI / 4)];
                        const candidates = offsets.map((off) => {
                            const ang = baseAim + off;
                            const k = kbScore(ang);
                            const align = 1 - Math.min(Math.PI, Math.abs(UTILS.getAngleDist(ang, baseAim))) / Math.PI;
                            const moveAlign = Math.cos(UTILS.getAngleDist(ang, eDir));
                            const score = (k.dmg * 4.5) + (k.trap * 26) - (k.tp * 22) + (align * 10) + (moveAlign * (vel > 0.2 ? 6 : 3));
                            return { ang, score };
                        }).sort((a, b) => b.score - a.score);

                        for (let i = 0; i < candidates.length && spikeCalls < MAX_SMART_SPIKES; i++) {
                            placeSpike(candidates[i].ang);
                        }
                    }
                    const trappedNow = this.inTrap || (_ctx.traps && _ctx.traps.inTrap);
                    if (trappedNow && _ctx.near.dist2 <= 500) {
                        const baseAim = _ctx.near.aim2;
                        const trappedFan = [0, Math.PI / 9, -(Math.PI / 9), Math.PI / 5, -(Math.PI / 5)];
                        let trappedPlaced = false;

                        for (let i = 0; i < trappedFan.length; i++) {
                            trappedPlaced = _ctx.checkPlace(2, baseAim + trappedFan[i], true) || trappedPlaced;
                        }

                        if (!trappedPlaced && _ctx.player.items[4] == 15) {
                            for (let i = 0; i < trappedFan.length; i++) {
                                trappedPlaced = _ctx.checkPlace(4, baseAim + trappedFan[i]) || trappedPlaced;
                            }
                        }

                        if (trappedPlaced) {
                            placed = true;
                            return placed;
                        }
                    }

                    if (_ctx.gameObjects.length) {
                        let near2 = {
                            inTrap: true,
                        };
                        let nearTrap = _ctx.gameObjects.filter(e => e.trap && e.active && e.isTeamObject(_ctx.player) && UTILS.getDist(e, _ctx.near, 0, 2) <= (_ctx.near.scale + e.getScale() + 5)).sort(function (a, b) {
                            return UTILS.getDist(a, _ctx.near, 0, 2) - UTILS.getDist(b, _ctx.near, 0, 2);
                        })[0];
                        if (nearTrap) {
                            near2.inTrap = true;
                        } else {
                            near2.inTrap = true;
                        }
                        if ((_ctx.near.dist2 <= 375)) {
                            if (_ctx.near.dist2 <= 200) {
                                this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), _ctx.near.aim2, 0, { inTrap: near2.inTrap });
                                placed = true
                            } else {
                                _ctx.player.items[4] == 15 && (this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), _ctx.near.aim2), placed = true);
                            }
                        }
                    } else {
                        if ((_ctx.near.dist2 <= 1000)) {
                            _ctx.player.items[4] == 15 && (this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), _ctx.near.aim2), placed = true);
                        }
                    }
                }
            }
            return placed
        };
        this.autoReplace = function (sidList) {
            const _ctx = this.ctx;
            if (!_ctx.enemy.length) return false;
            if (_ctx.near.dist2 > 300) return false;
            if (!_ctx.configs.autoReplace) return false;
            if (getEl("weaponGrind")?.checked) return false;

            let placed = false;
            for (let i = 0; i < sidList.length; i++) {
                let sid = sidList[i];
                let building = _ctx.findObjectBySid(sid);
                if (!building) continue;
                let breakDist = UTILS.getDist(building, _ctx.player, 0, 2);
                if (breakDist > 300) continue;
                let breakDir = UTILS.getDirect(building, _ctx.player, 0, 2);

                let nearEnemyTrap = _ctx.gameObjects.find(t => t.trap && t.active && t.isTeamObject(_ctx.player) && UTILS.getDist(t, _ctx.near, 0, 2) <= (_ctx.near.scale + t.getScale() + 5));
                if (nearEnemyTrap && _ctx.near.dist2 <= 150 && UTILS.getDist(building, nearEnemyTrap, 0, 0) <= 169) {
                    const spikePlan = getKbiSpikePlan(_ctx.near.aim2, Math.PI / 2, Math.PI / 32, true);
                    this.testCanPlace(2, 0, 0.000001, 1, spikePlan ? spikePlan.dir : _ctx.near.aim2, 1, 1, true);
                    placed = true;
                    break;
                }

                let danger = this.checkSpikeTick();
                const spikePlan = getKbiSpikePlan(breakDir, Math.PI * 2, Math.PI / 24, !danger);
                if (!danger && spikePlan && _ctx.near.dist2 <= _ctx.items.weapons[_ctx.near.primaryIndex || 5].range + (_ctx.near.scale * 1.8)) {
                    this.testCanPlace(2, 0, 0.000001, 1, spikePlan.dir, 1, null, true);
                    placed = true;
                } else {
                    _ctx.player.items[4] == 15 && !getSpikeTickReserve() && this.testCanPlace(4, 0, Math.PI * 2, Math.PI / 3, breakDir, 1);
                    placed = true;
                }
                break;
            }
            return placed;
        };
        this.replacer = function (findObj) {
            const _ctx = this.ctx;
            if (!findObj || !_ctx.configs.autoReplace) return;
            if (!_ctx.inGame) return;
            if (this.antiTrapped) return;
            _ctx.game.tickBase(() => {
                let objAim = UTILS.getDirect(findObj, _ctx.player, 0, 2);
                let objDst = UTILS.getDist(findObj, _ctx.player, 0, 2);
                if (getEl("weaponGrind").checked && objDst <= _ctx.items.weapons[_ctx.player.weaponIndex].range + _ctx.player.scale) return;
                if (objDst <= 400 && _ctx.near.dist2 <= 400) {
                    let danger = this.checkSpikeTick();
                    const spikePlan = getKbiSpikePlan(objAim, Math.PI * 2, Math.PI / 24, !danger);
                    if (!danger && spikePlan && _ctx.near.dist2 <= _ctx.items.weapons[_ctx.near.primaryIndex || 5].range + (_ctx.near.scale * 1.8)) {
                        //this.testCanPlace(2, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 18), objAim, 1);
                        this.testCanPlace(2, 0, 0.000001, 1, spikePlan.dir, 1, null, true);
                    } else {
                        _ctx.player.items[4] == 15 && !getSpikeTickReserve() && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), objAim, 1);
                    }
                    this.replaced = true;
                }
            }, 1);
        };
    }
}

class Traps_ {
    constructor(UTILS, items, ctx) {
        this.ctx = ctx || null;
        this.dist = 0;
        this.aim = 0;
        this.inTrap = false;
        this.replaced = false;
        this.antiTrapped = false;
        this.info = {};
        this.replaceSids = [];
        this.radObjs = [];
        this.preplaces = [[], []];
        this.nest = { rad: 0, x: 0, y: 0 };
        this.notFast = function () {
            const p = this.ctx.player;
            const it = this.ctx.items;
            return p.weapons[1] == 10 && ((this.info.health > it.weapons[p.weapons[0]].dmg) || p.weapons[0] == 5);
        }
        this.createObj = function (item, direct) {
            const p = this.ctx.player;
            let preObj = {
                id: item.id,
                dir: direct,
                scale: item.scale,
            };
            preObj.x = p.x2 + (p.scale + preObj.scale + (item.placeOffset || 0)) * Math.cos(preObj.dir);
            preObj.y = p.y2 + (p.scale + preObj.scale + (item.placeOffset || 0)) * Math.sin(preObj.dir);
            return preObj;
        };
        this.radCalc = function (obj, direct, item, type) {
            const _ctx = this.ctx;
            let preObj = this.createObj(item, direct);
            let getScale = obj.getScale(0.6, obj.isItem);
            let dist = UTILS.getDist(obj, preObj, 0, 0);
            let scale = getScale + preObj.scale;
            let angles = [];
            if (dist < scale) {
                let calc = Math.acos(Math.min(1, dist / scale));
                let sum = [calc, -calc];
                for (let i = 0; i < sum.length; i++) {
                    let angle = direct + sum[i];
                    preObj = this.createObj(item, angle);
                    let nears = this.preplaces[1].length ? this.preplaces[1].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                    if (nears) continue;
                    let renears = this.preplaces[0].length ? this.preplaces[0].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                    if (renears) continue;
                    let canPlace = _ctx.objectManager.checkItemLocation(preObj.x, preObj.y, preObj.scale, 0.6, preObj.id, false);
                    if (canPlace) {
                        angles.push(angle);
                        this.preplaces[1].push(preObj);
                    }
                }
            } else {
                if (type) return [];
                preObj = this.createObj(item, direct);
                let nears = this.preplaces[1].length ? this.preplaces[1].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                if (nears) return [];
                let renears = this.preplaces[0].length ? this.preplaces[0].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                if (renears) return [];
                let canPlace = _ctx.objectManager.checkItemLocation(preObj.x, preObj.y, preObj.scale, 0.6, preObj.id, false);
                if (canPlace) {
                    angles.push(direct);
                    this.preplaces[1].push(preObj);
                }
            }
            return angles;
        };
        this.testCanPlace = function (id, first = -(Math.PI / 2), repeat = (Math.PI / 2), plus = (Math.PI / 18), radian, replacer, yaboi) {
            const _ctx = this.ctx;
            try {
                let item = _ctx.items.list[_ctx.player.items[id]];
                let tmpS = _ctx.player.scale + item.scale + (item.placeOffset || 0);
                let counts = {
                    attempts: 0,
                    placed: 0
                };
                const offsets = [];
                const step = Math.abs(plus) || (Math.PI / 18);
                const spanStart = Math.min(first, repeat);
                const spanEnd = Math.max(first, repeat);
                const spanSize = spanEnd - spanStart;
                const isSymmetricFan = spanStart < 0 && spanEnd > 0;
                const isFullCircleFan = Math.abs(spanStart) < 1e-6 && Math.abs(spanEnd - (Math.PI * 2)) < (step * 1.5);

                if (isFullCircleFan) {
                    offsets.push(0);
                    for (let n = 1; n * step <= Math.PI + 1e-6; n++) {
                        offsets.push(n * step, -(n * step));
                    }
                } else if (isSymmetricFan) {
                    offsets.push(0);
                    for (let n = 1; n * step <= Math.max(Math.abs(spanStart), Math.abs(spanEnd)) + 1e-6; n++) {
                        const off = n * step;
                        if (off <= spanEnd + 1e-6) offsets.push(off);
                        if (-off >= spanStart - 1e-6) offsets.push(-off);
                    }
                } else {
                    for (let i = spanStart; i < spanEnd; i += step) {
                        offsets.push(i);
                    }
                }

                for (let oi = 0; oi < offsets.length; oi++) {
                    const i = offsets[oi];
                    counts.attempts++;
                    let relAim = radian + i;
                    let tmpX = _ctx.player.x2 + tmpS * Math.cos(relAim);
                    let tmpY = _ctx.player.y2 + tmpS * Math.sin(relAim);
                    if (!_ctx.objectManager.checkItemLocation(tmpX, tmpY, item.scale, 0.6, item.id, false, _ctx.player)) continue;
                    if (item.id != 19 && tmpY >= _ctx.config.mapScale / 2 - _ctx.config.riverWidth / 2 && tmpY <= _ctx.config.mapScale / 2 + _ctx.config.riverWidth / 2) continue;
                    if ((!replacer && yaboi) || _ctx.useWasd) {
                        if (_ctx.useWasd ? false : yaboi.inTrap) {
                            if (UTILS.getAngleDist(_ctx.near.aim2 + Math.PI, relAim + Math.PI) <= Math.PI) {
                                _ctx.place(2, relAim, 1);
                            } else {
                                _ctx.player.items[4] == 15 && _ctx.place(4, relAim, 1);
                            }
                        } else {
                            if (UTILS.getAngleDist(_ctx.near.aim2, relAim) <= _ctx.config.gatherAngle / 1.5) {
                                _ctx.place(2, relAim, 1);
                            } else {
                                _ctx.player.items[4] == 15 && _ctx.place(4, relAim, 1);
                            }
                        }
                    } else {
                        _ctx.place(id, relAim, 1);
                    }
                    tmpObjects.push({
                        x: tmpX,
                        y: tmpY,
                        active: true,
                        blocker: item.blocker,
                        scale: item.scale,
                        isItem: true,
                        type: null,
                        colDiv: item.colDiv,
                        getScale: function () {
                            return this.scale;
                        },
                    });
                    if (UTILS.getAngleDist(_ctx.near.aim2, relAim) <= 1) {
                        counts.placed++;
                    }
                }
                if (counts.placed > 0 && replacer && item.dmg) {
                    if (_ctx.near.dist2 <= _ctx.items.weapons[_ctx.player.weapons[0]].range + (_ctx.player.scale * 1.8) && _ctx.configs.spikeTick) {
                        _ctx.instaC.canSpikeTick = true;
                    }
                }
            } catch (err) {
                console.error("[NozoSingle:Traps_:catch@20456]", err);
                throw err;
            }
        };

        this.checkSpikeTick = function () {
            const _ctx = this.ctx;
            let noOfSpikes = 0;
            let dontForceSoldier = false;
            if (!getEl("safeAntiSpikeTick")?.checked || !_ctx.enemy.length) return false;
            if (_ctx.near.dist2 <= 175) {
                if (_ctx.traps.inTrap && _ctx.traps.info && _ctx.traps.info.health <= _ctx.items.weapons[_ctx.player.weapons[0]].dmg * 3.3 * _ctx.config.weaponVariants[_ctx.player.primaryVariant].val * (_ctx.items.weapons[_ctx.player.weapons[0]].sDmg || 1)) {
                    noOfSpikes++;
                    dontForceSoldier = true;
                    _ctx.my.bullTick = false;
                } else {
                    _ctx.my.bullTick = true;
                }
                if (!_ctx.traps.inTrap) {
                    if (_ctx.near.reloads[_ctx.near.primaryIndex] <= _ctx.game.tickRate) {
                        let spikeSet = new Set();
                        for (let tmp of _ctx.gameObjects) {
                            if ((tmp.dmg && tmp.active && !tmp.isTeamObject(_ctx.player)) || (tmp.type == 1 && tmp.y >= 12000)) {
                                let nea = Math.atan2(_ctx.player.y2 - _ctx.near.y2, _ctx.player.x2 - _ctx.near.x2);
                                let primaryKB = (_ctx.items.weapons[_ctx.near.weapons[0]].knock || 0) * _ctx.items.weapons[_ctx.near.weapons[0]].range + _ctx.player.scale * 2;
                                let secondaryKB = ![undefined, 9, 12, 13, 15].includes(_ctx.near.weapons[1]) ? (_ctx.items.weapons[_ctx.near.weapons[1]].knock || 0) * _ctx.items.weapons[_ctx.near.weapons[1]].range + _ctx.player.scale * 2 : 60;
                                let turretKB = 69;
                                let totalKB = primaryKB + secondaryKB + turretKB;
                                let steps = 13;
                                let stepKB = totalKB / steps;
                                let skipDistance = 40;
                                for (let i = 1; i <= steps; i++) {
                                    let traveledDist = stepKB * i;
                                    if (traveledDist < skipDistance) continue;
                                    let stepX = _ctx.player.x2 + (stepKB * i) * Math.cos(nea);
                                    let stepY = _ctx.player.y2 + (stepKB * i) * Math.sin(nea);
                                    let distToSpike = UTILS.getDist({ x: stepX, y: stepY }, tmp, 0, 0);
                                    if (distToSpike <= (tmp.scale + _ctx.player.scale * 1.5)) {
                                        if (!spikeSet.has(tmp.sid)) spikeSet.add(tmp.sid);
                                    }
                                }
                            }
                        }
                        noOfSpikes += spikeSet.size;
                        if (![3, 4, 5].includes(_ctx.near.primaryIndex)) dontForceSoldier = true;
                    }
                }
            }
            return [noOfSpikes, dontForceSoldier];
        };
        this.protect = function (aim) {
            const _ctx = this.ctx;
            sendChat("");
            if (!_ctx.configs.antiTrap) return;
            this.testCanPlace(4, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 5), aim + Math.PI);
            this.testCanPlace(2, -(Math.PI / 3), (Math.PI / 3), (Math.PI / 3), aim + Math.PI);
            this.antiTrapped = true;
        };
        /*this.autoPlace = function() {
        if (enemy.length && configs.autoPlace && !instaC.ticking) {
            if (game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick")?.value)) || 1) === 0) {
                if (gameObjects.length) {
                    let near2 = {
                        inTrap: false,
                    };
                    let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, near, 0, 2) <= (near.scale + e.getScale() + 5)).sort(function(a, b) {
                        return UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2);
                    })[0];
                    if (nearTrap) {
                        near2.inTrap = true;
                    } else {
                        near2.inTrap = false;
                    }
                    if ((near.dist3 <= 450)) {
                        if (near.dist3 <= 200) {
                            this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2, 0, {
                                inTrap: near2.inTrap
                            });
                        } else {
                            player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                        }
                    }
                } else {
                    if ((near.dist3 <= 450)) {
                        player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                    }
                }
            }
        }
    };*/
        function getEnemyVelocity(near) {
            return Math.sqrt(near.xVel * near.xVel + near.yVel * near.yVel);
        }

        function getEnemyDirection(near) {
            return Math.atan2(near.yVel, near.xVel);
        }
        function isPositionValid(position) {
            const playerX = ctx.player.x2;
            const playerY = ctx.player.y2;
            const distToPosition = Math.hypot(position[0] - playerX, position[1] - playerY);
            return distToPosition > 35;
        }
        this.unsafeGameObjects = {
            near: [],
            near350: [],
            spikes: [],
        };

        function n(e) {
            return e && e.isBuffer && e
        }

        function calculatePossibleTrapPositions(x, y, radius) {
            const trapPositions = [];
            const numPositions = 8;
            for (let i = 0; i < numPositions; i++) {
                const angle = (2 * Math.PI * i) / numPositions;
                const offsetX = x + radius * Math.cos(angle);
                const offsetY = y + radius * Math.sin(angle);
                const position = [offsetX, offsetY];
                if (!trapPositions.some((pos) => isPositionTooClose(position, pos))) {
                    trapPositions.push(position);
                }
            }
            return trapPositions;
        }
        function isPositionTooClose(position1, position2, minDistance = 50) {
            const dist = Math.hypot(position1[0] - position2[0], position1[1] - position2[1]);
            return dist < minDistance;
        }

        function dotProduct(vector1, vector2) {
            return vector1.x * vector2.x + vector1.y * vector2.y;
        }

        function magnitude(vector) {
            return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        }

        this.getItemPlaceLocation = function (obj, dir) {
            const p = this.ctx.player;
            const it = this.ctx.items;
            let item = it.list[p.items[obj]];
            let tmpS = p.scale + item.scale + (item.placeOffset || 0);
            let tmpX = p.x + tmpS * Math.cos(dir);
            let tmpY = p.y + tmpS * Math.sin(dir);
            return {
                x: tmpX,
                y: tmpY
            };
        };
        function vectorDifference(point1, point2) {
            return {
                x: point2.x - point1.x,
                y: point2.y - point1.y
            };
        }
        function calculateAngleUsingDotProduct(point1, point2) {
            let diffVector = vectorDifference(point1, point2);
            let playerDirection = {
                x: Math.cos(ctx.player.dir),
                y: Math.sin(ctx.player.dir)
            };
            let dotProd = dotProduct(playerDirection, diffVector);
            let magnitudeProd = magnitude(playerDirection) * magnitude(diffVector);
            let cosTheta = dotProd / magnitudeProd;
            let dynamicAngle = Math.acos(cosTheta);
            dynamicAngle *= 180 / Math.PI;
            if (dynamicAngle < 0) dynamicAngle += 360;
            return dynamicAngle;
        }
        function caf(e, t) {
            try {
                return Math.atan2((t.y2 || t.y) - (e.y2 || e.y), (t.x2 || t.x) - (e.x2 || e.x));
            } catch (e) {
                console.error("[NozoSingle:Traps_:catch@20626]", e);
                throw e;
            }
        }
        function toR(e) {
            var n = (e * Math.PI / 180) % (2 * Math.PI);
            return n > Math.PI ? Math.PI - n : n
        }

        function toD(e) {
            var n = (e / Math.PI * 360) % 360;
            return n >= 360 ? n - 360 : n;
        }
        function calculatePerfectAngle(x1, y1, x2, y2) {
            return Math.atan2(y2 - y1, x2 - x1);
        }
        this.autoPlace = function (type, id, id2, reasonhaha) {
            const _ctx = this.ctx;
            if (!_ctx.enemy.length) return false;
            if (!_ctx.configs.autoPlace) return false;
            if (_ctx.instaC.ticking) return false;
            if (_ctx.game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick")?.value)) || 1) !== 0) return false;

            let placed = false;

            if (type == 0) {
                if (id == undefined) return false;
                let itemId = _ctx.player.items[id];
                if (itemId == undefined) return false;
                let item = _ctx.items.list[itemId];
                let itemId2 = id2 == undefined ? null : _ctx.player.items[id2];
                let item2 = itemId2 == undefined ? null : _ctx.items.list[itemId2];

                this.radObjs = _ctx.nearObjs.filter(obj => obj.active && UTILS.getDist(obj, _ctx.player, 0, 2) < 300);

                console.log("[autoPlace:type0] radObjs:", this.radObjs.length, {
                    id,
                    id2,
                    itemId,
                    itemId2,
                    nearDist: _ctx.near.dist2,
                    nearAim: _ctx.near.aim2,
                    reasonhaha,
                    radObjs: this.radObjs
                });

                if (this.radObjs.length) {
                    for (let i = 0; i < this.radObjs.length; i++) {
                        let obj = this.radObjs[i];
                        let direct = UTILS.getDirect(obj, _ctx.player, 0, 2);
                        let placeAngles = this.radCalc(obj, direct, item);

                        console.log("[autoPlace:type0] obj result:", {
                            obj,
                            direct,
                            placeAngles,
                            itemId
                        });

                        if (placeAngles.length) {
                            for (let j = 0; j < placeAngles.length; j++) {
                                _ctx.place(id, placeAngles[j]);
                                placed = true;

                                console.log("[autoPlace:type0] placed primary:", {
                                    id,
                                    angle: placeAngles[j]
                                });
                            }
                        } else if (item2) {
                            let direct2 = UTILS.getDirect(obj, _ctx.player, 0, 2);
                            let placeAngles2 = this.radCalc(obj, direct2, item2);

                            console.log("[autoPlace:type0] trying secondary:", {
                                id2,
                                itemId2,
                                direct2,
                                placeAngles2
                            });

                            for (let j = 0; j < placeAngles2.length; j++) {
                                _ctx.place(id2, placeAngles2[j]);
                                placed = true;

                                console.log("[autoPlace:type0] placed secondary:", {
                                    id2,
                                    angle: placeAngles2[j]
                                });
                            }
                        }
                    }
                } else {
                    console.log("[autoPlace:type0] no radObjs, using checkPlace fallback");

                    for (let i = 0; i < Math.PI * 2; i += Math.PI / 2) {
                        let angle = _ctx.near.aim2 + i;
                        let didPlace = _ctx.checkPlace(id, angle);

                        console.log("[autoPlace:type0] fallback checkPlace:", {
                            id,
                            angle,
                            didPlace
                        });

                        if (didPlace) placed = true;
                    }
                }
            } else if (type == 1) {
                if (id == undefined) return false;
                let itemId = _ctx.player.items[id];
                if (itemId == undefined) return false;
                let item = _ctx.items.list[itemId];

                this.nest.rad = 0;
                this.nest.x = _ctx.near.x2;
                this.nest.y = _ctx.near.y2;

                this.radObjs = _ctx.nearObjs.filter(obj => {
                    if ((id == 4 ? obj.dmg : obj.trap) && obj.active) {
                        let dist = UTILS.getDist(obj, _ctx.near, 0, 2);
                        if (dist < 500) {
                            if (this.nest.rad < dist) this.nest.rad = dist;
                            return true;
                        }
                    }
                    return false;
                });

                console.log("[autoPlace:type1] radObjs:", this.radObjs.length, {
                    id,
                    id2,
                    itemId,
                    nearDist: _ctx.near.dist2,
                    nearAim: _ctx.near.aim2,
                    nearPos: {
                        x: _ctx.near.x2,
                        y: _ctx.near.y2
                    },
                    nest: this.nest,
                    reasonhaha,
                    preplaces0: this.preplaces[0].length,
                    preplaces1: this.preplaces[1].length,
                    radObjs: this.radObjs
                });

                if (this.radObjs.length) {
                    for (let i = 0; i < this.radObjs.length; i++) {
                        let obj = this.radObjs[i];
                        let direct = UTILS.getDirect(obj, _ctx.player, 0, 2);
                        let placeAngles = this.radCalc(obj, direct, item, 1);

                        console.log("[autoPlace:type1] obj result:", {
                            obj,
                            direct,
                            placeAngles,
                            itemId
                        });

                        for (let j = 0; j < placeAngles.length; j++) {
                            _ctx.place(id, placeAngles[j]);
                            placed = true;

                            console.log("[autoPlace:type1] placed:", {
                                id,
                                angle: placeAngles[j]
                            });
                        }
                    }
                } else {
                    console.log("[autoPlace:type1] no radObjs found", {
                        id,
                        id2,
                        itemId,
                        nearObjsLength: _ctx.nearObjs.length,
                        reasonhaha
                    });
                }

                if (reasonhaha && this.preplaces[1].length < 1) {
                    console.log("[autoPlace:type1] fallback recursion triggered:", {
                        fromId: id,
                        toId: id2
                    });

                    if (this.autoPlace(1, id2, id, false)) placed = true;
                }
            }

            console.log("[autoPlace:end]", {
                type,
                id,
                id2,
                placed
            });

            return placed;
        };
        this.autoReplace = function (sidList) {
            const _ctx = this.ctx;
            if (!_ctx.enemy.length) return;
            if (_ctx.near.dist2 > 300) return;
            if (!_ctx.configs.autoReplace) return;
            if (getEl("weaponGrind")?.checked) return;

            for (let i = 0; i < sidList.length; i++) {
                let sid = sidList[i];
                let building = _ctx.findObjectBySid(sid);
                if (!building) continue;
                let breakDist = UTILS.getDist(building, _ctx.player, 0, 2);
                if (breakDist > 300) continue;
                let breakDir = UTILS.getDirect(building, _ctx.player, 0, 2);

                // enemy in nearby trap → dense spike sweep
                let nearEnemyTrap = _ctx.gameObjects.find(t => t.trap && t.active && t.isTeamObject(_ctx.player) && UTILS.getDist(t, _ctx.near, 0, 2) <= (_ctx.near.scale + t.getScale() + 5));
                if (nearEnemyTrap && _ctx.near.dist2 <= 150 && UTILS.getDist(building, nearEnemyTrap, 0, 0) <= 169) {
                    this.testCanPlace(2, _ctx.near.aim2 - Math.PI / 2, _ctx.near.aim2 + Math.PI / 2 + 0.0001, Math.PI / 32, _ctx.near.aim2, 1, 1);
                    break;
                }

                // default: trap fan around broken building direction
                this.testCanPlace(4, 0, Math.PI * 2, Math.PI / 3, breakDir, 1);
                break;
            }
        };
    }
}

class Instakill {
    constructor() {
        this.wait = false;
        this.can = false;
        this.isTrue = false;
        this.nobull = false;
        this.ticking = false;
        this.canSpikeTick = false;
        this.startTick = false;
        this.readyTick = false;
        this.canCounter = false;
        this.revTick = false;
        this.syncHit = true;
        this.age1insta = false;
        this.hammerCounterType = function () {
            this.isTrue = true;
            my.autoAim = true;
            if (near.dist2 <= 70 && configs.secondaryOnCounter) {
                buyEquip(19, 1);
                selectWeapon(player.weapons[1]);
                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                    buyEquip(53, 0)
                    buyEquip(18, 1);
                } else {
                    buyEquip(7, 0)
                    buyEquip(18, 1);
                }
                sendAutoGather();
                game.tickBase(() => {
                    buyEquip(18, 1);
                    buyEquip(7, 0)
                    selectWeapon(player.weapons[0])
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                }, 1);
            } else {
                buyEquip(18, 1);
                selectWeapon(player.weapons[0])
                buyEquip(7, 0)
                sendAutoGather()
                game.tickBase(() => {
                    if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                        buyEquip(53, 0)
                    }
                    game.tickBase(() => {
                        sendAutoGather()
                        this.isTrue = false
                        my.autoAim = false
                    }, 1)
                }, 1)
            }
        };
        function getBaseDamages() {
            const pW = _things.items.weapons[_things.player.primaryIndex];
            const sW = _things.items.weapons[_things.player.secondaryIndex];
            const pVar = config.weaponVariants[_things.player.primaryVariant].val;
            const sVar = config.weaponVariants[_things.player.secondaryVariant].val;

            const pBase = pW.dmg * pVar * (pW.sDmg || 1);
            const sBase = sW.dmg * sVar * (sW.sDmg || 1); // important: sW.sDmg
            return { pBase, sBase };
        }

        /**
* Primary is ALWAYS no-tank (one swing max).
* Secondary can swing multiple times.
* sMult = 1 (no tank) or 3.3 (tank)
*/
        function planTickPrimaryNoTank(hp, sMult = 1) {
            const { pBase, sBase } = getBaseDamages();
            const pDmg = pBase;                   // primary no tank
            const sDmg = sBase * sMult;           // secondary w/ chosen mult
            const EPS = 1e-6;                     // avoid float jank

            // Primary alone: must be STRICTLY greater
            if (hp < pDmg) {
                return { can: true, secondarySwings: 0, primarySwings: 1, totalSwings: 1, afterS: hp, overkill: pDmg - hp, sequence: "P" };
            }
            if (sDmg <= 0) {
                return { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS: hp, overkill: 0, sequence: "Ã¢â‚¬â€" };
            }

            // need N such that hp - N*sDmg < pDmg  Ã¢â€¡â€™  N > (hp - pDmg)/sDmg
            const N = Math.max(0, Math.ceil((hp - pDmg + EPS) / sDmg));  // +EPS ensures equality does NOT pass
            const afterS = hp - N * sDmg;

            if (afterS < pDmg) {
                return {
                    can: true,
                    secondarySwings: N,
                    primarySwings: 1,
                    totalSwings: N + 1,
                    afterS,
                    overkill: pDmg - Math.max(0, afterS),
                    sequence: N > 0 ? `Sx${N}+P` : "P"
                };
            }

            return { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS, overkill: 0, sequence: "Ã¢â‚¬â€" };
        }


        // Convenience wrappers:
        const TANK = 3.3;
        function planNoTankSecondary(hp) { return planTickPrimaryNoTank(hp, 1); }
        function planTankSecondary(hp) { return planTickPrimaryNoTank(hp, TANK); }
        // expects: planNoTankSecondary(hp), planTankSecondary(hp)
        // notes:
        //   - primary swings at most once (no tank)
        //   - secondary may swing once (reload rule). If >1 required => abort.
        //   - bypass: run a test swing sequence even if no target/too far

        this.hammerInsta = function ({ bypass = false, hp_ = 50 } = {}) {
            const closestEnemy = _things.enemy.enemy;
            if (!bypass && !closestEnemy) return "no insta: no enemy";

            const sharedInfo = _things.info && _things.info.hammer ? _things.info.hammer : null;
            let trap = (sharedInfo && sharedInfo.trap) || _things.nearTrap || _things.trapFound;
            if (!trap && !bypass && closestEnemy) {
                trap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, closestEnemy, 0, 2) <= (closestEnemy.scale + e.getScale() + 5)).sort((a, b) => UTILS.getDist(a, closestEnemy, 0, 2) - UTILS.getDist(b, closestEnemy, 0, 2))[0];
                if (!trap) return "no : no trap";
                _things.nearTrap = trap;
            }

            if (!bypass && trap) {
                const isCloseByScan = sharedInfo && sharedInfo.trap === trap
                    ? !!sharedInfo.inCloseRange
                    : null;
                if (isCloseByScan === false) return "no : too far";
                if (isCloseByScan === null) {
                    const trapScale = (typeof trap.getScale === "function" ? trap.getScale() : trap.scale) || 0;
                    const closeD = trapScale + ((player.scale ?? 35) / 2);
                    if (UTILS.getDist(player, trap, 2, 0) >= closeD) return "no : too far";
                }
            }

            const secReady = sharedInfo ? !!sharedInfo.secondaryReady : player.reloads[player.weapons[1]] <= pingTime;
            const priReady = sharedInfo ? !!sharedInfo.primaryReady : player.reloads[player.weapons[0]] <= pingTime;
            if (!secReady || !priReady) return "abort: reload";

            const hp = bypass ? hp_ : Number(trap?.health ?? hp_);
            const { sBase } = getBaseDamages();
            const canOneShotTrapNoTank = Number.isFinite(hp) && hp <= sBase;
            const dirToTrapEnemyIsIn = sharedInfo && Number.isFinite(sharedInfo.dirToTrapEnemyIsIn)
                ? sharedInfo.dirToTrapEnemyIsIn
                : (Number.isFinite(closestEnemy?.aim2)
                    ? closestEnemy.aim2
                    : (closestEnemy ? UTILS.getDirect(closestEnemy, player, 0, 2) : player.dir || 0));

            this.hammer = true;
            this.isTicking = true;
            this.wait = true;
            this.isTrue = true;
            my.autoAim = true;

            const finish = () => {
                sendAutoGather();
                this.hammer = false;
                this.isTrue = false;
                my.autoAim = false;
                this.isTicking = false;
                this.wait = false;
            };

            if (canOneShotTrapNoTank) {
                // Tick 1: 53 with secondary
                buyEquip(53, 0);
                selectWeapon(player.weapons[1]);
                sendAutoGather();
                // Tick 2: bull with primary and spike place
                game.tickBase(() => {
                    buyEquip(7, 0);
                    selectWeapon(player.weapons[0]);
                    checkPlace(1, dirToTrapEnemyIsIn);
                    game.tickBase(() => {
                        finish();
                    }, 1);
                }, 1);
                return "insta: 53->7";
            }

            // Not one-shot without tank: 40 -> 7 -> 53
            buyEquip(40, 0);
            selectWeapon(player.weapons[1]);
            sendAutoGather();
            game.tickBase(() => {
                buyEquip(7, 0);
                selectWeapon(player.weapons[0]);
                checkPlace(1, dirToTrapEnemyIsIn);
                game.tickBase(() => {
                    buyEquip(53, 0);
                    finish();
                }, 1);
            }, 1);
            return "insta: 40->7->53";
        };

        this.hammerInsta2 = function (rev = true, bypass) {
            rev = true
            let closestEnemy = _things.enemy.enemy
            const sharedInfo = _things.info && _things.info.hammer ? _things.info.hammer : null;
            if (!closestEnemy) return "no insta3"
            //maxdmg useless
            let maxdmg = (_things.items.weapons[_things.player.primaryIndex].dmg *
                config.weaponVariants[_things.player.primaryVariant].val * 1.5) + ((_things.items.weapons[_things.player.secondaryIndex].dmg *
                    config.weaponVariants[_things.player.secondaryVariant].val * 1.5)) + 25
            let canSpike = false
            if (!_things.nearTrap && sharedInfo && sharedInfo.trap) {
                _things.nearTrap = sharedInfo.trap;
            }
            if (!_things.nearTrap) {
                let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, closestEnemy, 0, 2) <= (closestEnemy.scale + e.getScale() + 5)).sort(function (a, b) {
                    return UTILS.getDist(a, closestEnemy, 0, 2) - UTILS.getDist(b, closestEnemy, 0, 2);
                })[0];
                if (!nearTrap) return "noInsta2"
                _things.nearTrap = nearTrap
            }
            canSpike = canplace(2, player.dir, _things.nearTrap)
            let closeD = 120
            let isClose = (sharedInfo && sharedInfo.trap === _things.nearTrap)
                ? !!sharedInfo.inCloseRange
                : (UTILS.getDist(player, _things.nearTrap, 2, 0) < closeD)
            let canTest = _things.player.skins[40] ? planTankSecondary(_things.nearTrap.health) : planNoTankSecondary(_things.nearTrap.health)
            let order = rev ? [1, 0] : [0, 1]
            if (!isClose) {
                //sendChat('tooFar? dist:'+UTILS.getDist(player,_things.nearTrap,2,0).toString() +' Fix it now!')
            }
            _things.nearTrap = null;
            if (!isClose) return "no Insta1"
            let hasTank = _things.player.skins[40]
            if (canTest.secondarySwings == 0) {

                //no need just bull with primary
                sendChat('test willPlace?:' + canSpike)
                buyEquip(7, 0)
                selectWeapon(player.weapons[0])
                sendAutoGather(); //toggles autofire of weapons currently on
                game.tickBase(() => {
                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                    sendAutoGather(); //toggles autofire of weapons new off
                    this.hammer = false;
                    this.isTrue = false;
                    my.autoAim = false;
                    this.isTicking = false;
                }, 1);
            } else if (canTest.secondarySwings == 1) {
                sendChat('test willPlace?:' + canSpike)
                buyEquip(hasTank ? 40 : 6, 0);
                selectWeapon(player.weapons[1])
                sendAutoGather(); //toggles autofire of weapons currently on
                game.tickBase(() => {
                    //swing primary logic
                    buyEquip(7, 0)
                    selectWeapon(player.weapons[0])
                    //sendAutoGather(); //toggles autofire of weapons new off
                    game.tickBase(() => {
                        buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                        sendAutoGather(); //toggles autofire of weapons new off
                        this.hammer = false;
                        this.isTrue = false;
                        my.autoAim = false;
                        this.isTicking = false;
                    }, 1);
                }, 1)
            }
        }
        //forge
        this.moveUp = function (ticks = 3) {
            let dir_ = _things.enemy.enemy ? _things.getDirection(_things.player, _things.enemy.enemy) : _things.player.dir
            _things.packet('9', dir_, 1)
            _things.game.tickBase(() => _things.packet('9', null, 0), ticks)
        }
        this.changeType1 = function (type) {
            this.wait = false;
            this.isTrue = true;
            my.autoAim = true;
            let instaLog = [type];
            game.tickBase(() => {
                importantDirs.normalMove = _things.getDirection(_things.player, _things.enemy.enemy)
                game.tickBase(() => {
                    stop()
                }, 3)
            }, 1)
            if (type == "rev") {
                this.moveUp(3)
                _things.buyEquip(53, 0)
                _things.selectWeapon(_things.player.weapons[1])
                _things.sendAutoGather()
                setTimeout(() => {
                    _things.buyEquip(7, 0)
                    _things.selectWeapon(_things.player.weapons[0])
                }, pingTime)
                setTimeout(() => {
                    _things.sendAutoGather()
                    _things.my.autoAim = !true
                    this.isTrue = !true
                }, 100 + pingTime * 1.1)
                return true
            }
            else if (type == "nobull") {
                this.moveUp(3)
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                sendAutoGather();
                setTimeout(() => {
                    selectWeapon(player.weapons[1]);
                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                    setTimeout(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 255);
                }, 105);
                return true
            }
            else if (type == "normal") {
                this.moveUp(3)
                _things.buyEquip(7, 0)
                _things.selectWeapon(_things.player.weapons[0])
                _things.sendAutoGather()
                setTimeout(() => {
                    _things.buyEquip(53, 0)
                    _things.selectWeapon(_things.player.weapons[1])
                }, pingTime)
                setTimeout(() => {
                    _things.sendAutoGather()
                    _things.my.autoAim = !true
                    _things.instaC.isTrue = !true
                }, 80 + pingTime * 1.1)
                return true
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                sendAutoGather();
                setTimeout(() => {
                    selectWeapon(player.weapons[1]);
                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                    setTimeout(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 170);
                }, 80);
                return true
            }
            else {
                return false
                this.isTrue = false;
                my.autoAim = false;
            }
        };
        this.changeType = function (type) {
            let c = _random([0, 1])
            if (c) return console.log('Used bonus', chat(type + 'new'), this.changeType1(type))
            chat(type)
            this.wait = false;
            this.isTrue = true;
            my.autoAim = true;
            buyEquip(0, 1);
            let instaLog = [type];
            let backupNobull = near.backupNobull;
            near.backupNobull = false;
            game.tickBase(() => {
                instaLog.push(player.skinIndex);
                game.tickBase(() => {
                    if (near.skinIndex == 22 && getEl("backupNobull").checked) {
                        near.backupNobull = true;
                    }
                    instaLog.push(player.skinIndex);
                }, 1);
            }, 1);
            if (type == "rev") {
                this.moveUp(3)
                selectWeapon(player.weapons[1]);
                buyEquip(53, 0);
                sendAutoGather();
                game.tickBase(() => {
                    selectWeapon(player.weapons[0]);
                    buyEquip(7, 0);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                }, 1);
            }
            else if (type == "nobull") {
                this.moveUp(3)
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                sendAutoGather();
                game.tickBase(() => {
                    selectWeapon(player.weapons[1]);
                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                }, 1);
            }
            else if (type == "Normal" || type == "normal") {
                this.moveUp(3)
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                sendAutoGather();
                game.tickBase(() => {
                    selectWeapon(player.weapons[1]);
                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                }, 1);
            }
            else if (type == "oneTickType") {
                this.oneTickType()
            }
            else if (type == "threeOneTickType") {
                this.threeOneTickType()
            }
            else {
                chat(`type:${type}-nf`)
                setTimeout(() => {
                    this.isTrue = false;
                    my.autoAim = false;
                }, 50);
            }
        };
        this.spikeTickType = function () {
            clearSpikeTickReserve();
            function _0xd5c3(_0x9f4b0, _0x509c61) { const _0x45e2dc = _0x45e2(); return _0xd5c3 = function (_0xd5c3c8, _0x53c283) { _0xd5c3c8 = _0xd5c3c8 - 0x1ed; let _0x450188 = _0x45e2dc[_0xd5c3c8]; return _0x450188; }, _0xd5c3(_0x9f4b0, _0x509c61); } const _0x528eb4 = _0xd5c3; (function (_0x3d78b5, _0x358bfc) { const _0x27ad26 = _0xd5c3, _0x515b73 = _0x3d78b5(); while (!![]) { try { const _0x42303f = -parseInt(_0x27ad26(0x1f3)) / 0x1 + -parseInt(_0x27ad26(0x1f0)) / 0x2 * (parseInt(_0x27ad26(0x1ed)) / 0x3) + parseInt(_0x27ad26(0x1f8)) / 0x4 * (-parseInt(_0x27ad26(0x1f4)) / 0x5) + -parseInt(_0x27ad26(0x1ef)) / 0x6 + parseInt(_0x27ad26(0x1fb)) / 0x7 * (parseInt(_0x27ad26(0x1f1)) / 0x8) + -parseInt(_0x27ad26(0x1fa)) / 0x9 + parseInt(_0x27ad26(0x1ee)) / 0xa; if (_0x42303f === _0x358bfc) break; else _0x515b73['push'](_0x515b73['shift']()); } catch (_0x53c403) { _0x515b73['push'](_0x515b73['shift']()); } } }(_0x45e2, 0xf2ba5)); let perfectAngle = UTILS[_0x528eb4(0x1f6)](tmpObj, player, 0x0, 0x2), placeCountOMG = 0x4; this[_0x528eb4(0x1f9)] = !![], my[_0x528eb4(0x1f5)] = !![], io['send']('6', ''), selectWeapon(player[_0x528eb4(0x1f7)][0x0]), buyEquip(0x7, 0x0), buyEquip(0x15, 0x1), sendAutoGather(), game[_0x528eb4(0x1f2)](() => { const _0x4f8708 = _0x528eb4; selectWeapon(player[_0x4f8708(0x1f7)][0x0]), buyEquip(0x35, 0x0), buyEquip(0x15, 0x1), game[_0x4f8708(0x1f2)](() => { const _0x50ee54 = _0x4f8708; sendAutoGather(), this[_0x50ee54(0x1f9)] = ![], my[_0x50ee54(0x1f5)] = ![]; }, 0x1); }, 0x1); function _0x45e2() { const _0x59100f = ['3859896Uvkzwj', '24TAsWeY', 'tickBase', '1952558fxxdgz', '10BJDBZO', 'autoAim', 'getDirect', 'weapons', '945764eUGeSx', 'isTrue', '8776332wptcow', '3970526VrFpZo', '3IMjAlU', '53543190wAItZh', '4387344wMKhty']; _0x45e2 = function () { return _0x59100f; }; return _0x45e2(); }
            return;
            /*this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[0]);
            buyEquip(7, 0);
            buyEquip(21, 1);
            sendAutoGather();
            game.tickBase(() => {
                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                    selectWeapon(player.weapons[0]);
                    buyEquip(53, 0);
                    buyEquip(21, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                } else {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                }
            }, 1);*/
        }

        this.counterType = function () { //now do we really need boost tick is the question ;3
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[0]);
            buyEquip(7, 0);
            buyEquip(18, 1);
            sendAutoGather();
            game.tickBase(() => {
                if (player.reloads[53] == 0) {
                    selectWeapon(player.weapons[0]);
                    buyEquip(53, 0);
                    buyEquip(21, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                } else {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false; // my godly ass antibull ;3
                }
            }, 1);
        };
        this.spikeTickType2 = function () {
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[0]);
            buyEquip(7, 0);
            buyEquip(21, 1);
            sendAutoGather();
            game.tickBase(() => {
                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                    selectWeapon(player.weapons[0]);
                    buyEquip(53, 0);
                    buyEquip(21, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                } else {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                }
            }, 1);
        };
        this.syncTry = function () {
            io.send("6", "Pew");
            if (player.weapons[1] == 15) {
                this.isTrue = true;
                my.autoAim = true;
                game.tickBase(() => {
                    instaC.isTrue = true;
                    selectWeapon(player.weapons[1]);
                    buyEquip(53, 0);
                    buyEquip(0, 1);
                    sendAutoGather();
                    game.tickBase(() => {
                        my.autoAim = false;
                        instaC.isTrue = false;
                        this.isTrue = false;
                        sendAutoGather();
                    }, 1);
                }, 1);
            }
        };
        this.counterType2 = function () {
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[0]);
            buyEquip(7, 0);
            buyEquip(21, 1);
            sendAutoGather();
            game.tickBase(() => {
                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                    selectWeapon(player.weapons[0]);
                    buyEquip(53, 0);
                    buyEquip(21, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1);
                } else {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                }
            }, 1);
        };
        this.antiCounterType = function () {
            my.autoAim = true;
            this.isTrue = true;
            inantiantibull = true;
            selectWeapon(player.weapons[0]);
            buyEquip(6, 0);
            buyEquip(21, 1);
            io.send("D", near.aim2);
            sendAutoGather();
            game.tickBase(() => {
                buyEquip(player.reloads[53] == 0 ? player.skins[53] ? 53 : 6 : 6, 0);
                buyEquip(21, 1);
                game.tickBase(() => {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                    inantiantibull = false;
                }, 1);
            }, 1)
        };
        this.rangeType = function (type) {
            this.isTrue = true;
            my.autoAim = true;
            if (type == "ageInsta") {
                my.ageInsta = false;
                if (player.items[5] == 18) {
                    place(5, near.aim2);
                }
                packet("9", undefined, 1);
                buyEquip(22, 0);
                buyEquip(21, 1);
                game.tickBase(() => {
                    selectWeapon(player.weapons[1]);
                    buyEquip(53, 0);
                    buyEquip(21, 1);
                    sendAutoGather();
                    game.tickBase(() => {
                        sendUpgrade(12);
                        selectWeapon(player.weapons[1]);
                        buyEquip(53, 0);
                        buyEquip(21, 1);
                        game.tickBase(() => {
                            sendUpgrade(15);
                            selectWeapon(player.weapons[1]);
                            buyEquip(53, 0);
                            buyEquip(21, 1);
                            game.tickBase(() => {
                                sendAutoGather();
                                this.isTrue = false;
                                my.autoAim = false;
                            }, 1);
                        }, 1);
                    }, 1);
                }, 1);
            }
            else {
                selectWeapon(player.weapons[1]);
                if (player.reloads[53] == 0 && near.dist2 <= 700 && near.skinIndex != 22) {
                    buyEquip(53, 0);
                } else {
                    buyEquip(useMark ? 1 : 20, 0);
                }
                buyEquip(11, 1);
                sendAutoGather();
                game.tickBase(() => {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                    setTimeout(() => {
                        debug()
                    }, 50)
                }, 1);
            }
        };
        this.oneTickType = function () {
            io.send("6", "P_OT Start")
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[1]);
            buyEquip(53, 0);
            buyEquip(11, 1);
            packet("9", near.aim2, 1);
            if (player.weapons[1] == 15) {
                my.revAim = true;
                sendAutoGather();
            }
            game.tickBase(() => {
                const trap1 = gameObjects
                    .filter((e) => e.trap && e.active)
                    .sort((a, b) => UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2))
                    .find((trap) => {
                        const trapDist = Math.hypot(trap.y - near.y2, trap.x - near.x2);
                        return (
                            trap !== player &&
                            (player.sid === trap.owner.sid || findAllianceBySid(trap.owner.sid)) &&
                            trapDist <= 30
                        );
                    });
                if ([6, 22].includes(near.skinIndex) && trap1) io.send('6', 'p_OT [2/3]');
                my.revAim = false;
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                buyEquip(19, 1);
                packet("9", near.aim2, 1);
                if (player.weapons[1] != 15) {
                    sendAutoGather();
                }
                game.tickBase(() => {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                    packet("9", undefined, 1);
                }, 1);
            }, 1);
        };
        this.threeOneTickType = function () {
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
            biomeGear();
            buyEquip(11, 1);
            packet("9", near.aim2, 1);
            game.tickBase(() => {
                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                buyEquip(53, 0);
                buyEquip(11, 1);
                packet("9", near.aim2, 1);
                game.tickBase(() => {
                    selectWeapon(player.weapons[0]);
                    buyEquip(7, 0);
                    buyEquip(19, 1);
                    sendAutoGather();
                    packet("9", near.aim2, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                        packet("9", undefined, 1);
                    }, 1);
                }, 1);
            }, 1);
        };
        this.kmTickType = function () {
            this.isTrue = true;
            my.autoAim = true;
            my.revAim = true;
            selectWeapon(player.weapons[1]);
            buyEquip(53, 0);
            buyEquip(11, 1);
            sendAutoGather();
            packet("9", near.aim2, 1);
            game.tickBase(() => {
                my.revAim = false;
                selectWeapon(player.weapons[0]);
                buyEquip(7, 0);
                buyEquip(19, 1);
                packet("9", near.aim2, 1);
                game.tickBase(() => {
                    sendAutoGather();
                    this.isTrue = false;
                    my.autoAim = false;
                    packet("9", undefined, 1);
                }, 1);
            }, 1);
        };
        this.boostTickType = function () {
            /*this.isTrue = true;
my.autoAim = true;
selectWeapon(player.weapons[0]);
buyEquip(53, 0);
buyEquip(11, 1);
packet("33", near.aim2);
game.tickBase(() => {
place(4, near.aim2);
selectWeapon(player.weapons[1]);
biomeGear();
buyEquip(11, 1);
sendAutoGather();
packet("33", near.aim2);
game.tickBase(() => {
selectWeapon(player.weapons[0]);
buyEquip(7, 0);
buyEquip(19, 1);
packet("33", near.aim2);
game.tickBase(() => {
sendAutoGather();
this.isTrue = false;
my.autoAim = false;
packet("33", undefined);
}, 1);
}, 1);
}, 1);*/
            this.isTrue = true;
            my.autoAim = true;
            biomeGear();
            buyEquip(11, 1);
            packet("9", near.aim2, 1);
            game.tickBase(() => {
                if (player.weapons[1] == 15) {
                    my.revAim = true;
                }
                selectWeapon(player.weapons[[9, 12, 13, 15].includes(player.weapons[1]) ? 1 : 0]);
                buyEquip(53, 0);
                buyEquip(11, 1);
                if ([9, 12, 13, 15].includes(player.weapons[1])) {
                    sendAutoGather();
                }
                packet("9", near.aim2, 1);
                place(4, near.aim2);
                game.tickBase(() => {
                    my.revAim = false;
                    selectWeapon(player.weapons[0]);
                    buyEquip(7, 0);
                    buyEquip(19, 1);
                    if (![9, 12, 13, 15].includes(player.weapons[1])) {
                        sendAutoGather();
                    }
                    packet("9", near.aim2, 1);
                    game.tickBase(() => {
                        sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                        packet("9", undefined, 1);
                    }, 1);
                }, 1);
            }, 1);
        };
        this.gotoGoal = function (goto, OT) {
            let slowDists = (weeeee) => weeeee * config.playerScale;
            let goal = {
                a: goto - OT,
                b: goto + OT,
                c: goto - slowDists(1),
                d: goto + slowDists(1),
                e: goto - slowDists(2),
                f: goto + slowDists(2),
                g: goto - slowDists(4),
                h: goto + slowDists(4)
            };
            let bQ = function (wwww, awwww) {
                if (player.y2 >= config.mapScale / 2 - config.riverWidth / 2 && player.y2 <= config.mapScale / 2 + config.riverWidth / 2 && awwww == 0) {
                    buyEquip(31, 0);
                } else {
                    buyEquip(wwww, awwww);
                }
            }
            if (enemy.length) {
                let dst = near.dist2;
                this.ticking = true;
                if (dst >= goal.a && dst <= goal.b) {
                    bQ(22, 0);
                    bQ(11, 1);
                    if (player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0] || player.buildIndex > -1) {
                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                    }
                    return {
                        dir: undefined,
                        action: 1
                    };
                } else {
                    if (dst < goal.a) {
                        if (dst >= goal.g) {
                            if (dst >= goal.e) {
                                if (dst >= goal.c) {
                                    bQ(40, 0);
                                    bQ(10, 1);
                                    if (configs.slowOT) {
                                        player.buildIndex != player.items[1] && selectToBuild(player.items[1]);
                                    } else {
                                        if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                        }
                                    }
                                } else {
                                    bQ(22, 0);
                                    bQ(19, 1);
                                    if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                    }
                                }
                            } else {
                                bQ(6, 0);
                                bQ(12, 1);
                                if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                    selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                }
                            }
                        } else {
                            biomeGear();
                            bQ(11, 1);
                            if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                            }
                        }
                        return {
                            dir: near.aim2 + Math.PI,
                            action: 0
                        };
                    } else if (dst > goal.b) {
                        if (dst <= goal.h) {
                            if (dst <= goal.f) {
                                if (dst <= goal.d) {
                                    bQ(40, 0);
                                    bQ(9, 1);
                                    if (configs.slowOT) {
                                        player.buildIndex != player.items[1] && selectToBuild(player.items[1]);
                                    } else {
                                        if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                        }
                                    }
                                } else {
                                    bQ(22, 0);
                                    bQ(19, 1);
                                    if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                    }
                                }
                            } else {
                                bQ(6, 0);
                                bQ(12, 1);
                                if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                    selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                }
                            }
                        } else {
                            biomeGear();
                            bQ(11, 1);
                            if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                            }
                        }
                        return {
                            dir: near.aim2,
                            action: 0
                        };
                    }
                    return {
                        dir: undefined,
                        action: 0
                    };
                }
            } else {
                this.ticking = false;
                return {
                    dir: undefined,
                    action: 0
                };
            }
        }
        this.spammer = function () {
            if (antiBullType.value != "noab") return;
            this.isTrue = true;
            my.autoAim = true;
            selectWeapon(player.weapons[0]);
            buyEquip(7, 0);
            buyEquip(19, 1)
            sendAutoGather();
            game.tickBase(() => {
                sendAutoGather();
                this.isTrue = false;
                my.autoAim = false;
            }, 1);
        };
        this.bowMovement = function () {
            let moveMent = this.gotoGoal(685, 3);
            if (moveMent.action) {
                if (player.reloads[53] == 0 && !this.isTrue) {
                    this.rangeType("ageInsta");
                } else {
                    packet("9", moveMent.dir, 1);
                }
            } else {
                packet("9", moveMent.dir, 1);
            }
        }
        this.testMovement = function () {
            let move1 = this.gotoGoal(1440, 3);
            if (move1.action) {
                io.send("6", "test complete")
            } else {
                packet("9", Number.MAX_VALUE)
            }
        }
        this.tickMovement = function () {
            const trap1 = gameObjects
                .filter((e) => e.trap && e.active)
                .sort((a, b) => UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2))
                .find((trap) => {
                    const trapDist = Math.hypot(trap.y - near.y2, trap.x - near.x2);
                    return (
                        trap !== player &&
                        (player.sid === trap.owner.sid || findAllianceBySid(trap.owner.sid)) &&
                        trapDist <= 50
                    );
                });
            let moveMent = this.gotoGoal(([10, 14].includes(player.weapons[1]) && player.y2 > config.snowBiomeTop) ? 240 : player.weapons[1] == 15 ? 250 : player.y2 <= config.snowBiomeTop ? [10, 14].includes(player.weapons[1]) ? 270 : 265 : 275, 3);
            if (moveMent.action) {
                if ((![6, 22].includes(near.skinIndex) || [6, 22].includes(near.skinIndex) && trap1) && player.reloads[53] == 0 && !this.isTrue) {
                    ([10, 14].includes(player.weapons[1]) && player.y2 > config.snowBiomeTop) || (player.weapons[1] == 15) ? this.oneTickType() : this.threeOneTickType();
                    if ([6, 22].includes(near.skinIndex) && trap1) io.send('6', 'p_OT [1/3]');
                } else {
                    packet("9", moveMent.dir, 1);
                }
            } else {
                packet("9", moveMent.dir, 1);
            }
        }
        this.kmTickMovement = function () {
            let moveMent = this.gotoGoal(240, 3);
            if (moveMent.action) {
                if (near.skinIndex != 22 && player.reloads[53] == 0 && !this.isTrue && ((game.tick - near.poisonTick) % config.serverUpdateRate == 8)) {
                    this.kmTickType();
                } else {
                    packet("9", moveMent.dir, 1);
                }
            } else {
                packet("9", moveMent.dir, 1);
            }
        }
        this.boostTickMovement = function () {
            let dist = player.weapons[1] == 9 ? 365 : player.weapons[1] == 12 ? 380 : player.weapons[1] == 13 ? 390 : player.weapons[1] == 15 ? 365 : 370;
            let actionDist = player.weapons[1] == 9 ? 2 : player.weapons[1] == 12 ? 1.5 : player.weapons[1] == 13 ? 1.5 : player.weapons[1] == 15 ? 2 : 3;
            let moveMent = this.gotoGoal(dist, actionDist);
            if (moveMent.action) {
                if (player.reloads[53] == 0 && !this.isTrue) {
                    this.boostTickType();
                } else {
                    packet("9", moveMent.dir, 1);
                }
            } else {
                packet("9", moveMent.dir, 1);
            }
        }

        this.perfCheck = function (pl, nr) {
            if (nr.weaponIndex == 11 && UTILS.getAngleDist(nr.aim2 + Math.PI, nr.d2) <= config.shieldAngle) return false;
            if (![9, 12, 13, 15].includes(player.weapons[1])) return true;
            let pjs = {
                x: nr.x2 + (70 * Math.cos(nr.aim2 + Math.PI)),
                y: nr.y2 + (70 * Math.sin(nr.aim2 + Math.PI))
            };
            if (UTILS.lineInRect(pl.x2 - pl.scale, pl.y2 - pl.scale, pl.x2 + pl.scale, pl.y2 + pl.scale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                return true;
            }
            let finds = ais.filter(tmp => tmp.visible).find((tmp) => {
                if (UTILS.lineInRect(tmp.x2 - tmp.scale, tmp.y2 - tmp.scale, tmp.x2 + tmp.scale, tmp.y2 + tmp.scale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                    return true;
                }
            });
            if (finds) return false;
            finds = gameObjects.filter(tmp => tmp.active).find((tmp) => {
                let tmpScale = tmp.getScale();
                if (!tmp.ignoreCollision && UTILS.lineInRect(tmp.x - tmpScale, tmp.y - tmpScale, tmp.x + tmpScale, tmp.y + tmpScale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                    return true;
                }
            });
            if (finds) return false;
            return true;
        }
        this.assistInsta = function (gobj, _40 = player.skins[40]) {
            if (_things.player.weapons[1] != 10) return 'bozo'
            let mBdmg = _things.items.weapons[10].dmg * config.weaponVariants[_things.player.secondaryVariant].val * (_things.items.weapons[10].sDmg) * (_40 ? 3.3 : 1)
            if (isnerf || gobj.health > mBdmg) return 'bozo\'js'
            chat('Get assisted')
            this.wait = false;
            this.isTrue = true;
            my.autoAim = true;
            buyEquip(40, 0);
            selectWeapon(_things.player.weapons[1]);
            sendAutoGather();
            game.tickBase(() => {
                //this.wait = false;
                _things.buyEquip(7, 0);
                _things.selectWeapon(_things.player.weapons[0]);
                checkPlace(2, near.aim2)
                game.tickBase(() => {
                    game.tickBase(() => {
                        _things.sendAutoGather();
                        this.isTrue = false;
                        my.autoAim = false;
                    }, 1)
                }, 1)
            }, 1)
        }
        function predictAim(enemy, projectileSpeed) {
            const { x, y, moveDir, speed = 0, xVel = 0, yVel = 0 } = enemy;
            const px = _things.player.x;
            const py = _things.player.y;

            // Direction fallback
            let vx, vy;
            if (typeof moveDir === "number") {
                vx = Math.cos(moveDir) * speed;
                vy = Math.sin(moveDir) * speed;
            } else {
                vx = xVel;
                vy = yVel;
            }

            // Relative position
            const relX = x - px;
            const relY = y - py;

            // Quadratic coefficients
            const a = vx * vx + vy * vy - projectileSpeed * projectileSpeed;
            const b = 2 * (relX * vx + relY * vy);
            const c = relX * relX + relY * relY;

            const disc = b * b - 4 * a * c;
            let t;

            if (disc >= 0 && Math.abs(a) > 1e-6) {
                const sqrtDisc = Math.sqrt(disc);
                const t1 = (-b - sqrtDisc) / (2 * a);
                const t2 = (-b + sqrtDisc) / (2 * a);
                t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
            } else {
                // No valid intercept time, fall back to direct aim
                t = Math.hypot(relX, relY) / projectileSpeed;
            }

            const aimX = x + vx * t;
            const aimY = y + vy * t;

            return { x: aimX, y: aimY };
        }

        /*setTimeout(()=>{
//_things.my.autoAim=!true
_things.instaC.isTrue=!true
},primarySwingTimeout+(secondaryTimeout/2))
_things.my.autoAim=true
_things.instaC.isTrue=true
_things.buyEquip(53,0)
_things.selectWeapon(_things.player.weapons[1])
_things.sendAutoGather()
setTimeout(()=>{
_things.buyEquip(7,0)
_things.selectWeapon(_things.player.weapons[0])
},pingTime)
setTimeout(()=>{
_things.buyEquip(21,0)
},100)
setTimeout(()=>{
_things.sendAutoGather()
_things.my.autoAim=!true
_things.instaC.isTrue=!true
},100+pingTime*1.1)*/
        this.rangeFrame = function (swingBull, m, added) {
            if (isnerf) return 'bozo'
            this.wait = false;
            this.isTrue = true;
            this.bow = true
            my.autoAim = true
            const o = (function (player = _things.player, target = _things.enemy.enemy) {
                const sx = player.x, sy = player.y;
                const dx = target.x - sx, dy = target.y - sy;
                const dist = Math.hypot(dx, dy);

                // find sec weapon & proj, if none treat as missing
                const secWep = weapons.find(w => w.id === player.secondaryIndex);
                const hasRange = secWep && secWep.projectile != null && _things.items.projectiles[secWep.projectile];
                const projR = hasRange
                    ? _things.items.projectiles[secWep.projectile]
                    : null;
                const projT = _things.items.projectiles[1]; // turret proj

                // time to hit (ticks)
                const ticksR = hasRange ? dist / projR.speed : pingTime;
                let ticksT;
                if (swingBull) {
                    // collision happens when centers are (player.scale + turretRadius) apart
                    const collisionDist = player.scale + 20;
                    const travelDist = Math.max(dist - collisionDist, 0);
                    ticksT = travelDist / projT.speed;
                } else {
                    ticksT = dist / projT.speed;
                }
                const faster = swingBull ? "range" : ticksR < ticksT ? 'range' : 'turret';
                const timeout = Math.abs(ticksR - ticksT)// * (m||1)+(added||0); // adjust multiplier if needed

                return { ticksR, ticksT, faster, timeout, hasRange, pSpeed: hasRange ? projR.speed : 0 };
            })();
            const canSwing = swingBull || o.faster === 'range';
            //shoot turret first
            let xA = 3
            function gxA() {
                let _ = ['x', 'y'].map(e => e + xA.toString())
                let [x, y] = _.map(xy => _things.enemy.enemy[xy])
                return { x, y }
            }
            console.log(o, canSwing)
            if (o.faster === 'range' || swingBull) {
                console.log(1, 'Turret')
                _things.buyEquip(53, 0);
            } else {
                console.log(1, 'Ranged')
                //_things.aimAt(_things.lead);
                _things.selectWeapon(_things.player.weapons[1]);
                _things.sendAutoGather();
            }
            setTimeout(() => {
                if (swingBull && canSwing) {
                    if (swingBull) {
                        console.log(2, 'Swing')
                        // 3Ã¯Â¸ÂÃ¢Æ’Â£ Now equip hat-7 (primary) and swing
                        _things.buyEquip(7, 0);
                        _things.selectWeapon(_things.player.weapons[0])
                        _things.sendAutoGather(); dw
                    }
                }
                else if (o.faster === 'range') {
                    console.log(2, 'ranged')
                    //_things.aimAt(_things.lead);
                    _things.selectWeapon(_things.player.weapons[1]);
                    _things.sendAutoGather();
                } else {
                    console.log(2, 'turret')
                    _things.buyEquip(53, 0);
                }
            }, o.timeout)

            setTimeout(() => {
                console.log(3, 'off')
                _things.sendAutoGather();
                my.autoAim = false;
                this.isTrue = false;
            }, o.timeout + 300)
            return;
        }
        this.rangeFrameWorking = function (swingBull) {
            if (isnerf) return 'bozo'
            this.wait = false;
            this.isTrue = true;
            my.autoAim = true;
            let o = (function (player = _things.player, targetPos = _things.enemy.enemy) {
                const sx = player.x, sy = player.y;
                const dx = targetPos.x - sx, dy = targetPos.y - sy;
                const dist = Math.hypot(dx, dy);
                const wep = weapons.find(w => w.id === player.secondaryIndex);
                const projR = _things.items.projectiles[wep.projectile];
                const projT = _things.items.projectiles[1];

                const ticksR = dist / projR.speed;
                const ticksT = dist / projT.speed;
                const faster = ticksR < ticksT ? 'range' : 'turret';
                let timout = Math.abs(ticksR - ticksT)
                return { ticksR, ticksT, faster, timout }
            })()
            let canSwing = false
            //shoot turret first
            if (o.faster === 'range') {
                canSwing = true
                _things.buyEquip(53, 0);
            } else {
                _things.selectWeapon(_things.player.weapons[1]);
                _things.sendAutoGather();
            }
            setTimeout(() => {
                if (swingBull && canSwing) {
                    if (swingBull) {
                        // 3Ã¯Â¸ÂÃ¢Æ’Â£ Now equip hat-7 (primary) and swing
                        _things.buyEquip(7, 0);
                        _things.selectWeapon(_things.player.weapons[0])
                    }
                }
                else if (o.faster === 'range') {
                    _things.selectWeapon(_things.player.weapons[1]);
                    _things.sendAutoGather();
                } else {
                    _things.buyEquip(53, 0);
                }
            }, o.timout)

            setTimeout(() => {
                _things.sendAutoGather();
                _things.autoAim = 0;
                this.isTrue = false;
            }, o.timout + 300)
            return;
        }
        this.rangeFrame2 = function (swingBull) {
            if (isnerf) return 'bozo';
            this.wait = false;
            this.isTrue = true;
            my.autoAim = true;

            // calc timings, handle missing ranged secondary
            const o = (function (player = _things.player, target = _things.enemy.enemy) {
                const sx = player.x, sy = player.y;
                const dx = target.x - sx, dy = target.y - sy;
                const dist = Math.hypot(dx, dy);

                // find sec weapon & proj, if none treat as missing
                const secWep = weapons.find(w => w.id === player.secondaryIndex);
                const hasRange = secWep && secWep.projectile != null && _things.items.projectiles[secWep.projectile];
                const projR = hasRange
                    ? _things.items.projectiles[secWep.projectile]
                    : null;
                const projT = _things.items.projectiles[1]; // turret proj

                // time to hit (ticks)
                const ticksR = hasRange ? dist / projR.speed : Infinity;
                const ticksT = dist / projT.speed;
                const faster = ticksR < ticksT ? 'range' : 'turret';
                const timeout = Math.abs(ticksR - ticksT) * 100; // adjust multiplier if needed

                return { ticksR, ticksT, faster, timeout, hasRange };
            })();
            // allow hat swing if we wanna swing bull or if range is faster
            const canSwing = swingBull || o.faster === 'range';

            // fire the slower one first to sync hits
            if (o.faster === 'range' && o.hasRange) {
                _things.buyEquip(53, 0); // turret first
            } else {
                _things.selectWeapon(_things.player.weapons[1]); // range (or turret if no range)
                _things.sendAutoGather();
            }

            // after sync delay
            setTimeout(() => {
                if (swingBull && canSwing) {
                    // swing hat-7
                    _things.buyEquip(7, 0);
                    _things.selectWeapon(_things.player.weapons[0]);
                    _things.sendAutoGather();
                } else if (o.faster === 'range') {
                    // if we chose range-first path
                    _things.selectWeapon(_things.player.weapons[1]);
                    _things.sendAutoGather();
                } else {
                    // fallback turret equip/shoot
                    _things.buyEquip(53, 0);
                    //_things.sendAutoGather();
                }
            }, o.timeout);

            // cleanup autoAim
            setTimeout(() => {
                _things.autoAim = 0;
                this.isTrue = false;
            }, o.timeout + 300);

            return;
        };

    }
}

class CachedMapResource {
    constructor(raw, bucket) {
        this.bucket = bucket;
        this.sid = raw.sid;
        this.type = raw.type;
        this.scale = raw.scale;
        this.x = raw.x;
        this.y = raw.y;
        this.lastSeen = Date.now();
    }
    update(raw) {
        this.type = raw.type;
        this.scale = raw.scale;
        this.x = raw.x;
        this.y = raw.y;
        this.lastSeen = Date.now();
        return this;
    }
    getGameObject() {
        return findObjectBySid(this.sid);
    }
    refreshFromGameObject() {
        const obj = this.getGameObject();
        if (!obj) return this;
        return this.update({
            sid: obj.sid,
            type: obj.type,
            scale: obj.scale,
            x: obj.x,
            y: obj.y
        });
    }
    _pickXY(target, suffix = 2) {
        const tx = Number.isFinite(target?.["x" + suffix]) ? target["x" + suffix] : target?.x;
        const ty = Number.isFinite(target?.["y" + suffix]) ? target["y" + suffix] : target?.y;
        return {
            x: Number.isFinite(tx) ? tx : 0,
            y: Number.isFinite(ty) ? ty : 0
        };
    }
    distTo(target = player, suffix = 2) {
        const t = this._pickXY(target, suffix);
        return Math.hypot(this.x - t.x, this.y - t.y);
    }
    dirTo(target = player, suffix = 2) {
        const t = this._pickXY(target, suffix);
        return Math.atan2(this.y - t.y, this.x - t.x);
    }
    canAutoFarm(target = player, maxDist = 450, suffix = 2) {
        return this.distTo(target, suffix) <= maxDist;
    }
    getFarmKind() {
        return "generic";
    }
}

class CachedTreeResource extends CachedMapResource {
    constructor(raw) {
        super(raw, "trees");
    }
    getFarmKind() {
        return "wood";
    }
}

class CachedBushResource extends CachedMapResource {
    constructor(raw) {
        super(raw, "bushes");
    }
    getFarmKind() {
        return "food";
    }
}

class CachedStoneResource extends CachedMapResource {
    constructor(raw) {
        super(raw, "stones");
    }
    getFarmKind() {
        return "stone";
    }
}

class CachedCatusResource extends CachedMapResource {
    constructor(raw) {
        super(raw, "catuses");
    }
    getFarmKind() {
        return "cactus";
    }
}

class CachedGoldminResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "goldmins");
                    }
                    getFarmKind() {
                        return "gold";
                    }
                }

class AStarNode {
                    constructor(x, y, g, h, parent = null) {
                        this.x = x;
                        this.y = y;
                        this.g = g;
                        this.h = h;
                        this.f = g + h;
                        this.parent = parent;
                    }
                }

class PlayerRuntime {
    constructor(rootRef, gameEntity) {
        this.root = rootRef || window;
        this.game = gameEntity || null;
        this.mySid = null;
        this.wsHooked = false;
        this.boundSockets = new WeakSet();
        this.boundKnownPoll = null;
        this.spawnUiApplied = false;
        this.weaponNames = {
            0: "tool-hands",
            1: "hand_axe",
            2: "great_axe",
            3: "short_sword",
            4: "katana",
            5: "polearm",
            6: "bat",
            7: "daggers",
            8: "stick",
            9: "hunting_bow",
            10: "great_hammer",
            11: "wooden_shield",
            12: "crossbow",
            13: "repeater_crossbow",
            14: "mc_grabby",
            15: "musket",
            53: "turret"
        };
        this.players = [];
        this.ais = [];
        this.gameObjects = [];
        this.projectiles = [];
        this.alliances = [];
        this.alliancePlayers = [];
        this.minimapData = null;
        this.lastLeaderboardData = [];
        this.advHeal = [];
        this.runAtNextTick = [];
        this.inGame = false;
        this.lastDeath = null;
        this.textQueue = [];
        this.mapPings = [];
        this.mapPingPool = [];
        this.textManager = new Textmanager();
        this.deadPlayers = [];
        this.petals = [];
        this.items = new Items(this.root);
        this.items.publish();
        this.store = new Store(this.root);
        this.objectManager = new Objectmanager(this.gameObjects);
        this.projectileManager = new ProjectileManager(this.projectiles, this.items);
        this.aiManager = new AiManager(this.ais, this.root);
        this.damages = new Damages(this.items);
        this.autoupgrade = new Autoupgrade();
        this.autobuy = new Autobuy([], [], {
            getPlayer: () => this.ensurePlayer(this.mySid),
            getStore: () => this.store,
            sendPacket: (type, a, b, c) => {
                if (this.root.NozoNext && this.root.NozoNext.packet && this.root.NozoNext.packet.send) {
                    this.root.NozoNext.packet.send(type, [a, b, c]);
                } else if (this.root.packet) {
                    this.root.packet(type, a, b, c);
                }
            }
        });
        this.instakill = new Instakill();
        this.root.instaC = this.root.instaC || this.instakill;
        this._wrapInstakillStrict();
        this.resourceCache = {
            trees: new Map(),
            bushes: new Map(),
            stones: new Map(),
            catuses: new Map(),
            goldmins: new Map()
        };
        if (!this.root.EasyStar || !this.root.EasyStar.js) {
            throw new Error("[NozoSingle:Phase7] EasyStar external missing (root.EasyStar.js)");
        }
        this.easystar = new this.root.EasyStar.js();
        this.root.pathFind = this.root.pathFind || {
            active: false,
            grid: 100,
            scale: 1400,
            x: 14400,
            y: 14400,
            chaseNear: false,
            array: [],
            lastX: 50,
            lastY: 50
        };
        this.root.pathCellToWorld = (node) => this.pathCellToWorld(node);
        this.root.Pathfinder = (pos, one, two, pushinng) => this.Pathfinder(pos, one, two, pushinng);
        this.root.getObjectsInLineOfSight = (a, b, useProjectileRadius) => this.getObjectsInLineOfSight(a, b, useProjectileRadius);
        const serverUpdateRate = Number((this.root.config && this.root.config.serverUpdateRate) || (_config && _config.serverUpdateRate) || 9);
        const baseGame = this.root.game || {};
        this.root.game = {
            tick: Number(baseGame.tick || 0),
            tickQueue: Array.isArray(baseGame.tickQueue) ? baseGame.tickQueue : [],
            tickBase: baseGame.tickBase || function (set, tick) {
                const t = Number(this.tick || 0) + Number(tick || 0);
                if (this.tickQueue[t]) this.tickQueue[t].push(set);
                else this.tickQueue[t] = [set];
            },
            tickRate: Number(baseGame.tickRate || (1000 / serverUpdateRate)),
            tickSpeed: Number(baseGame.tickSpeed || 0),
            lastTick: Number(baseGame.lastTick || performance.now())
        };
        this.root.my = this.root.my || {
            reloaded: false,
            waitHit: 0,
            autoAim: false,
            revAim: false,
            ageInsta: true,
            reSync: false,
            bullTick: 0,
            anti0Tick: 0,
            antiSync: false,
            safePrimary: function (tmpObj) {
                return [0, 8].includes(tmpObj.primaryIndex);
            },
            safeSecondary: function (tmpObj) {
                return [10, 11, 14].includes(tmpObj.secondaryIndex);
            },
            lastDir: 0,
            autoPush: false,
            pushData: {}
        };
        this.root.mills = this.root.mills || {};
        this.root.oldXY = this.root.oldXY || {};
        this.root.dPacketTracker = this.root.dPacketTracker || { tick: 0, count: 0, dirs: [] };
        this.root.runAtNextTick = this.runAtNextTick;
        // legacyCtx: internal authoritative context holder.
        // syncLegacyCombatRefs populates this each tick and mirrors to module-scope globals.
        this.legacyCtx = {
            player: null,
            items: this.items,
            nearObjs: [],
            enemy: [],
            near: null,
            objectManager: this.objectManager,
            traps: null,
            configs: _configs,
            config: _config,
            gameObjects: this.gameObjects,
            game: null,
            instaC: null,
            my: null,
            useWasd: false,
            buyEquip: null,
            selectWeapon: null,
            sendAutoGather: null,
            packet: null,
            getDirection: null,
            place: null,
            checkPlace: null,
            canplace: null,
            chat: null,
            stop: null,
            _random: null,
            pingTime: 0,
            io: null,
            importantDirs: null,
            tmpObj: null,
            findObjectBySid: null,
            inGame: false,
        };
        this.traps = new Traps(UTILS, this.items, this.legacyCtx);
        this.traps_ = new Traps_(UTILS, this.items, this.legacyCtx);
        this.legacyCtx.traps = this.traps;
        this.autoBreaker = new AutoBreaker(this.legacyCtx);
    }

    _ensureThingsContext() {
        // Wire NozoSingle._things compatibility facade to legacyCtx (authoritative internal source).
        if (!this.root.NozoSingle) this.root.NozoSingle = {};
        this.root._things = this.legacyCtx;
        return this.legacyCtx;
    }

    _assertInstakillDeps() {
        const t = this.legacyCtx;
        if (!t || typeof t !== "object") throw new Error("[NozoSingle:InstakillDeps] _things missing");
        if (!t.player) throw new Error("[NozoSingle:InstakillDeps] player missing");
        if (!t.items || !Array.isArray(t.items.weapons)) throw new Error("[NozoSingle:InstakillDeps] items.weapons missing");
        if (!t.enemy) throw new Error("[NozoSingle:InstakillDeps] enemy missing");
        if (!t.game || typeof t.game.tickBase !== "function") throw new Error("[NozoSingle:InstakillDeps] game.tickBase missing");
        if (typeof t.buyEquip !== "function") throw new Error("[NozoSingle:InstakillDeps] buyEquip missing");
        if (typeof t.selectWeapon !== "function") throw new Error("[NozoSingle:InstakillDeps] selectWeapon missing");
        if (typeof t.sendAutoGather !== "function") throw new Error("[NozoSingle:InstakillDeps] sendAutoGather missing");
        if (!t.my) throw new Error("[NozoSingle:InstakillDeps] my missing");
    }

    _wrapInstakillStrict() {
        const k = this.instakill;
        const names = Object.keys(k).filter((n) => typeof k[n] === "function");
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const original = k[name];
            k[name] = (...args) => {
                this._assertInstakillDeps();
                return original.apply(k, args);
            };
        }
    }

    runInstakillAction(action, ...args) {
        if (!this.instakill || typeof this.instakill[action] !== "function") {
            throw new Error(`[NozoSingle:Instakill] unknown action: ${String(action)}`);
        }
        return this.instakill[action](...args);
    }

    upsertResource(raw, TypeClass) {
        if (!raw || raw.sid == null) throw new Error("[NozoSingle:ResourceCache] raw.sid missing");
        if (typeof TypeClass !== "function") throw new Error("[NozoSingle:ResourceCache] TypeClass missing");
        const probe = new TypeClass(raw);
        const bucket = probe.bucket;
        if (!bucket || !this.resourceCache[bucket]) throw new Error(`[NozoSingle:ResourceCache] unknown bucket: ${String(bucket)}`);
        const map = this.resourceCache[bucket];
        const existing = map.get(raw.sid);
        if (existing) return existing.update(raw);
        map.set(raw.sid, probe);
        return probe;
    }

    _resourceTypeForObject(obj) {
        if (!obj || !obj.active || obj.sid == null) return null;
        if (obj.isItem) return null;
        const t = Number(obj.type);
        if (t === 0) {
            const s = Number(obj.scale);
            // Trees only: exclude most placed/other world objects that also show as type 0.
            if (Number.isFinite(s) && s >= 120 && s <= 220) return CachedTreeResource;
            return null;
        }
        if (t === 1) {
            const cfg = this.root.config || _config || {};
            const mapScale = Number(cfg.mapScale);
            const snowBiomeTop = Number(cfg.snowBiomeTop);
            const cactusY = (Number.isFinite(mapScale) && Number.isFinite(snowBiomeTop))
                ? (mapScale - snowBiomeTop)
                : 12000;
            const oy = Number.isFinite(obj.y) ? obj.y : obj.y2;
            return oy >= cactusY ? CachedCatusResource : CachedBushResource;
        }
        if (t === 2) return CachedStoneResource;
        if (t === 3) return CachedGoldminResource;
        return null;
    }

    _cacheRawFromObject(obj) {
        return {
            sid: obj.sid,
            type: obj.type,
            scale: obj.scale,
            x: Number.isFinite(obj.x) ? obj.x : obj.x2,
            y: Number.isFinite(obj.y) ? obj.y : obj.y2
        };
    }

    syncResourceCacheFromObjects() {
        const seen = new Set();
        for (let i = 0; i < this.gameObjects.length; i++) {
            const obj = this.gameObjects[i];
            if (!obj || !obj.active) continue;
            const TypeClass = this._resourceTypeForObject(obj);
            if (!TypeClass) continue;
            seen.add(obj.sid);
            this.upsertResource(this._cacheRawFromObject(obj), TypeClass);
        }
        const buckets = Object.keys(this.resourceCache);
        for (let i = 0; i < buckets.length; i++) {
            const map = this.resourceCache[buckets[i]];
            for (const sid of map.keys()) {
                if (!seen.has(sid)) map.delete(sid);
            }
        }
    }

    removeResourceBySid(sid) {
        const buckets = Object.keys(this.resourceCache);
        for (let i = 0; i < buckets.length; i++) {
            this.resourceCache[buckets[i]].delete(sid);
        }
    }

    syncLegacyCombatRefs(p) {
        const ctx = this.legacyCtx;

        // 1) Populate legacyCtx (authoritative internal source) from live game state.
        ctx.player = p;
        ctx.items = this.items;
        ctx.nearObjs = this.root.nearObjs || [];
        ctx.enemy = Array.isArray(this.root.enemy) ? this.root.enemy : [];
        ctx.near = this.root.near || null;
        ctx.objectManager = this.objectManager;
        ctx.traps = this.traps;
        ctx.inGame = this.inGame !== false;
        ctx.configs = _configs;
        ctx.config = this.root.config || _config;
        ctx.gameObjects = this.gameObjects;
        ctx.game = this.root.game || { tick: 0 };
        ctx.instaC = this.root.instaC || {};
        ctx.my = this.root.my || {};
        ctx.useWasd = !!this.root.useWasd;
        ctx.buyEquip = this.root.buyEquip;
        ctx.selectWeapon = this.root.selectWeapon;
        ctx.sendAutoGather = this.root.sendAutoGather;
        ctx.packet = this.root.packet;
        ctx.getDirection = (a, b) => UTILS.getDirect(b, a, 0, 0);
        ctx.place = this.root.place;
        ctx.checkPlace = this.root.checkPlace;
        ctx.canplace = this.root.canplace;
        ctx.chat = this.root.chat;
        ctx.stop = this.root.stop;
        ctx._random = this.root._random;
        ctx.pingTime = Number(this.root.pingTime || 0);
        ctx.io = this.root.io;
        ctx.importantDirs = this.root.importantDirs || {};
        ctx.tmpObj = this.root.tmpObj || null;
        ctx.findObjectBySid = (sid) => this._findObjectBySid(sid);

        // 2) Wire NozoSingle._things compatibility facade.
        this._ensureThingsContext();

        // 3) Mirror to module-scope globals required by Instakill and call-site code (not yet migrated to ctx).
        // Traps and Traps_ have been fully migrated to ctx in Phase 25 and no longer require these mirrors.
        // TODO(Instakill): Instakill body closes over player, items, enemy, near, _things, config, configs,
        //       gameObjects, game, instaC, my, buyEquip, selectWeapon, sendAutoGather,
        //       place, checkPlace, canplace, chat, stop, _random, pingTime, io, importantDirs,
        //       tmpObj, findObjectBySid, useWasd from module scope.
        player = ctx.player;
        items = ctx.items;
        enemy = ctx.enemy;
        near = ctx.near;
        _things = ctx;
        config = ctx.config;
        configs = ctx.configs;
        gameObjects = ctx.gameObjects;
        game = ctx.game;
        instaC = ctx.instaC;
        my = ctx.my;
        buyEquip = ctx.buyEquip;
        selectWeapon = ctx.selectWeapon;
        sendAutoGather = ctx.sendAutoGather;
        // TODO: place/checkPlace/canplace/chat/stop/_random/pingTime/io/importantDirs/tmpObj
        //       needed by Instakill helpers and legacy call-site code.
        place = ctx.place;
        checkPlace = ctx.checkPlace;
        canplace = ctx.canplace;
        chat = ctx.chat;
        stop = ctx.stop;
        _random = ctx._random;
        pingTime = ctx.pingTime;
        io = ctx.io;
        importantDirs = ctx.importantDirs;
        tmpObj = ctx.tmpObj;
        findObjectBySid = ctx.findObjectBySid;
        useWasd = ctx.useWasd;
    }

    getWeaponName(id) {
        return this.weaponNames[id] || ("weapon_" + String(id));
    }

    isPacketLogEnabled() {
        return !!(this.root && this.root.configs && this.root.configs.packetLogs);
    }

    packetLog(tag, payload) {
        if (!this.isPacketLogEnabled()) return;
        console.log(tag, payload);
    }

    logReloadUpdate(id, value, sourceTag) {
        return;
    }

    logLocalReloadSnapshot(playerObj, sourceTag) {
        if (!playerObj) return;
        const primaryId = Number(playerObj.primaryIndex);
        const secondaryId = Number(playerObj.secondaryIndex);
        const currentId = Number(playerObj.weaponIndex);
        const turretId = 53;
        const pReload = Number((playerObj.reloads && playerObj.reloads[primaryId]) || 0);
        const sReload = Number((playerObj.reloads && playerObj.reloads[secondaryId]) || 0);
        const cReload = Number((playerObj.reloads && playerObj.reloads[currentId]) || 0);
        const tReload = Number((playerObj.reloads && playerObj.reloads[turretId]) || 0);
        const sig = [primaryId, pReload, secondaryId, sReload, currentId, cReload, tReload].join("|");
        if (playerObj._lastReloadLogSig === sig) return;
        playerObj._lastReloadLogSig = sig;
        const payload = {
            source: sourceTag || "tick",
            primary: { id: primaryId, name: this.getWeaponName(primaryId), reload: pReload },
            secondary: { id: secondaryId, name: this.getWeaponName(secondaryId), reload: sReload },
            current: { id: currentId, name: this.getWeaponName(currentId), reload: cReload },
            turret: { id: turretId, name: this.getWeaponName(turretId), reload: tReload }
        };
        this.root._lastReloadHudPayload = payload;
        if (typeof this.onReloadHudUpdate === "function") this.onReloadHudUpdate(payload);
    }

    updateInstaHud() {
        if (typeof this.onInstaHudUpdate === "function") this.onInstaHudUpdate(this.legacyCtx.instaHUD || null);
    }

    getObjectsInLineOfSight(a, b, useProjectileRadius) {
        const p = this.ensurePlayer(this.mySid);
        const secondaryWeapon = this.items.weapons.find((weapon) => weapon.id === p.weapons[1]);
        const hasProjectile = secondaryWeapon && secondaryWeapon.projectile !== undefined;
        let projectileRadius = 0;
        if (useProjectileRadius && hasProjectile) {
            const projectile = this.items.projectiles[secondaryWeapon.projectile];
            if (projectile && projectile.radius) projectileRadius = projectile.radius;
            else if (projectile && projectile.scale) projectileRadius = projectile.scale / 2;
            else projectileRadius = 14;
        }

        const x1 = Number.isFinite(a.x) ? a.x : a.x2;
        const y1 = Number.isFinite(a.y) ? a.y : a.y2;
        const x2 = Number.isFinite(b.x) ? b.x : b.x2;
        const y2 = Number.isFinite(b.y) ? b.y : b.y2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lineLenSq = dx * dx + dy * dy;
        if (!Number.isFinite(lineLenSq) || lineLenSq <= 0) return [];

        const objects = Array.isArray(this.root.liztobj) ? this.root.liztobj : [];
        const hits = [];
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active || !obj.render) continue;
            if (!obj.getScale) continue;
            if (obj.name && (obj.name.indexOf("trap") !== -1 || obj.name.indexOf("form") !== -1)) continue;

            const radius = (obj.getScale() / 2) + projectileRadius;
            const fx = x1 - obj.x;
            const fy = y1 - obj.y;
            const b2 = 2 * (fx * dx + fy * dy);
            const c = fx * fx + fy * fy - radius * radius;
            let discriminant = b2 * b2 - 4 * lineLenSq * c;
            if (discriminant < 0) continue;

            discriminant = Math.sqrt(discriminant);
            const t1 = (-b2 - discriminant) / (2 * lineLenSq);
            const t2 = (-b2 + discriminant) / (2 * lineLenSq);
            if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) hits.push(obj);
        }
        return hits;
    }

    /**
     * Builds combat scan data consumed by advHeal, insta, and combat movement systems.
     * Uses liztobj for perf (not full gameObjects). Called once per tick from _ha()
     * after enemy/nears/near have been computed.
     *
     * @param {object} p - The local player object.
     * @returns {object} scans
     */
    buildCombatScans(p) {
        const root = this.root;
        const things = this.legacyCtx;
        const near = root.near && root.near.length === 0 ? null : (root.near && root.near.sid != null ? root.near : null);
        const enemy = root.enemy || [];
        const hasNear = near && Number.isFinite(near.x) && Number.isFinite(near.y);

        const scans = {
            meta: {
                nearSid: near && typeof near.sid !== "undefined" ? near.sid : null
            },
            near: {
                prehitTeamDmg: null,
                prehitTeamDmgDist: Infinity,
                trapFound: null,
                trapFoundDist: Infinity,
                hasTeamTrapOnEnemy: false
            },
            player: {
                antiSpikeTick: null,
                antiSpikeTickDist: Infinity
            },
            vel: {
                pos: { x: p.x2, y: p.y2 },
                hasHostileHazard: false
            },
            los: {
                listDefault: [],
                listTight: [],
                solidBlockers: [],
                autoInstaClear: false,
                shieldClear: false,
                millClear: false
            },
            hammer: {
                trap: null,
                trapDist: Infinity,
                closeD: 0,
                inCloseRange: false,
                primaryReady: false,
                secondaryReady: false,
                bothReady: false,
                primaryAllowed: [3, 4, 5].includes(p.weapons[0]),
                dirToTrapEnemyIsIn: hasNear
                    ? (Number.isFinite(near.aim2) ? near.aim2 : UTILS.getDirect(near, p, 0, 2))
                    : (p.dir || 0),
                canRun: false
            }
        };

        // Velocity precompute: knockback push pos from enemy
        if (hasNear) {
            const priId = near.primaryIndex == null ? 5 : near.primaryIndex;
            const knockWeapon = (root.items && root.items.weapons && root.items.weapons[priId]) || {};
            const tmpSpd = (0.3 + (knockWeapon.knock || 0)) * 200;
            scans.vel.pos = {
                x: p.x2 + tmpSpd * Math.cos(near.direct + Math.PI),
                y: p.y2 + tmpSpd * Math.sin(near.direct + Math.PI)
            };
        }

        // Single pass over liztobj for spike + trap scans
        const liztobj = Array.isArray(root.liztobj) ? root.liztobj : [];
        for (let i = 0; i < liztobj.length; i++) {
            const obj = liztobj[i];
            if (!obj || !obj.active) continue;

            if (obj.dmg) {
                if (obj.isTeamObject(p)) {
                    // Team spike overlapping enemy → prehit
                    if (hasNear) {
                        const dNear = UTILS.getDist(obj, near, 0, 3);
                        if (dNear <= (obj.scale + near.scale)) {
                            const d2 = UTILS.getDist(obj, near, 0, 2);
                            if (d2 < scans.near.prehitTeamDmgDist) {
                                scans.near.prehitTeamDmgDist = d2;
                                scans.near.prehitTeamDmg = obj;
                            }
                        }
                    }
                } else {
                    // Hostile spike near vel-pos
                    if (UTILS.getDist(obj, scans.vel.pos, 0, 0) <= (p.scale + obj.scale)) {
                        scans.vel.hasHostileHazard = true;
                    }
                    // Hostile spike near player → antiSpikeTick
                    const dPlayer = UTILS.getDist(obj, p, 0, 3);
                    if (dPlayer < (obj.scale + p.scale)) {
                        const d2 = UTILS.getDist(obj, p, 0, 2);
                        if (d2 < scans.player.antiSpikeTickDist) {
                            scans.player.antiSpikeTickDist = d2;
                            scans.player.antiSpikeTick = obj;
                        }
                    }
                }
            }

            // Team trap overlapping enemy
            if (obj.trap && obj.isTeamObject(p) && hasNear) {
                const trapScale = typeof obj.getScale === "function" ? obj.getScale() : obj.scale;
                const d2 = UTILS.getDist(obj, near, 0, 2);
                if (d2 <= (near.scale + trapScale + 5) && d2 < scans.near.trapFoundDist) {
                    scans.near.trapFoundDist = d2;
                    scans.near.trapFound = obj;
                }
            }
        }

        scans.near.hasTeamTrapOnEnemy = !!scans.near.trapFound;

        // LOS: from near (enemy) to player
        if (hasNear) {
            const losFn = root.safeGetObjectsInLineOfSight;
            const losDefault = losFn(near, p, 0);
            const losTight = losFn(near, p, 1);
            scans.los.listDefault = Array.isArray(losDefault) ? losDefault : [];
            scans.los.listTight = Array.isArray(losTight) ? losTight : [];
            for (let li = 0; li < scans.los.listDefault.length; li++) {
                const losObj = scans.los.listDefault[li];
                if (losObj && !losObj.ignoreCollision) scans.los.solidBlockers.push(losObj);
            }
            scans.los.autoInstaClear = !scans.los.listTight.some(o => !o.name ? true : o.ignoreCollision);
            scans.los.shieldClear = !scans.los.listTight.some(o => !o.name ? true : !o.ignoreCollision);
            scans.los.millClear = !scans.los.listDefault.some(o => !o.name ? true : o.name.includes("mill"));
        }

        // Hammer trap: best team trap near enemy
        const hammerTrap = scans.near.trapFound || things.nearTrap || things.trapFound || null;
        scans.hammer.trap = hammerTrap;
        if (hammerTrap) {
            const trapScale = (typeof hammerTrap.getScale === "function" ? hammerTrap.getScale() : hammerTrap.scale) || 0;
            scans.hammer.trapDist = UTILS.getDist(p, hammerTrap, 2, 0);
            scans.hammer.closeD = trapScale + ((p.scale ?? 35) / 2);
            scans.hammer.inCloseRange = scans.hammer.trapDist < scans.hammer.closeD;
        }

        // Readiness
        const pingTime = Number(things.pingTime || 0);
        scans.hammer.primaryReady = (p.reloads && p.reloads[p.weapons[0]] <= pingTime);
        scans.hammer.secondaryReady = (p.reloads && p.reloads[p.weapons[1]] <= pingTime);
        scans.hammer.bothReady = scans.hammer.primaryReady && scans.hammer.secondaryReady;

        // canRun
        const configs = things.configs || root.configs || {};
        const instaC = root.instaC || {};
        scans.hammer.canRun =
            !!configs.hammerInsta &&
            !instaC.isTrue &&
            scans.hammer.primaryAllowed &&
            !!scans.hammer.trap &&
            scans.hammer.inCloseRange &&
            scans.hammer.bothReady;

        // Store
        root.scans = scans;
        things.info = scans;
        things.scans = scans;

        // Mirror legacy-compatible fields
        things.nearSpikeInfo = scans.player.antiSpikeTick || null;
        root.nearSpikeInfo = scans.player.antiSpikeTick || null;

        // TODO(advHeal): scans.near.trapFound feeds hammerInsta trap detection.
        // TODO(advHeal): scans.player.antiSpikeTick feeds antiSpike reaction timing.
        // TODO(advHeal): scans.los.autoInstaClear gates auto-insta eligibility.
        // TODO(advHeal): scans.hammer.canRun gates hammerInsta trigger.

        return scans;
    }

    updatePlayerKinematics(playerObj) {
        const gameObj = this.root.game;
        playerObj._prevX2 ??= playerObj.x2;
        playerObj._prevY2 ??= playerObj.y2;
        playerObj._prevT ??= gameObj.lastTick;
        const dt = Math.max(1, gameObj.lastTick - playerObj._prevT);
        const vx = (playerObj.x2 - playerObj._prevX2) / dt;
        const vy = (playerObj.y2 - playerObj._prevY2) / dt;
        const a = 0.6;
        playerObj._vx = Number.isFinite(playerObj._vx) ? a * playerObj._vx + (1 - a) * vx : vx;
        playerObj._vy = Number.isFinite(playerObj._vy) ? a * playerObj._vy + (1 - a) * vy : vy;
        playerObj._prevX2 = playerObj.x2;
        playerObj._prevY2 = playerObj.y2;
        playerObj._prevT = gameObj.lastTick;
    }

    wanderTick() {
        const autoGoOn = !!(this.root.my && this.root.my.autoGo) || !!this.root.autoGo;
        const wandering = autoGoOn && (this.root.millDone !== undefined ? !this.root.millDone : true);
        if (!wandering || (this.traps && this.traps.inTrap)) return;
        // Legacy currently returns here before the heavier wander path logic.
    }

    drainTextStack() {
        const stack = this.textManager.stack;
        if (!stack.length) return;
        let num = 0;
        let num2 = 0;
        let pos = { x: null, y: null };
        let pos2 = { x: null, y: null };
        for (let i = 0; i < stack.length; i++) {
            const text = stack[i];
            if (text.value >= 0) {
                if (num === 0) pos = { x: text.x, y: text.y };
                num += Math.abs(text.value);
            } else {
                if (num2 === 0) pos2 = { x: text.x, y: text.y };
                num2 += Math.abs(text.value);
            }
        }
        if (num2 > 0) this.textManager.showText(pos2.x, pos2.y, Math.max(45, Math.min(50, num2)), 0.18, 500, num2, "#8ecc51");
        if (num > 0) this.textManager.showText(pos.x, pos.y, Math.max(45, Math.min(50, num)), 0.18, 500, num, "#fff");
        this.textManager.stack = [];
    }

    checkProjectileHolder(x, y, dir, range, speed, indx, layer, sid) {
        const weaponIndx = indx == 0 ? 9 : indx == 2 ? 12 : indx == 3 ? 13 : indx == 5 ? 15 : undefined;
        const projOffset = this.root.config.playerScale * 2;
        const projXY = {
            x: indx == 1 ? x : x - projOffset * Math.cos(dir),
            y: indx == 1 ? y : y - projOffset * Math.sin(dir)
        };
        let nearPlayer = null;
        let nearDist = Infinity;
        for (let i = 0; i < this.players.length; i++) {
            const candidate = this.players[i];
            if (!candidate.visible) continue;
            const dist = UTILS.getDist(projXY, candidate, 0, 2);
            if (dist <= candidate.scale && dist < nearDist) {
                nearDist = dist;
                nearPlayer = candidate;
            }
        }
        if (!nearPlayer) return;
        if (indx == 1) {
            nearPlayer.shooting[53] = 1;
        } else {
            nearPlayer.shootIndex = weaponIndx;
            nearPlayer.shooting[1] = 1;
        }
    }

    drainRunAtNextTick() {
        const queue = this.runAtNextTick.length ? this.runAtNextTick : (Array.isArray(this.root.runAtNextTick) ? this.root.runAtNextTick : []);
        if (!queue.length) return;
        for (let i = 0; i < queue.length; i++) this.checkProjectileHolder(...queue[i]);
        queue.length = 0;
        this.runAtNextTick = queue;
        this.root.runAtNextTick = queue;
    }

    _findPlayerBySid(sid) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].sid === sid) return this.players[i];
        }
        return null;
    }

    _findObjectBySid(sid) {
        for (let i = 0; i < this.gameObjects.length; i++) {
            if (this.gameObjects[i].sid === sid) return this.gameObjects[i];
        }
        return null;
    }

    _findAIBySid(sid) {
        for (let i = 0; i < this.ais.length; i++) {
            if (this.ais[i].sid === sid) return this.ais[i];
        }
        return null;
    }

    pathCellToWorld(node) {
        const pf = this.root.pathFind;
        const p = this.ensurePlayer(this.mySid);
        if (!p || !node) return null;
        return {
            x: (p.x2 - (pf.scale / 2)) + ((pf.scale / pf.grid) * node.x),
            y: (p.y2 - (pf.scale / 2)) + ((pf.scale / pf.grid) * node.y)
        };
    }

    isValidPathTarget(pos) {
        return !!(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y));
    }

    clearPathfinderState() {
        const pf = this.root.pathFind;
        pf.array = [];
        this.root.importantDirs = this.root.importantDirs || {};
        delete this.root.importantDirs.pathFinded;
    }

    _buildPathGridAndGoal(pos, player, pf) {
        const gridSize = Math.max(24, Number(pf.grid) || 100);
        const scale = Number(pf.scale) || 1400;
        const cell = scale / gridSize;
        const ox = player.x2 - scale / 2;
        const oy = player.y2 - scale / 2;
        const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

        for (let i = 0; i < this.gameObjects.length; i++) {
            const obj = this.gameObjects[i];
            if (!obj || !obj.active) continue;
            const rx = Number(obj.x);
            const ry = Number(obj.y);
            if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
            const rs = Number(typeof obj.getScale === "function" ? obj.getScale() : obj.scale) || 0;
            if (rs <= 0) continue;
            const minX = Math.max(0, Math.floor((rx - rs - ox) / cell));
            const maxX = Math.min(gridSize - 1, Math.ceil((rx + rs - ox) / cell));
            const minY = Math.max(0, Math.floor((ry - rs - oy) / cell));
            const maxY = Math.min(gridSize - 1, Math.ceil((ry + rs - oy) / cell));
            for (let gy = minY; gy <= maxY; gy++) {
                for (let gx = minX; gx <= maxX; gx++) {
                    const cx = ox + (gx + 0.5) * cell;
                    const cy = oy + (gy + 0.5) * cell;
                    const d = Math.hypot(cx - rx, cy - ry);
                    if (d <= rs + Number(player.scale || 35) * 0.45) grid[gy][gx] = 1;
                }
            }
        }

        const sx = Math.floor(gridSize / 2);
        const sy = Math.floor(gridSize / 2);
        const ex = Math.max(0, Math.min(gridSize - 1, Math.floor((pos.x - ox) / cell)));
        const ey = Math.max(0, Math.min(gridSize - 1, Math.floor((pos.y - oy) / cell)));
        pf.lastX = ex;
        pf.lastY = ey;
        if (grid[sy] && grid[sy][sx] !== 0) grid[sy][sx] = 0;
        return { grid, sx, sy, ex, ey };
    }

    Pathfinder(pos, one, two, pushinng) {
        const p = this.ensurePlayer(this.mySid);
        if (!p) return false;
        if (!this.isValidPathTarget(pos)) {
            this.clearPathfinderState();
            this.root.pathFind.active = false;
            return false;
        }
        const pf = this.root.pathFind;
        const cfg = this.legacyCtx.config || this.root.config || _config || {};
        pf.active = true;
        pf.scale = (Number(cfg.maxScreenWidth || 1920) / (10 / 9)) * 1.3;

        const { grid, sx, sy, ex, ey } = this._buildPathGridAndGoal(pos, p, pf);
        this.easystar.setGrid(grid);
        this.easystar.setAcceptableTiles([0]);
        this.easystar.enableDiagonals();
        this.easystar.enableSync();

        let outPath = null;
        this.easystar.findPath(sx, sy, ex, ey, (path) => {
            outPath = path;
        });
        this.easystar.calculate();

        if (!Array.isArray(outPath) || outPath.length < 2) {
            pf.array = [];
            this.root.importantDirs = this.root.importantDirs || {};
            delete this.root.importantDirs.pathFinded;
            return false;
        }

        pf.array = outPath;
        const next = outPath[1];
        const nextWorld = this.pathCellToWorld(next);
        if (!nextWorld) return false;
        this.root.importantDirs = this.root.importantDirs || {};
        this.root.importantDirs.pathFinded = UTILS.getDirect(nextWorld, p, 0, 2);
        this.root.packet("9", this.root.importantDirs.pathFinded, 1);
        return true;
    }

    calledTickCalc(p) {
        const root = this.root;
        // Use legacyCtx as the authoritative source; root._things is kept in sync by syncLegacyCombatRefs.
        const things = this.legacyCtx;
        const cfg = this.legacyCtx.config || (root.config && typeof root.config === "object" ? root.config : {});
        const player = p || this.ensurePlayer(this.mySid);
        if (!player) return;

        // 1) liztobj / render culling parity (adapted to local player + this.gameObjects)
        const liztobj = Array.isArray(root.liztobj) ? root.liztobj : [];
        const gameObjects = Array.isArray(this.gameObjects) ? this.gameObjects : [];
        const inGame = this.inGame !== false;
        const defaultRange = (root.defaultRange && typeof root.defaultRange === "object")
            ? root.defaultRange
            : { range: 1000 };
        const px = Number.isFinite(player.x) ? player.x : player.x2;
        const py = Number.isFinite(player.y) ? player.y : player.y2;
        if (gameObjects.length && inGame && Number.isFinite(px) && Number.isFinite(py)) {
            const nextLiz = [];
            const inRange = Number(defaultRange.range || 1000);
            const inRangeSq = inRange * inRange;
            for (let i = 0; i < gameObjects.length; i++) {
                const tmp = gameObjects[i];
                if (!tmp) continue;
                const tx = Number.isFinite(tmp.x) ? tmp.x : tmp.x2;
                const ty = Number.isFinite(tmp.y) ? tmp.y : tmp.y2;
                if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
                const dx = tx - px;
                const dy = ty - py;
                if (dx * dx + dy * dy <= inRangeSq) {
                    nextLiz.push(tmp);
                    tmp.render = true;
                } else {
                    tmp.render = false;
                }
            }
            root.liztobj = nextLiz;
        }
        if (this.game) {
            const lizLive = Array.isArray(root.liztobj) ? root.liztobj : liztobj;
            this.game.setState("liztobj", lizLive);
            this.game.setState("closeObjects", lizLive);
        }

        // 2) water wave tick state parity (adapted)
        if (!root.firstSetup) {
            if (!Number.isFinite(root.waterMult)) root.waterMult = 1;
            if (!Number.isFinite(root.waterPlus) || root.waterPlus === 0) root.waterPlus = 1;
            const delta = Number.isFinite(root.delta) ? root.delta : 1;
            const speed = Number.isFinite(cfg.waveSpeed) ? cfg.waveSpeed : 0.0001;
            const waveMax = Number.isFinite(cfg.waveMax) ? cfg.waveMax : 1.3;
            root.waterMult += root.waterPlus * speed * delta;
            if (root.waterMult >= waveMax) {
                root.waterMult = waveMax;
                root.waterPlus = -1;
            } else if (root.waterMult <= 1) {
                root.waterMult = 1;
                root.waterPlus = 1;
            }
            things.waterState = root.waterMult;
        }

        // 3) enemy range + lead prediction parity (adapted + guarded)
        things.enemyRange = null;
        things.lead = null;
        const enemyWrap = things.enemy && things.enemy.enemy ? things.enemy.enemy : null;
        if (enemyWrap) {
            const weapons = Array.isArray(root.weapons) ? root.weapons : [];
            const enemyPrimary = enemyWrap.primaryIndex || 5;
            const enemyWep = weapons.find((w) => w && w.id === enemyPrimary) || {};
            things.enemyRange = Number(enemyWep.range || 0) + Number(enemyWrap.scale || 0) + 25;

            const secWep = weapons.find((w) => w && w.id === player.secondaryIndex) || {};
            const projId = secWep.projectile;
            const projectiles = things.items && things.items.projectiles ? things.items.projectiles : null;
            const proj = (projId != null && projectiles && projectiles[projId]) ? projectiles[projId] : (projectiles ? projectiles[1] : { speed: 0 });
            const speed = Number(proj && proj.speed) || 0;
            if (things.player && typeof things.player.predictAim === "function") {
                things.lead = things.player.predictAim(enemyWrap, speed, projId);
            }
        }

        // 4) danger sim parity hooks (call-through if legacy helper exists)
        if (typeof root.knockBackPredictEnemyToPlayer === "function") {
            let willDieData = null;
            let willDie = false;
            let index = null;
            for (let i = 2; i <= 5; i++) {
                for (let j = 2; j <= 5; j++) {
                    const result = root.knockBackPredictEnemyToPlayer(String(i), String(j));
                    if (result && (result.willDie || result.hitPos || result.x !== undefined)) {
                        willDieData = result;
                        willDie = !!result.willDie || true;
                        index = `${i}:${j}`;
                        i = 999;
                        break;
                    }
                }
            }
            try {
                const r0 = root.knockBackPredictEnemyToPlayer("", "");
                if (r0 && (r0.willDie || r0.hitPos || r0.x !== undefined)) {
                    willDieData = r0;
                    willDie = !!r0.willDie || true;
                    index = "None";
                }
            } catch (err) {
                console.error("[NozoSingle:TickCalc:knockBackPredictEnemyToPlayer:None]", err);
                throw err;
            }
            things.willDie = willDie;
            things.willDieData = willDieData;
            things.willDieIndex = index;
        }

        // 5) path + wander cache parity (guarded)
        things.path = null;
        if (root.pathFind && root.pathFind.active && Array.isArray(root.pathFind.array) && (root.pathFind.chaseNear ? (Array.isArray(root.enemy) && root.enemy.length) : true)) {
            const out = [];
            for (let i = 0; i < root.pathFind.array.length; i++) {
                const node = root.pathFind.array[i];
                out.push(root.pathCellToWorld(node));
            }
            things.path = out;
        }

        things.wanderWorld = null;
        if (things.wander && Array.isArray(things.wander.path) && things.wander.plan && things.wander.path.length > 1) {
            const wp = things.wander.plan;
            const path = things.wander.path;
            const wout = [];
            for (let i = 0; i < path.length; i++) {
                const n = path[i];
                wout.push({
                    x: Number(wp.x1 || 0) + (Number(n.x || 0) + 0.5) * Number(wp.cell || 1),
                    y: Number(wp.y1 || 0) + (Number(n.y || 0) + 0.5) * Number(wp.cell || 1)
                });
            }
            things.wanderWorld = wout;
        }

        // 7) insta-keys HUD metrics (compute; drawing later). Keep legacy priority:
        //    hammer/insta target trap first, local in-trap info only as a fallback.
        things.instaHUD = null;
        (() => {
            const fallbackTrap = this.traps.info && this.traps.info.active ? this.traps.info : null;
            const trap = things.nearTrap || things.trap || fallbackTrap;
            if (!trap || !player) return;

            const trapR = trap.getScale();
            const gap = UTILS.getDistance(player.x2, player.y2, trap.x, trap.y) - (trapR + player.scale);

            const R2 = { reachP: null, reachS: null, widP: null, widS: null };
            if (things.canHit_2) {
                const outP = things.canHit_2(true, trap);
                const outS = things.canHit_2(false, trap);
                R2.reachP = !!outP.canHit;
                R2.widP = outP.usedID ?? null;
                R2.reachS = !!outS.canHit;
                R2.widS = outS.usedID ?? null;
            }

            let plan = null;
            if (trap.health != null && player.primaryIndex != null && player.secondaryIndex != null) {
                const pW = things.items.weapons[player.primaryIndex];
                const sW = things.items.weapons[player.secondaryIndex];
                const pVar = cfg.weaponVariants[player.primaryVariant].val;
                const sVar = cfg.weaponVariants[player.secondaryVariant].val;
                const pDmg = pW.dmg * pVar * (pW.sDmg || 1);
                const sBase = sW.dmg * sVar * (sW.sDmg || 1);
                const sDmg = sBase * (player.skins[40] ? 3.3 : 1);
                const hp = trap.health;
                const EPS = 1e-6;
                if (hp < pDmg) {
                    plan = { can: true, secondarySwings: 0, primarySwings: 1, totalSwings: 1, afterS: hp, overkill: pDmg - hp, sequence: "P" };
                } else if (sDmg > 0) {
                    const secondarySwings = Math.max(0, Math.ceil((hp - pDmg + EPS) / sDmg));
                    const afterS = hp - secondarySwings * sDmg;
                    plan = afterS < pDmg
                        ? {
                            can: true,
                            secondarySwings,
                            primarySwings: 1,
                            totalSwings: secondarySwings + 1,
                            afterS,
                            overkill: pDmg - Math.max(0, afterS),
                            sequence: secondarySwings > 0 ? `Sx${secondarySwings}+P` : "P"
                        }
                        : { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS, overkill: 0, sequence: "-" };
                } else {
                    plan = { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS: hp, overkill: 0, sequence: "-" };
                }
            }

            things.instaHUD = {
                trapR,
                gap,
                reachP: R2.reachP, reachS: R2.reachS,
                widP: R2.widP, widS: R2.widS,
                plan
            };
        })();
    }

    applySpawnUiOnce() {
        if (this.spawnUiApplied) return;
        const ui = this.game && this.game.modules ? this.game.modules.ui : null;
        if (!ui || typeof ui.styleGameUI_NoBars !== "function") return;
        ui.styleGameUI_NoBars();
        this.spawnUiApplied = true;
        this.inGame = true;
        console.log("[NozoSingle] applied game UI styles on first spawn");
    }

    ensurePlayer(sid) {
        if (!this.game) return null;
        let p = this.game.getState("player", null);
        if (!(p instanceof Player)) {
            p = new Player(sid);
            this.game.setState("player", p);
            this.game.player = p;
        }
        if (sid != null && p.sid == null) p.sid = sid;
        return p;
    }

    _gmGet(key, fallback) {
        try {
            if (typeof this.root.GM_getValue === "function") {
                return this.root.GM_getValue(key, fallback);
            }
        } catch (err) {
            console.error("[NozoSingle:GM:getValue]", err);
            throw err;
        }
        return fallback;
    }

    _gmSet(key, value) {
        try {
            if (typeof this.root.GM_setValue === "function") {
                this.root.GM_setValue(key, value);
                return true;
            }
        } catch (err) {
            console.error("[NozoSingle:GM:setValue]", err);
            throw err;
        }
        return false;
    }

    _handleKysGate(p) {
        const sid = p && p.sid != null ? p.sid : this.mySid;
        if (sid == null) return false;
        const kysVal = this._gmGet("kys", "");
        if (!(kysVal === "all" || String(kysVal) === String(sid))) return false;

        if (String(kysVal) === String(sid)) {
            this._gmSet("kys", "");
            try {
                if (typeof this.root.sendUpdate === "function") {
                    this.root.sendUpdate("kys", "", 0);
                }
            } catch (err) {
                console.error("[NozoSingle:Kys:sendUpdate]", err);
                throw err;
            }
        }

        this.root.leaving = true;
        try {
            if (typeof this.root.leave === "function") this.root.leave();
        } catch (err) {
            console.error("[NozoSingle:Kys:leave]", err);
            throw err;
        }
        try {
            if (typeof this.root.close === "function") this.root.close();
        } catch (err) {
            console.error("[NozoSingle:Kys:close]", err);
            throw err;
        }
        return true;
    }

    handlePacket(type, data) {
        const p = this.ensurePlayer(this.mySid);
        if (!p) return;
        const t = String(type);
        // Strict safe dispatch: explicit switch prevents any dynamic prototype access.
        switch (t) {
            case "C": return this._hC(p, data);
            case "a": return this._ha(p, data);
            case "N": return this._hN(p, data);
            case "O": return this._hO(p, data);
            case "S": return this._hS(p, data);
            case "V": return this._hV(p, data);
            case "A": return this._hA(p, data);
            case "D": return this._hD(p, data);
            case "E": return this._hE(p, data);
            case "G": return this._hG(p, data);
            case "H": return this._hH(p, data);
            case "I": return this._hI(p, data);
            case "J": return this._hJ(p, data);
            case "K": return this._hK(p, data);
            case "L": return this._hL(p, data);
            case "M": return this._hM(p, data);
            case "P": return this._hP(p, data);
            case "Q": return this._hQ(p, data);
            case "R": return this._hR(p, data);
            case "T": return this._hT(p, data);
            case "U": return this._hU(p, data);
            case "X": return this._hX(p, data);
            case "Y": return this._hY(p, data);
            case "0": return this._h0(p, data);
            case "1": return this._h1(p, data);
            case "2": return this._h2(p, data);
            case "3": return this._h3(p, data);
            case "4": return this._h4(p, data);
            case "5": return this._h5(p, data);
            case "6": return this._h6(p, data);
            case "7": return this._h7(p, data);
            case "8": return this._h8(p, data);
            case "9": return this._h9(p, data);
            default: this.packetLog("[Packet:unhandled]", { type: t }); break;
        }
    }

    _norm(data, preserveNestedSingleArray) {
        const arr = Array.isArray(data) ? data : [data];
        if (preserveNestedSingleArray) return arr;
        return (arr.length === 1 && Array.isArray(arr[0])) ? arr[0] : arr;
    }

    // C: setupGame â€” server sends our SID on spawn
    _hC(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        if (sid != null) {
            this.mySid = sid;
            p.sid = sid;
        }
    }

    // a: updatePlayers â€” bulk position tick (13 fields per player)
    _ha(p, data) {
        if (this._handleKysGate(p)) return;
        const args = this._norm(data, true);
        const tupleList = Array.isArray(args[0]) ? args[0] : args;
        let updatedSelf = false;
        for (let i = 0; i + 13 <= tupleList.length; i += 13) {
            const sid = tupleList[i];
            if (this.mySid != null && sid === this.mySid) {
                p.applyTuple(tupleList, i);
                this.applySpawnUiOnce();
                updatedSelf = true;
                break;
            }
        }

        if (!updatedSelf) return;
        this.syncLegacyCombatRefs(p);

        // Ported section (kept in-order from source): shame resync + tick prelude + near caches reset.
        const my = this.root.my;
        const mills = this.root.mills;
        const oldXY = this.root.oldXY;
        const shameCount = Number(p.shameCount != null ? p.shameCount : (p.shameTransitions || 0));
        my.reSync = shameCount > 0;

        if (!mills.x || !oldXY.x) mills.x = oldXY.x = p.x2;
        if (!mills.y || !oldXY.y) mills.y = oldXY.y = p.y2;

        this.root.dPacketTracker.dirs = [];
        this.root.game.tick = Number(this.root.game.tick || 0) + 1;
        if (p.alive && this.inGame) {
            const actions = this.root.game.tickQueue[this.root.game.tick];
            if (actions) {
                actions.forEach((action) => action());
                this.root.game.tickQueue[this.root.game.tick] = null;
            }
        }

        const safeGetObjectsInLineOfSight = (fromObj, toObj, mode = 0) => {
            if (!fromObj || !toObj) return [];
            const fx = Number.isFinite(fromObj.x) ? fromObj.x : fromObj.x2;
            const fy = Number.isFinite(fromObj.y) ? fromObj.y : fromObj.y2;
            const tx = Number.isFinite(toObj.x) ? toObj.x : toObj.x2;
            const ty = Number.isFinite(toObj.y) ? toObj.y : toObj.y2;
            if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(tx) || !Number.isFinite(ty)) return [];
            const res = this.root.getObjectsInLineOfSight(fromObj, toObj, mode);
            return Array.isArray(res) ? res.filter(Boolean) : [];
        };
        this.root.safeGetObjectsInLineOfSight = safeGetObjectsInLineOfSight;
        this.wanderTick();

        this.root.nearSpikeInfo = {};
        const tickNow = performance.now();
        const nowMs = Date.now();
        this.root.nowMs = nowMs;
        this.root.game.tickSpeed = tickNow - this.root.game.lastTick;
        this.root.game.lastTick = tickNow;

        for (let i = 0; i < this.players.length; i++) {
            const tmp = this.players[i];
            tmp.forcePos = !tmp.visible;
            tmp.visible = false;
        }

        if (!Array.isArray(this.root.phantom)) this.root.phantom = [];
        if (this.root.phantom.length > 0) {
            for (let i = 0; i < this.root.phantom.length; i++) {
                const build = this.root.phantom[i];
                this.objectManager.disableBySid(build.sid);
            }
            this.root.phantom = [];
        }

        if (!Array.isArray(this.root.breakObjects)) this.root.breakObjects = [];
        const gameObjectsRef = this.gameObjects;
        const liztobjRef = Array.isArray(this.root.liztobj) ? this.root.liztobj : [];
        for (let i = 0, len = tupleList.length; i < len; i += 13) {
            const sid = tupleList[i];
            const tmpObj = this._findPlayerBySid(sid);
            if (!tmpObj) continue;

            tmpObj.t1 = (tmpObj.t2 === undefined) ? this.root.game.lastTick : tmpObj.t2;
            tmpObj.t2 = this.root.game.lastTick;
            tmpObj.oldPos.x2 = tmpObj.x2;
            tmpObj.oldPos.y2 = tmpObj.y2;
            tmpObj.x1 = tmpObj.x;
            tmpObj.y1 = tmpObj.y;
            tmpObj.direct = UTILS.getDirect(tmpObj, p, 2, 2);
            tmpObj.x2 = tupleList[i + 1];
            tmpObj.y2 = tupleList[i + 2];
            tmpObj.x3 = tmpObj.x2 + (tmpObj.x2 - tmpObj.oldPos.x2);
            tmpObj.y3 = tmpObj.y2 + (tmpObj.y2 - tmpObj.oldPos.y2);
            tmpObj.x4 = tmpObj.x3 + (tmpObj.x3 - tmpObj.x2);
            tmpObj.y4 = tmpObj.y3 + (tmpObj.y3 - tmpObj.y2);
            tmpObj.x5 = tmpObj.x4 + (tmpObj.x4 - tmpObj.x3);
            tmpObj.y5 = tmpObj.y4 + (tmpObj.y4 - tmpObj.y3);
            tmpObj.d1 = (tmpObj.d2 === undefined) ? tupleList[i + 3] : tmpObj.d2;
            tmpObj.d2 = tupleList[i + 3];
            tmpObj.dt = 0;
            tmpObj.buildIndex = tupleList[i + 4];
            tmpObj.weaponIndex = tupleList[i + 5];
            tmpObj.weaponVariant = tupleList[i + 6];
            tmpObj.team = tupleList[i + 7];
            tmpObj.isLeader = tupleList[i + 8];
            tmpObj.oldSkinIndex = tmpObj.skinIndex;
            tmpObj.oldTailIndex = tmpObj.tailIndex;
            tmpObj.skinIndex = tupleList[i + 9];
            tmpObj.tailIndex = tupleList[i + 10];
            tmpObj.iconIndex = tupleList[i + 11];
            tmpObj.zIndex = tupleList[i + 12];
            tmpObj.visible = true;
            tmpObj.lu = nowMs;
            tmpObj.update(this.root.game.tickSpeed);
            tmpObj.dist = UTILS.getDist(tmpObj, p, 0, 0);
            tmpObj.dist2 = UTILS.getDist(tmpObj, p, 2, 2);
            tmpObj.aim2 = UTILS.getDirect(tmpObj, p, 2, 2);
            tmpObj.dist3 = UTILS.getDist(tmpObj, p, 3, 3);
            tmpObj.aim3 = UTILS.getDirect(tmpObj, p, 3, 3);
            tmpObj.dist4 = UTILS.getDist(tmpObj, p, 4, 4);
            tmpObj.aim4 = UTILS.getDirect(tmpObj, p, 4, 4);
            tmpObj.dist5 = UTILS.getDist(tmpObj, p, 5, 5);
            tmpObj.aim5 = UTILS.getDirect(tmpObj, p, 5, 5);
            tmpObj.damageThreat = 0;
            if (tmpObj.skinIndex == 45 && tmpObj.shameTimer <= 0) tmpObj.addShameTimer();
            if (tmpObj.oldSkinIndex == 45 && tmpObj.skinIndex != 45) {
                tmpObj.shameTimer = 0;
                tmpObj.shameCount = 0;
            }
            if (p.sid == tmpObj.sid) {
                const scanObjectsRef = liztobjRef.length ? liztobjRef : gameObjectsRef;
                if (scanObjectsRef.length) {
                    let turretsCanHit = 0;
                    const ownerSid = tmpObj.sid;
                    const weaponRange = this.items.weapons[tmpObj.weapons[0]].range;
                    const breakRange = parseInt(getEl("breakRange").value) || 0;
                    const needThreatScan = liztobjRef.length > 0;
                    const nearObjsTmp = [];
                    const localScans = {
                        nearTrap: null,
                        nearTrapDist: Infinity,
                        nearSpike: null,
                        nearSpikeDist: Infinity
                    };
                    for (let g = 0; g < scanObjectsRef.length; g++) {
                        const tmp = scanObjectsRef[g];
                        tmp.onNear = false;
                        if (!tmp.active) continue;
                        const tmpDist = UTILS.getDist(tmp, tmpObj, 0, 2);
                        if (tmpDist <= tmp.scale + weaponRange) tmp.onNear = true;
                        if (tmp.isItem && tmp.owner) {
                            if (tmp.name == "turret" && UTILS.getDist(p, tmp, 2, 0) < 680 && !tmp.isTeamObject(tmpObj)) turretsCanHit++;
                        }
                        if (tmp.isItem && tmp.owner) {
                            if (!tmp.pps && ownerSid == tmp.owner.sid && tmpDist > breakRange && !tmp.breakObj && ![13, 14, 20].includes(tmp.id)) {
                                tmp.breakObj = true;
                                this.root.breakObjects.push({ x: tmp.x, y: tmp.y, sid: tmp.sid });
                            }
                        }
                        if (tmpDist <= 500) nearObjsTmp.push({ obj: tmp, d: tmpDist });
                        tmpObj.antiTurretSpam = turretsCanHit >= 5;
                        if (!needThreatScan || tmp.isTeamObject(tmpObj)) continue;

                        if (tmp.trap) {
                            const trapScale = tmp.getScale();
                            const trapDist = UTILS.getDist(tmp, tmpObj, 0, 2);
                            if (trapDist <= (tmpObj.scale + trapScale + 5) && trapDist < localScans.nearTrapDist) {
                                localScans.nearTrapDist = trapDist;
                                localScans.nearTrap = tmp;
                            }
                        }

                        const isSpikeName = tmp.name == "spikes" || tmp.name == "poison spikes" || tmp.name == "spinning spikes" || tmp.name == "greater spikes";
                        if (isSpikeName) {
                            const spikeDist = UTILS.getDist(tmp, tmpObj, 0, 2);
                            if (spikeDist <= 120 && spikeDist < localScans.nearSpikeDist) {
                                localScans.nearSpikeDist = spikeDist;
                                localScans.nearSpike = tmp;
                            }
                        }
                    }
                    nearObjsTmp.sort((a, b) => a.d - b.d);
                    this.root.nearObjs = nearObjsTmp.map((entry) => entry.obj);
                    if (liztobjRef.length) {
                        const nearTrap = localScans.nearTrap;
                        const nearTrapDist = localScans.nearTrapDist;
                        const nearSpike = localScans.nearSpike;
                        if (nearTrap) {
                            this.traps.dist = nearTrapDist;
                            this.traps.aim = UTILS.getDirect(nearTrap, tmpObj, 0, 2);
                            if (!this.traps.inTrap) this.traps.protect(this.traps.aim);
                            this.traps.inTrap = true;
                            this.traps.lastHitTime = this.traps.lastHitTime || nowMs;
                            this.traps.info = nearTrap;
                            this.legacyCtx.nearTrap = nearTrap;
                        } else {
                            this.traps.inTrap = false;
                            this.traps.info = {};
                            this.legacyCtx.nearTrap = null;
                        }
                        this.root.nearSpikeInfo = nearSpike || null;
                        this.autoBreaker.priority = [[], [], [], []];
                        const _abNearSpikeEntries = [];
                        const _abTTBObjects = [];
                        const _abTypeNullObjects = [];
                        for (let i = 0; i < liztobjRef.length; i++) {
                            const e = liztobjRef[i];
                            if (!e.active) continue;
                            if (e.type == null) _abTypeNullObjects.push(e);
                            const notTeam = !e.isTeamObject(p);
                            if (notTeam) {
                                if (e.dmg) {
                                    const dist = UTILS.getDist(e, p, 0, 2);
                                    if (dist <= 169) _abNearSpikeEntries.push({ obj: e, dist });
                                }
                                if (e.name == "turret" || e.name == "teleporter" || e.name == "blocker") {
                                    _abTTBObjects.push(e);
                                }
                            }
                        }
                        _abNearSpikeEntries.sort((a, b) => a.dist - b.dist);
                        const _abNearSpikes = _abNearSpikeEntries.map(entry => entry.obj);
                        if (this.traps.inTrap) {
                            [_abNearSpikes[0], this.traps.info, _abNearSpikes[1]].forEach(item => {
                                if (item && !this.autoBreaker.priority[0].includes(item)) this.autoBreaker.priority[0].push(item);
                            });
                        }
                        if (getEl("breakSpikeSwitch").checked) {
                            _abNearSpikes.forEach(spike => {
                                if (!this.autoBreaker.priority[1].includes(spike)) this.autoBreaker.priority[1].push(spike);
                            });
                        }
                        if (this.root.configs.breakTTB) {
                            _abTTBObjects.forEach(obj => {
                                if (!this.autoBreaker.priority[2].includes(obj)) this.autoBreaker.priority[2].push(obj);
                            });
                        }
                        if (this.root.configs.breakAll) {
                            _abTypeNullObjects.forEach(obj => {
                                if (!this.autoBreaker.priority[3].includes(obj)) this.autoBreaker.priority[3].push(obj);
                            });
                        }
                        this.autoBreaker.calculateAim();
                    } else {
                        this.traps.inTrap = false;
                        this.legacyCtx.nearTrap = null;
                    }
                }
            }
            if (tmpObj.weaponIndex < 9) {
                tmpObj.primaryIndex = tmpObj.weaponIndex;
                tmpObj.primaryVariant = tmpObj.weaponVariant;
            } else if (tmpObj.weaponIndex > 8) {
                tmpObj.secondaryIndex = tmpObj.weaponIndex;
                tmpObj.secondaryVariant = tmpObj.weaponVariant;
            }
            tmpObj.manageReload(
                this.root.game,
                this.items,
                p.sid == tmpObj.sid,
                (selfObj) => this.logLocalReloadSnapshot(selfObj, "a:manageReload")
            );
            this.updatePlayerKinematics(tmpObj);
        }

        this.drainTextStack();
        this.drainRunAtNextTick();

        const enemy = [];
        const nears = [];
        for (let i = 0, len = tupleList.length; i < len; i += 13) {
            const tmpObj = this._findPlayerBySid(tupleList[i]);
            if (!tmpObj) continue;
            if (!tmpObj.isTeam(p)) {
                enemy.push(tmpObj);
                const nearWeaponIndex = (tmpObj.primaryIndex === undefined ? 5 : tmpObj.primaryIndex);
                if (tmpObj.dist2 <= this.items.weapons[nearWeaponIndex].range + (p.scale * 2)) {
                    nears.push(tmpObj);
                }
            }
            if (tmpObj != p) {
                tmpObj.addDamageThreat(p, this.items, this.root.config || _config, this.root.game);
            }
        }
        this.root.enemy = enemy;
        this.root.nears = nears;
        this.root.near = enemy.length ? enemy.slice().sort((a, b) => a.dist2 - b.dist2)[0] : [];

        this.syncLegacyCombatRefs(p);

        // Build combat scans for advHeal / insta / combat movement consumers.
        this.buildCombatScans(p);

        // Use local adapted parity implementation.
        this.calledTickCalc(p);
        this.updateInstaHud();
        this.syncResourceCacheFromObjects();

        const targetPos = this.root.targetPos || (this.root._things && this.root._things.pushTpos) || null;
        const blocked = !!this.root.my.autoPush || !!this.root.my.autoPush2 || !!this.root.instaC.ticking;
        if (targetPos && Number.isFinite(targetPos.x) && Number.isFinite(targetPos.y) && !blocked) {
            this.root.pathFind.active = true;
            this.Pathfinder(targetPos, 0, 0);
        }
    }

    // O: updateHealth(sid, value)
    _hO(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        const hp = args[1];
        const target = this._findPlayerBySid(sid);
        if (target) {
            target.oldHealth = target.health;
            target.health = typeof hp === "number" ? hp : target.health;
            target.judgeShame(this.root.game);
            if (target.oldHealth > target.health) {
                target.damaged = target.oldHealth - target.health;
                this.advHeal.push([sid, hp, target.damaged]);
            }
            return;
        }
        if (this.mySid != null && sid === this.mySid) {
            p.oldHealth = p.health;
            p.health = typeof hp === "number" ? hp : p.health;
            p.judgeShame(this.root.game);
            if (p.oldHealth > p.health) {
                p.damaged = p.oldHealth - p.health;
                this.advHeal.push([sid, hp, p.damaged]);
            }
        }
    }

    // N: updatePlayerValue(index, value) â€” reload timers + generic player props
    _hN(p, data) {
        const args = this._norm(data, false);
        const key = args[0];
        const value = args[1];
        const allowedPlayerValueKeys = {
            wood: 1,
            food: 1,
            stone: 1,
            points: 1,
            kills: 1
        };
        const numericKey = (typeof key === "number")
            ? key
            : (typeof key === "string" && key.trim() !== "" && !Number.isNaN(Number(key)) ? Number(key) : null);
        if (numericKey != null) {
            p.setReload(numericKey, value);
            this.logReloadUpdate(numericKey, value, typeof key === "number" ? "N:num" : "N:numStr");
            this.logLocalReloadSnapshot(p, "N:setReload");
            return;
        }
        if (key && key !== "__proto__" && key !== "constructor" && key !== "prototype") {
            if (allowedPlayerValueKeys[key]) {
                p[key] = value;
                this.packetLog("[Packet:N:prop]", { key, value });
            }
        }
    }

    // V: updateItems(data, wpn) â€” items list or weapons list
    _hV(p, data) {
        const args = this._norm(data, false);
        const itemsOrWeapons = args[0];
        const wpn = !!args[1];
        if (!Array.isArray(itemsOrWeapons)) return;
        if (wpn) {
            p.weapons = itemsOrWeapons.slice();
            p.primaryIndex = p.weapons[0] || 0;
            p.secondaryIndex = p.weapons[1] || 0;
        } else {
            p.items = itemsOrWeapons.slice();
        }
    }

    // S: updateItemCounts(index, value)
    _hS(p, data) {
        const args = this._norm(data, false);
        if (args.length === 2 && typeof args[0] === "number") p.itemCounts[args[0]] = args[1];
        else p.itemCounts = args;
    }

    // A: setInitData(data) â€” stores alliance teams from server
    _hA(p, data) {
        const args = this._norm(data, false);
        const payload = args[0];
        this.items.applyInitCatalog(payload);
        if (this.store && typeof this.store.syncFromRoot === "function") this.store.syncFromRoot();
        this.damages = new Damages(this.items);
        if (payload && payload.teams != null) this.alliances = payload.teams;
        this.packetLog("[Packet:A:setInitData]", { allianceCount: Array.isArray(this.alliances) ? this.alliances.length : null, hasItems: !!this.items });
    }

    // D: addPlayer(data, isYou) â€” data=[id, sid, name, ...], isYou=bool
    _hD(p, data) {
        const arr = Array.isArray(data) ? data : [data];
        let playerData, isYou;
        if (Array.isArray(arr[0])) {
            playerData = arr[0];
            isYou = !!arr[1];
        } else {
            playerData = arr;
            isYou = false;
        }
        const id = playerData[0];
        const sid = playerData[1];
        const name = String(playerData[2] || "");
        let found = null;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id === id) { found = this.players[i]; break; }
        }
        if (!found) {
            found = new Player(sid);
            found.id = id;
            found.name = name;
            this.players.push(found);
        } else {
            found.sid = sid;
            found.name = name;
        }
        if (isYou && this.mySid != null && found.sid == null) found.sid = this.mySid;
        this.packetLog("[Packet:D:addPlayer]", { id, sid, name, isYou });
    }

    // E: removePlayer(id)
    _hE(p, data) {
        const args = this._norm(data, false);
        const id = args[0];
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id === id) {
                this.players.splice(i, 1);
                break;
            }
        }
        this.packetLog("[Packet:E:removePlayer]", { id });
    }

    // G: updateLeaderboard(data) â€” flat array [sid, name, score, ...]
    _hG(p, data) {
        const args = this._norm(data, false);
        this.lastLeaderboardData = args;
        this.packetLog("[Packet:G:updateLeaderboard]", { len: args.length });
    }

    // H: loadGameObject(data) â€” 8 fields per object: sid,x,y,dir,scale,type,dataIndex,ownerSid
    _hH(p, data) {
        const flat = this._norm(data, false);
        for (let i = 0; i + 8 <= flat.length; i += 8) {
            const sid = flat[i];
            const x = flat[i + 1], y = flat[i + 2];
            const dir = flat[i + 3], scale = flat[i + 4];
            const type = flat[i + 5], dataIndex = flat[i + 6];
            const ownerSid = flat[i + 7];
            const ownerObj = ownerSid != null ? (this._findPlayerBySid(ownerSid) || { sid: ownerSid }) : null;
            const itemData = (this.items && Array.isArray(this.items.list)) ? (this.items.list[dataIndex] || {}) : {};
            this.objectManager.add(sid, x, y, dir, scale, type, itemData, true, ownerObj);
        }
        this.syncResourceCacheFromObjects();
        this.packetLog("[Packet:H:loadGameObject]", { entries: Math.floor(flat.length / 8) });
    }

    // I: loadAI(data) â€” 7 fields per AI: sid,index,x,y,dir,health,cowNameIdx
    _hI(p, data) {
        const flat = this._norm(data, false);
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        for (let i = 0; i < this.ais.length; i++) this.ais[i].visible = false;
        for (let i = 0; i + 7 <= flat.length; i += 7) {
            const sid = flat[i], index = flat[i + 1];
            const x2 = flat[i + 2], y2 = flat[i + 3];
            const dir = flat[i + 4], health = flat[i + 5];
            let ai = this._findAIBySid(sid);
            if (ai) {
                ai.index = index;
                ai.t1 = ai.t2 !== undefined ? ai.t2 : now;
                ai.t2 = now;
                ai.x1 = ai.x2; ai.y1 = ai.y2;
                ai.x2 = x2; ai.y2 = y2;
                ai.d1 = ai.d2 !== undefined ? ai.d2 : dir;
                ai.d2 = dir;
                ai.health = health;
                ai.dt = 0; ai.visible = true;
            } else {
                ai = this.aiManager.spawnWithSid(sid, x2, y2, dir, index);
                ai.health = health;
                ai.visible = true;
            }
        }
        this.packetLog("[Packet:I:loadAI]", { entries: Math.floor(flat.length / 7) });
    }

    // J: animateAI(sid)
    _hJ(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        const ai = this._findAIBySid(sid);
        if (ai && typeof ai.startAnim === "function") ai.startAnim();
        this.packetLog("[Packet:J:animateAI]", { sid });
    }

    // K: gatherAnimation(sid, didHit, index)
    _hK(p, data) {
        const args = this._norm(data, false);
        const sid = args[0], didHit = args[1], index = args[2];
        const target = this._findPlayerBySid(sid);
        if (target) {
            target.gathering = 1;
            target.gatherIndex = index;
            if (typeof target.startAnim === "function") target.startAnim(didHit, index);
        }
        this.packetLog("[Packet:K:gatherAnim]", { sid, didHit, index });
    }

    // L: wiggleGameObject(dir, sid)
    _hL(p, data) {
        const args = this._norm(data, false);
        const dir = args[0], sid = args[1];
        const obj = this._findObjectBySid(sid);
        if (obj) {
            const w = _config.gatherWiggle || 10;
            obj.xWiggle = (obj.xWiggle || 0) + w * Math.cos(dir);
            obj.yWiggle = (obj.yWiggle || 0) + w * Math.sin(dir);
        }
        this.packetLog("[Packet:L:wiggleObj]", { dir, sid });
    }

    // M: shootTurret(sid, dir)
    _hM(p, data) {
        const args = this._norm(data, false);
        const sid = args[0], dir = args[1];
        const obj = this._findObjectBySid(sid);
        if (obj) {
            obj.dir = dir;
            const w = _config.gatherWiggle || 10;
            obj.xWiggle = (obj.xWiggle || 0) + w * Math.cos(dir + Math.PI);
            obj.yWiggle = (obj.yWiggle || 0) + w * Math.sin(dir + Math.PI);
        }
        this.packetLog("[Packet:M:shootTurret]", { sid, dir });
    }

    // P: killPlayer() â€” local player death
    _hP(p, data) {
        this.inGame = false;
        this.lastDeath = { x: p.x, y: p.y };
        p.alive = false;
        this.deadPlayers.push(new DeadPlayer(p.x, p.y, p.dir, p.buildIndex, p.weaponIndex, p.weaponVariant, p.skinColor, p.scale, p.name));
        if (this.deadPlayers.length > 32) this.deadPlayers = this.deadPlayers.filter(function (dp) { return dp && dp.active; }).slice(-32);
        this.packetLog("[Packet:P:killPlayer]", { x: p.x, y: p.y });
    }

    // Q: killObject(sid)
    _hQ(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        this.objectManager.disableBySid(sid);
        this.removeResourceBySid(sid);
        this.packetLog("[Packet:Q:killObject]", { sid });
    }

    // R: killObjects(sid) â€” deactivate all objects owned by player
    _hR(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        this.objectManager.removeAllItems(sid);
        this.syncResourceCacheFromObjects();
        this.packetLog("[Packet:R:killObjects]", { sid });
    }

    // T: updateAge(xp, mxp, age)
    _hT(p, data) {
        const args = this._norm(data, false);
        const xp = args[0], mxp = args[1], age = args[2];
        if (xp != null) p.XP = xp;
        if (mxp != null) p.maxXP = mxp;
        if (age != null) p.age = age;
        this.packetLog("[Packet:T:updateAge]", { xp, mxp, age });
    }

    // U: updateUpgrades(points, age)
    _hU(p, data) {
        const args = this._norm(data, false);
        p.upgradePoints = args[0];
        p.upgrAge = args[1];
        this.packetLog("[Packet:U:updateUpgrades]", { points: args[0], age: args[1] });
    }

    // X: addProjectile(x, y, dir, range, speed, indx, layer, sid)
    _hX(p, data) {
        const args = this._norm(data, false);
        const [x, y, dir, range, speed, indx, layer, sid] = args;
        this.projectileManager.addProjectile(x, y, dir, range, speed, indx, p, null, layer, true, sid);
        this.packetLog("[Packet:X:addProjectile]", { x, y, dir, sid });
    }

    // Y: remProjectile(sid, range)
    _hY(p, data) {
        const args = this._norm(data, false);
        const sid = args[0], range = args[1];
        this.projectileManager.removeProjectile(sid, range);
        this.packetLog("[Packet:Y:remProjectile]", { sid, range });
    }

    // 0: addAlliance(a)
    _h0(p, data) {
        const args = this._norm(data, false);
        const a = args[0];
        if (a != null) this.alliances.push(a);
        this.packetLog("[Packet:0:addAlliance]", { alliance: a });
    }

    // 1: deleteAlliance(a)
    _h1(p, data) {
        const args = this._norm(data, false);
        const a = args[0];
        if (a != null) this.alliances = this.alliances.filter(function (e) { return e !== a; });
        this.packetLog("[Packet:1:deleteAlliance]", { sid: a });
    }

    // 2: allianceNotification(sid, name) â€” no bot logic in this runtime
    _h2(p, data) {
        const args = this._norm(data, false);
        this.packetLog("[Packet:2:allianceNotif]", { sid: args[0], name: args[1] });
    }

    // 3: setPlayerTeam(team, isOwner)
    _h3(p, data) {
        const args = this._norm(data, false);
        const team = args[0], isOwner = args[1];
        p.team = team;
        p.isOwner = isOwner;
        if (team == null) this.alliancePlayers = [];
        this.packetLog("[Packet:3:setPlayerTeam]", { team, isOwner });
    }

    // 4: setAlliancePlayers(data)
    _h4(p, data) {
        const flat = this._norm(data, false);
        this.alliancePlayers = flat;
        this.packetLog("[Packet:4:setAlliancePlayers]", { len: flat.length });
    }

    // 5: updateStoreItems(type, id, index) â€” type=0 skin/tail, index=0 unlock, index=1 equip
    _h5(p, data) {
        const args = this._norm(data, false);
        const type = args[0], id = args[1], index = args[2];
        if (index) {
            if (!type) { p.tails[id] = 1; }
            else { p.latestTail = id; }
        } else {
            if (!type) { p.skins[id] = 1; }
            else { p.latestSkin = id; }
        }
        this.packetLog("[Packet:5:updateStoreItems]", { type, id, index });
    }

    // 6: receiveChat(sid, message)
    _h6(p, data) {
        const args = this._norm(data, false);
        const sid = args[0];
        const message = String(args[1] || "");
        if (/img/i.test(message) || /iframe/i.test(message)) return;
        const sender = this._findPlayerBySid(sid);
        if (sender) {
            if (!Array.isArray(sender.chatMessages)) sender.chatMessages = [];
            sender.chatMessages.push(new addCh(sender.x2 || sender.x || 0, sender.y2 || sender.y || 0, message, sender));
            if (sender.chatMessages.length > 3) sender.chatMessages.shift();
        }
        this.packetLog("[Packet:6:receiveChat]", { sid, msg: message.slice(0, 40) });
    }

    // 7: updateMinimap(data)
    _h7(p, data) {
        const flat = this._norm(data, false);
        this.minimapData = flat;
        this.packetLog("[Packet:7:updateMinimap]", { len: flat.length });
    }

    // 8: showText(x, y, value, type)
    _h8(p, data) {
        const args = this._norm(data, false);
        const x = args[0], y = args[1], value = args[2], type = args[3];
        this.textQueue.push({ x, y, value, type, at: Date.now() });
        if (this.textQueue.length > 32) this.textQueue.shift();
        if (this.textManager && typeof this.textManager.showText === "function") {
            const text = String(value);
            const color = Number(type) === 1 ? "#ff4444" : "#ffffff";
            this.textManager.showText(x, y, 24, 0.12, 2000, text, color);
        }
        this.packetLog("[Packet:8:showText]", { x, y, value, type });
    }

    // 9: pingMap(x, y)
    _h9(p, data) {
        const args = this._norm(data, false);
        const x = args[0], y = args[1];
        let ping = null;
        for (let i = 0; i < this.mapPingPool.length; i++) {
            if (!this.mapPingPool[i].active) {
                ping = this.mapPingPool[i];
                break;
            }
        }
        if (!ping) {
            ping = new MapPing("#ffffff", 100, this.root);
            this.mapPingPool.push(ping);
        }
        ping.init(x, y);
        this.mapPings.push({ x, y, at: Date.now() });
        if (this.mapPings.length > 16) this.mapPings.shift();
        this.packetLog("[Packet:9:pingMap]", { x, y });
    }

    getMsgpack() {
        const root = this.root || window;
        const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : null;
        const candidates = [
            root && root.msgpack,
            uw && uw.msgpack,
            typeof window !== "undefined" ? window.msgpack : null,
            typeof document !== "undefined" ? document.msgpack : null,
            root && root.NozoSingle && root.NozoSingle.msgpack
        ];
        for (let i = 0; i < candidates.length; i++) {
            const mp = candidates[i];
            if (mp && typeof mp.decode === "function" && typeof mp.encode === "function") {
                if (root && !root.msgpack) root.msgpack = mp;
                return mp;
            }
        }
        return null;
    }

    decodePacket(messageData) {
        const msgpack = this.getMsgpack();
        if (!msgpack || typeof msgpack.decode !== "function") return null;
        if (!messageData) return null;
        try {
            // 1:1 with original getMessage: new Uint8Array(message.data), then decode.
            const parsed = msgpack.decode(new Uint8Array(messageData));
            if (!Array.isArray(parsed) || parsed.length < 2) return null;
            const type = parsed[0];
            const data = parsed[1];
            const args = Array.isArray(data) ? data : [data];
            return { type, data, args };
        } catch (e) {
            return null;
        }
        return null;
    }

    dispatchRawMessage(raw) {
        const parsed = this.decodePacket(raw);
        if (parsed && parsed.type != null) {
            if (parsed.type === "io-init") return true;
            this.handlePacket(parsed.type, parsed.data);
            return true;
        }
        return false;
    }

    bindSocket(ws) {
        if (!ws || this.boundSockets.has(ws)) return;
        this.boundSockets.add(ws);
        try { ws.binaryType = "arraybuffer"; } catch (err) {
            console.error("[NozoSingle:WS:binaryType]", err);
            throw err;
        }
        const self = this;
        ws.addEventListener("message", async function (evt) {
            // TEMP: explicit early return during event-port staging.
            // REMOVE WHEN PORT IS FINISHED.
            if (BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE) return;
            if (self.dispatchRawMessage(evt && evt.data)) return;
            const raw = evt && evt.data;
            if (raw && typeof raw.arrayBuffer === "function") {
                try {
                    const ab = await raw.arrayBuffer();
                    self.dispatchRawMessage(ab);
                } catch (err) {
                    console.error("[NozoSingle:WS:arrayBuffer]", err);
                    throw err;
                }
            }
        });
    }

    bindKnownSockets() {
        const self = this;
        if (this.boundKnownPoll) return;
        let tries = 0;
        this.boundKnownPoll = setInterval(function () {
            tries++;
            const refs = [self.root && self.root.WS, self.root && self.root.ws];
            for (let i = 0; i < refs.length; i++) {
                const ws = refs[i];
                if (ws && typeof ws.addEventListener === "function") {
                    self.bindSocket(ws);
                }
            }
            if (tries >= 240) { // ~60s
                clearInterval(self.boundKnownPoll);
                self.boundKnownPoll = null;
            }
        }, 250);
    }

    bindWsHook() {
        if (this.wsHooked) return;
        const NativeWS = this.root.WebSocket;
        if (!NativeWS) return;
        const self = this;
        function HookedWebSocket(url, protocols) {
            const ws = protocols !== undefined ? new NativeWS(url, protocols) : new NativeWS(url);
            self.bindSocket(ws);
            return ws;
        }

        HookedWebSocket.prototype = NativeWS.prototype;
        Object.setPrototypeOf(HookedWebSocket, NativeWS);
        this.root.WebSocket = HookedWebSocket;
        this.wsHooked = true;
    }

    init() {
        this.ensurePlayer(null);
        this.bindWsHook();
        this.bindKnownSockets();
    }
}

class LoadoutManager {
    constructor(rootRef) {
        this.root = rootRef || window;
        this.items2 = { "1": "8", "2": "17", "3": "31", "4": "23", "5": "10", "6": "38", "7": "28", "8": "25" };
        this.selects = [];
        this.info2 = {};
        this.refs = {};
        this.ids = {
            hand_axe: 1,
            great_axe: 2,
            short_sword: 3,
            katana: 4,
            polearm: 5,
            bat: 6,
            daggers: 7,
            stick: 8,
            hunting_bow: 9,
            great_hammer: 10,
            wooden_shield: 11,
            crossbow: 12,
            repeater_crossbow: 13,
            mc_grabby: 14,
            musket: 15,
            cookie: 17,
            cheese: 18,
            stonewall: 20,
            castle_wall: 21,
            greater_spike: 23,
            poison_spike: 24,
            spining_spike: 25,
            fast_mill: 28,
            power_mill: 28,
            mine: 29,
            sapling: 30,
            trap: 31,
            boost: 32,
            turret: 33,
            platform: 34,
            healing_pad: 35,
            spawnpad: 36,
            blocker: 37,
            teleport: 38
        };
        this.ranged = [
            this.ids.crossbow,
            this.ids.repeater_crossbow,
            this.ids.musket,
            this.ids.hunting_bow
        ];
        this.ageMap = {
            1: { hand_axe: 1, short_sword: 3, polearm: 5, daggers: 7, stick: 8, bat: 6 },
            2: { cookie: 17, stonewall: 20 },
            3: { trap: 31, boost: 32 },
            4: { greater_spike: 23, mine: 29, sapling: 30, fast_mill: 27 },
            5: { hunting_bow: 9, great_hammer: 10, mc_grabby: 14, wooden_shield: 11 },
            6: { cheese: 18, castle_wall: 21, turret: 33, platform: 34, healing_pad: 35, blocker: 37, teleport: 38 },
            7: { great_axe: 2, crossbow: 12, katana: 4, power_mill: 28 },
            8: { repeater_crossbow: 13, musket: 15, poison_spike: 24, spining_spike: 25, spawnpad: 36 }
        };
    }

    get currentWeapons() {
        return Array.isArray(this.root.weapons) ? this.root.weapons : [];
    }

    save() {
        try {
            localStorage.items2 = JSON.stringify(this.items2);
            return true;
        } catch (e) {
            console.warn("[LoadoutManager] save failed", e);
            return false;
        }
    }

    load() {
        try {
            if (!localStorage.items2) return false;
            const parsed = JSON.parse(localStorage.items2);
            if (parsed && typeof parsed === "object") {
                this.items2 = parsed;
                return true;
            }
            return false;
        } catch (e) {
            console.warn("[LoadoutManager] load failed", e);
            return false;
        }
    }

    validatePath(ageIndex, selectedId) {
        const selAge = String(ageIndex);
        if (this.ranged.includes(selectedId)) {
            if (String(this.items2[5]) !== String(this.ids.hunting_bow)) {
                this.items2[5] = String(this.ids.hunting_bow);
                const el = getEl("sel5");
                if (el) el.value = String(this.ids.hunting_bow);
            }
            if (String(this.items2[7]) !== String(this.ids.crossbow)) {
                this.items2[7] = String(this.ids.crossbow);
                const el = getEl("sel7");
                if (el) el.value = String(this.ids.crossbow);
            }
        }
        if (selectedId === this.ids.katana && String(this.items2[1]) !== String(this.ids.short_sword)) {
            this.items2[1] = String(this.ids.short_sword);
            const el = getEl("sel1");
            if (el) el.value = String(this.ids.short_sword);
        }
        if (selectedId === this.ids.great_axe && String(this.items2[1]) !== String(this.ids.hand_axe)) {
            this.items2[1] = String(this.ids.hand_axe);
            const el = getEl("sel1");
            if (el) el.value = String(this.ids.hand_axe);
        }
        this.save();
        return selAge;
    }

    hydrateFromWeaponsList() {
        const weapons = this.currentWeapons;
        if (!weapons.length) return;
        for (let i = 0; i < weapons.length; i++) {
            const e = weapons[i];
            if (!e || !e.age || !e.name) continue;
            const a = Number(e.age) - 1;
            const key = String(e.name).split(" ").join("_");
            if (!this.ageMap[a]) this.ageMap[a] = {};
            this.ageMap[a][key] = e.id;
        }
    }

    buildLoadoutUI(setupCardEl) {
        if (!setupCardEl || getEl("nozoLoadouts")) return;
        const box = document.createElement("div");
        box.id = "nozoLoadouts";
        box.style.cssText = "margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(0,0,0,.18);";

        const title = document.createElement("div");
        title.textContent = "Loadouts";
        title.style.cssText = "font-weight:700;margin-bottom:6px;";
        box.appendChild(title);

        for (const ageKey of Object.keys(this.ageMap)) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;gap:8px;align-items:center;margin:4px 0;";

            const label = document.createElement("span");
            label.textContent = `Age ${ageKey}:`;
            label.style.cssText = "min-width:52px;font-size:12px;";

            const sel = document.createElement("select");
            sel.id = "sel" + ageKey;
            sel.dataset.age = String(ageKey);
            sel.style.cssText = "flex:1;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:6px;";

            const options = this.ageMap[ageKey] || {};
            for (const name of Object.keys(options)) {
                const opt = document.createElement("option");
                opt.value = String(options[name]);
                opt.textContent = name;
                opt.style.color = "#fff";
                opt.style.backgroundColor = "#1b2230";
                sel.appendChild(opt);
            }

            sel.style.color = "#fff";
            sel.style.background = "rgba(20,24,32,.95)";
            sel.style.border = "1px solid rgba(255,255,255,.18)";

            if (this.items2[ageKey] != null) sel.value = String(this.items2[ageKey]);
            if (!sel.value && sel.options.length) sel.selectedIndex = 0;
            this.items2[ageKey] = sel.value;
            this.selects.push([ageKey, sel]);

            sel.addEventListener("change", (e) => {
                const ageIndex = e.target.dataset.age;
                const value = Number(e.target.value);
                this.items2[ageIndex] = String(e.target.value);
                this.validatePath(ageIndex, value);
            });

            row.appendChild(label);
            row.appendChild(sel);
            box.appendChild(row);
        }

        setupCardEl.appendChild(box);
        this.save();
    }

    getCurrentRegionBrowser() {
        const sb = this.root.serverBrowser;
        if (!sb || !sb.children || !sb.children[0]) return null;
        return sb.children[0];
    }

    getCurrentServerInfo(serverBrowser) {
        if (!serverBrowser || !serverBrowser.selectedOptions || !serverBrowser.selectedOptions[0]) return null;
        const o = serverBrowser.selectedOptions[0];
        const parts = String(o.innerText || "").split(" ");
        return {
            name: parts[0] || "",
            id: o.value || "",
            index: parts[1] || ""
        };
    }

    NewServer() {
        const serverBrowser = this.getCurrentRegionBrowser();
        if (!serverBrowser) return null;
        const cur = this.getCurrentServerInfo(serverBrowser);
        if (!cur || !cur.id) return null;

        const servers = [];
        [...serverBrowser.children].forEach((e) => {
            const txt = String(e.innerText || "");
            const inBrackets = txt.includes("[") ? txt.split("[").pop().split("]")[0] : "";
            const a = Number((inBrackets.split("/")[0] || "0"));
            const b = e.value;
            const r = String(b || "").split(":")[0];
            if (r === String(cur.id).split(":")[0]) servers.push({ a, b, e });
        });
        if (!servers.length) return null;

        const candidate = servers
            .sort((x, y) => y.a - x.a)
            .find((s) => Number(s.a) < 40);
        if (!candidate) return null;

        const nsi = String(candidate.b).split(":");
        nsi[1] = String(Number(nsi[1]) + 1);
        const nextServerId = nsi.join(":");

        const u = new URL(location.href);
        u.searchParams.set("server", nextServerId);
        location.href = u.toString();
        return nextServerId;
    }

    buildGuideButtons(guideCardEl) {
        if (!guideCardEl || getEl("nozoGuideBtns")) return;
        const wrap = document.createElement("div");
        wrap.id = "nozoGuideBtns";
        wrap.style.cssText = "margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;";

        const mk = (label, onClick) => {
            const b = document.createElement("button");
            b.textContent = label;
            b.style.cssText = "padding:6px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;";
            b.addEventListener("click", onClick);
            wrap.appendChild(b);
        };

        mk("New Server", () => this.NewServer());
        mk("Load Layout", () => {
            this.load();
            this.selects.forEach(([a, s]) => {
                if (this.items2[a] != null) s.value = String(this.items2[a]);
            });
        });
        mk("Save Layout", () => this.save());

        guideCardEl.appendChild(wrap);
    }

    exposeGlobals() {
        this.root.selects = this.selects;
        this.root.items2 = this.items2;
        this.root.info2 = this.info2;
        this.root.spikes = [25, 23, 24, 6, 7, 9];
        this.root.NewServer = this.NewServer.bind(this);
        this.info2.ageitems = this.ageMap;
        this.info2.ageitems["0"] = { wood_wall: 19, spike: 6, windmill: 10 };
    }

    mount() {
        const setupCard = this.root.setupCard || getEl("setupCard");
        const guideCard = this.root.guideCard || getEl("guideCard");
        if (!setupCard && !guideCard) return false;

        this.load();
        this.hydrateFromWeaponsList();
        this.injectLoadoutSelectCSS();
        if (setupCard) this.buildLoadoutUI(setupCard);
        if (guideCard) this.buildGuideButtons(guideCard);
        this.exposeGlobals();
        return true;
    }

    injectLoadoutSelectCSS() {
        if (document.getElementById("nozoLoadoutSelectCSS")) return;
        const st = document.createElement("style");
        st.id = "nozoLoadoutSelectCSS";
        st.textContent = `
      #nozoLoadouts select { color:#fff; background:#1b2230; border:1px solid rgba(255,255,255,.18); }
      #nozoLoadouts select option { color:#fff; background:#1b2230; }
    `;
        document.head.appendChild(st);
    }
}

class BootstrapManager {
    constructor(rootRef, gameEntity) {
        this.root = rootRef || window;
        this.game = gameEntity || null;
        this.boundTokenFlow = false;
        this.token = null;
        this.server = null;
    }

    getApiBase() {
        const host = (this.root.location && this.root.location.hostname) || "";
        const isSandbox = host === "sandbox-dev.moomoo.io" || host === "sandbox.moomoo.io";
        const isDev = host === "dev.moomoo.io" || host === "dev2.moomoo.io";
        if (isSandbox) return "https://api-sandbox.moomoo.io";
        if (isDev) return "https://api-dev.moomoo.io";
        return "https://api.moomoo.io";
    }

    getServerParam() {
        const raw = new URLSearchParams((this.root.location && this.root.location.search) || "").get("server");
        if (!raw || raw.indexOf(":") === -1) return null;
        const parts = raw.split(":");
        if (parts.length < 2) return null;
        return { raw, region: parts[0], name: parts[1] };
    }

    refreshServerContext() {
        const sp = this.getServerParam();
        if (!sp) return null;
        this.server = sp;
        if (this.game) {
            this.game.setState("serverParam", sp.raw);
            this.game.setState("region", sp.region);
            this.game.setState("name", sp.name);
            this.game.setState("In", sp.raw);
        }
        return sp;
    }

    setToken(tokenValue, source) {
        if (!tokenValue) return false;
        this.token = tokenValue;
        this.root.token = tokenValue;
        if (this.game) {
            this.game.setState("token", tokenValue);
            this.game.emit("token", { token: tokenValue, source: source || "unknown" });
        }
        return true;
    }

    bindTokenFlow() {
        if (this.boundTokenFlow) return;
        this.boundTokenFlow = true;
        this.refreshServerContext();

        const altchaEl = this.root.document.getElementById("altcha");
        if (altchaEl && altchaEl.addEventListener) {
            altchaEl.addEventListener("statechange", (e) => {
                const detail = e && e.detail ? e.detail : {};
                if (detail.state !== "verified") return;

                this.refreshServerContext();
                this.setToken(detail.payload, "altcha:verified");

                const visualizer = this.root.document.getElementById("wideAdCard");
                if (visualizer) {
                    visualizer.style.maxWidth = "1056.95px";
                    visualizer.style.height = "300px";
                }

                const enterGame = this.root.document.getElementById("enterGame");
                setTimeout(() => {
                    if (enterGame && enterGame.classList && enterGame.classList.contains("disabled")) {
                        this.root.location.reload();
                        return;
                    }
                    if ((this.root.name || "").indexOf("authWindow-") === 0 && this.root.opener && this.root.opener.postMessage) {
                        const id = (this.root.name || "").replace("authWindow-", "");
                        this.root.opener.postMessage(
                            { type: "TOKEN", id, token: detail.payload },
                            "*"
                        );
                        this.root.close();
                    }
                }, 500);
            });
        }

        const altchaCheckbox = this.root.document.getElementById("altcha_checkbox");
        if (altchaCheckbox && !altchaCheckbox.checked && altchaCheckbox.click) {
            setTimeout(() => {
                if (!altchaCheckbox.checked) altchaCheckbox.click();
            }, 1000);
        }
    }

    async getToken() {
        this.bindTokenFlow();
        while (!this.token && !this.root.token) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        this.refreshServerContext();
        return {
            token: this.token || this.root.token,
            In: this.server ? this.server.raw : null
        };
    }

    async findServer(serverParam) {
        if (!serverParam) return null;
        const dn = this.getApiBase();
        const res = await fetch(dn + "/servers?v=1.26");
        if (!res.ok) return null;
        const servers = await res.json();
        if (!Array.isArray(servers)) return null;
        return servers.find((e) => e && e.region === serverParam.region && e.name === serverParam.name) || null;
    }

    async run() {
        try {
            const serverParam = this.getServerParam();
            const auth = await this.getToken();
            const server = await this.findServer(serverParam);
            if (this.game) {
                this.game.setState("bootstrap", {
                    server,
                    token: auth.token,
                    In: auth.In,
                    at: Date.now()
                });
                this.game.emit("bootstrap:ready", { server, token: auth.token, In: auth.In });
            }
            return { server, token: auth.token, In: auth.In };
        } catch (err) {
            console.error("[BootstrapManager] run failed:", err);
            if (this.game) this.game.emit("bootstrap:error", err);
            return null;
        }
    }
}

function mountNormalMenu() {
    if (getEl("nozoNormalMenu")) return;

    const menu = document.createElement("div");
    menu.id = "nozoNormalMenu";
    menu.style.cssText = [
        "position:fixed",
        "left:12px",
        "top:12px",
        "z-index:99999",
        "width:260px",
        "max-width:calc(100vw - 24px)",
        "padding:8px",
        "border:1px solid rgba(255,255,255,.14)",
        "border-radius:8px",
        "background:rgba(0,0,0,.22)",
        "backdrop-filter:blur(2px)",
        "color:#fff",
        "font:12px monospace",
        "pointer-events:auto"
    ].join(";");
    menu.innerHTML = [
        '<div style="font-weight:700;margin-bottom:6px;">Nozo Panel</div>',
        '<div id="nozoTabs" style="display:flex;gap:6px;margin-bottom:8px;">',
        '<button data-tab="music" class="nozo-tab-active" style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(120,180,120,.25);color:#fff;">Music</button>',
        '<button data-tab="combat" style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;">Combat</button>',
        '<button data-tab="bots" style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;">Bots</button>',
        "</div>",
        '<div id="nozoPageMusic" data-page="music">',
        '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">',
        '<button id="nozoMusicPlay" style="padding:4px 7px;border-radius:6px;">play</button>',
        '<button id="nozoMusicResume" style="padding:4px 7px;border-radius:6px;">resume</button>',
        '<button id="nozoMusicPause" style="padding:4px 7px;border-radius:6px;">pause</button>',
        '<button id="nozoMusicStop" style="padding:4px 7px;border-radius:6px;">stop</button>',
        '</div>',
        '<div style="display:flex;gap:6px;align-items:center;">',
        '<select id="musicStuff" style="flex:1;min-width:0;"></select>',
        '<input id="musicVolume" type="range" min="0" max="100" value="80" style="width:90px;">',
        "</div>",
        "</div>",
        '<div id="nozoPageCombat" data-page="combat" style="display:none;"></div>',
        '<div id="nozoPageBots" data-page="bots" style="display:none;">',
        '<button id="nozoSpawnBotDummy" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;">spawnBot (dummy)</button>',
        "</div>",
        '<div id="nozoReloadHud" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14);"></div>',
        '<div id="nozoInstaHud" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14);font-size:11px;line-height:1.35;"></div>',
        '<div id="nozoShameInfo" style="margin-top:8px;font-size:11px;line-height:1.35;">Shame: --</div>',
        '<div id="nozoResCacheInfo" style="margin-top:6px;font-size:11px;line-height:1.35;opacity:.95;">ResCache: --</div>'
    ].join("");
    document.body.appendChild(menu);

    const rootSongs = (root._songs && typeof root._songs === "object") ? root._songs : {};
    const songs = Object.keys(rootSongs).length ? rootSongs : {
        demo_track: {
            name: "Demo Track",
            lyrics: []
        }
    };
    const songUrl = function (q) {
        return "https://audio.jukehost.co.uk/" + String(q || "");
    };

    if (!root._origGM_getValue) root._origGM_getValue = root.GM_getValue || function () { return null; };
    if (!root._origGM_setValue) root._origGM_setValue = root.GM_setValue || function () { };
    if (!root.sendUpdate) root.sendUpdate = function () { };
    _origGM_getValue = root._origGM_getValue;
    _origGM_setValue = root._origGM_setValue;
    sendUpdate = root.sendUpdate;
    if (!chat) chat = (msg) => { if (typeof root.sendChat === "function") root.sendChat(msg); };

    const Mplayer = new LyricsPlayer(songs, songUrl);
    Mplayer.attachAudioElement(new Audio());
    root._songs = songs;
    root._Mplayer = Mplayer;

    const musicStuff = getEl("musicStuff");
    Object.keys(songs).forEach((k, i) => {
        const o = document.createElement("option");
        o.value = k;
        o.textContent = songs[k].name || k;
        if (i === 0) o.selected = true;
        musicStuff.appendChild(o);
    });
    const pick = () => musicStuff && musicStuff.value ? musicStuff.value : Object.keys(songs)[0];
    getEl("nozoMusicPlay").onclick = function () { root._Mplayer.songList.find(e => e.name === pick()).play(); };
    getEl("nozoMusicStop").onclick = function () { root._Mplayer.songList.find(e => e.name === pick()).stop(); };
    getEl("nozoMusicResume").onclick = function () { root._Mplayer.audio && root._Mplayer.audio.play(); };
    getEl("nozoMusicPause").onclick = function () { root._Mplayer.audio && root._Mplayer.audio.pause(); };
    getEl("musicVolume").oninput = function () {
        if (root._Mplayer.audio) root._Mplayer.audio.volume = Number(this.value) / 100;
    };
    getEl("nozoSpawnBotDummy").onclick = function () {
        console.log("[NozoSingle:Bots] spawnBot dummy clicked");
    };

    const tabButtons = [...menu.querySelectorAll("#nozoTabs button")];
    const tabPages = [...menu.querySelectorAll("[data-page]")];
    function setTab(tab) {
        tabPages.forEach((page) => {
            page.style.display = page.dataset.page === tab ? "block" : "none";
        });
        tabButtons.forEach((btn) => {
            const on = btn.dataset.tab === tab;
            btn.style.background = on ? "rgba(120,180,120,.25)" : "rgba(255,255,255,.08)";
            btn.className = on ? "nozo-tab-active" : "";
        });
    }
    tabButtons.forEach((btn) => btn.onclick = () => setTab(btn.dataset.tab));
    setTab("music");

    const combatPage = getEl("nozoPageCombat");
    function renderCombatConfigs() {
        const cfg = root.NozoSingle.configs;
        combatPage.innerHTML = "";
        const keys = Object.keys(cfg);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = cfg[key];
            if (typeof value !== "boolean") continue;
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;";
            const label = document.createElement("span");
            label.textContent = key;
            label.style.cssText = "font-size:11px;opacity:.95;";
            const select = document.createElement("select");
            select.style.cssText = "width:92px;border-radius:6px;border:1px solid rgba(255,255,255,.16);padding:3px 6px;color:#fff;background:rgba(255,255,255,.08);";
            const onOpt = document.createElement("option");
            onOpt.value = "true";
            onOpt.textContent = "ON";
            const offOpt = document.createElement("option");
            offOpt.value = "false";
            offOpt.textContent = "OFF";
            select.appendChild(onOpt);
            select.appendChild(offOpt);
            select.value = String(value);
            const paint = () => {
                select.style.background = select.value === "true" ? "rgba(70,170,80,.35)" : "rgba(180,70,70,.35)";
            };
            paint();
            select.onchange = () => {
                const next = Object.assign({}, root.NozoSingle.configs, { [key]: select.value === "true" });
                root.NozoSingle.setConfigs(next);
                paint();
            };
            row.appendChild(label);
            row.appendChild(select);
            combatPage.appendChild(row);
        }

        const legacyWrap = document.createElement("div");
        legacyWrap.id = "nozoLegacyCombatControls";
        legacyWrap.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14);";
        const title = document.createElement("div");
        title.textContent = "Legacy Combat Controls";
        title.style.cssText = "font-size:11px;opacity:.9;margin-bottom:6px;";
        legacyWrap.appendChild(title);

        const addText = (id, label, value, maxLen, width) => {
            let el = getEl(id);
            if (!el) {
                el = document.createElement("input");
                el.type = "text";
                el.id = id;
                el.value = String(value);
                if (maxLen) el.maxLength = maxLen;
            }
            el.style.cssText = `width:${width || "70px"};border-radius:6px;border:1px solid rgba(255,255,255,.16);padding:3px 6px;background:rgba(255,255,255,.08);color:#fff;`;
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;";
            const sp = document.createElement("span");
            sp.textContent = label;
            sp.style.cssText = "font-size:11px;opacity:.95;";
            row.appendChild(sp);
            row.appendChild(el);
            legacyWrap.appendChild(row);
        };

        const addCheck = (id, label, checked) => {
            let el = getEl(id);
            if (!el) {
                el = document.createElement("input");
                el.type = "checkbox";
                el.id = id;
                el.checked = !!checked;
            }
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;";
            const sp = document.createElement("span");
            sp.textContent = label;
            sp.style.cssText = "font-size:11px;opacity:.95;";
            row.appendChild(sp);
            row.appendChild(el);
            legacyWrap.appendChild(row);
        };

        addText("autoPlaceTick", "AutoPlace Tick", 1, 2, "56px");
        addText("breakRange", "Break Range", 700, 4, "72px");
        addCheck("breakSpikeSwitch", "Break Spike", true);
        addCheck("safeAntiSpikeTick", "Safe AntiSpike Tick", true);
        addCheck("turretCombat", "Turret Combat", true);
        addCheck("backupNobull", "Backup Nobull", true);
        addCheck("weaponGrind", "Weapon Grind", false);
        combatPage.appendChild(legacyWrap);
    }
    renderCombatConfigs();

    const updateShameInfo = function () {
        const out = getEl("nozoShameInfo");
        if (!out) return;
        const rt = root.NozoSingle && root.NozoSingle.player;
        const p = rt ? (rt.ensurePlayer(rt.mySid) || (rt.game && rt.game.getState("player", null))) : null;
        if (!p) {
            out.textContent = "Shame: --";
            return;
        }
        const active = p.shameActive ? "ON" : "OFF";
        const count = Number(p.shameTransitions || 0);
        out.textContent = `Shame: ${active} | count: ${count}`;
    };
    const updateResourceCacheInfo = function () {
        const out = getEl("nozoResCacheInfo");
        if (!out) return;
        const rt = root.NozoSingle && root.NozoSingle.player;
        const c = rt && rt.resourceCache ? rt.resourceCache : null;
        if (!c) {
            out.textContent = "ResCache: --";
            return;
        }
        out.textContent = `ResCache: t${c.trees.size} b${c.bushes.size} s${c.stones.size} c${c.catuses.size} g${c.goldmins.size}`;
    };
    const updateReloadHud = function (incomingPayload) {
        const hud = getEl("nozoReloadHud");
        if (!hud) return;
        const rt = root.NozoSingle.player;
        const p = rt ? (rt.ensurePlayer(rt.mySid) || (rt.game && rt.game.getState("player", null))) : null;
        if (!p) {
            hud.innerHTML = '<div style="font-size:11px;opacity:.85;">Reloads: --</div>';
            return;
        }
        const payload = incomingPayload || root._lastReloadHudPayload || null;
        const wDefs = (rt.items && rt.items.weapons) ? rt.items.weapons : [];
        const lines = [];
        const speedMul = p.skinIndex == 20 ? 0.78 : 1;
        const slots = [];
        const hasPrimary = Array.isArray(p.weapons) && p.weapons.length > 0 && Number(p.weapons[0]) >= 0;
        const hasSecondary = Array.isArray(p.weapons) && p.weapons.length > 1 && Number(p.weapons[1]) > 8;
        if (p.weaponIndex != null) slots.push({ key: "Current", wid: p.weaponIndex, color: "#ffd36f" });
        if (hasPrimary && p.primaryIndex != null) slots.push({ key: "Primary", wid: p.primaryIndex, color: "#7dff7d" });
        if (hasSecondary && p.secondaryIndex != null) slots.push({ key: "Secondary", wid: p.secondaryIndex, color: "#6fb6ff" });
        const hasTurretSlot = (p.skins && p.skins[53]) || (p.reloads && p.reloads[53] != null);
        if (hasTurretSlot) slots.push({ key: "Turret", wid: 53, color: "#ff8ca8" });

        for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            const wid = s.wid;
            const w = wDefs[wid] || {};
            let remain = Math.max(0, Number((p.reloads && p.reloads[wid]) || 0));
            if (payload && payload.current && Number(payload.current.id) === Number(wid)) remain = Number(payload.current.reload);
            if (payload && payload.primary && Number(payload.primary.id) === Number(wid)) remain = Number(payload.primary.reload);
            if (payload && payload.secondary && Number(payload.secondary.id) === Number(wid)) remain = Number(payload.secondary.reload);
            if (payload && payload.turret && Number(payload.turret.id) === Number(wid)) remain = Number(payload.turret.reload);
            const maxReload = wid === 53
                ? 2500
                : Math.max(1, Number((w.speed || 0) * speedMul || root.game.tickRate || 1));
            const frac = Math.max(0, Math.min(1, remain / maxReload));   // 1 = just used, 0 = ready
            const fill = (1 - frac) * 100;                               // 100 = ready
            const name = w.name || ("weapon " + wid);
            lines.push(
                '<div style="margin:4px 0;">' +
                `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>${s.key}: ${name}</span><span>${wid}</span></div>` +
                '<div style="height:7px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden;">' +
                `<div style="height:100%;width:${fill.toFixed(1)}%;background:${s.color};"></div>` +
                "</div>" +
                "</div>"
            );
        }
        hud.innerHTML = lines.join("") || '<div style="font-size:11px;opacity:.85;">Reloads: --</div>';
    };
    const updateInstaHud = function (incoming) {
        const hud = getEl("nozoInstaHud");
        if (!hud) return;
        const rt = root.NozoSingle && root.NozoSingle.player;
        const data = incoming || (rt && rt.legacyCtx ? rt.legacyCtx.instaHUD : null);
        if (!data) {
            hud.innerHTML = '<div style="opacity:.72;">Insta HUD: --</div>';
            return;
        }
        const fmt = (v, digits = 1) => Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : "--";
        const bool = (v) => v === null || v === undefined ? "--" : (v ? "yes" : "no");
        const plan = data.plan || null;
        const can = plan && plan.can ? "YES" : "NO";
        const seq = plan && plan.sequence != null ? String(plan.sequence) : "--";
        const total = plan && Number.isFinite(Number(plan.totalSwings)) ? String(plan.totalSwings) : "--";
        const afterS = plan ? fmt(plan.afterS, 1) : "--";
        const overkill = plan ? fmt(plan.overkill, 1) : "--";
        const statusColor = plan && plan.can ? "#7dff7d" : "#ff8ca8";
        hud.innerHTML = [
            '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">',
            '<span style="font-weight:700;">Insta</span>',
            `<span style="color:${statusColor};font-weight:700;">${can}</span>`,
            '</div>',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;margin-top:4px;opacity:.95;">',
            `<span>gap ${fmt(data.gap)}</span><span>trapR ${fmt(data.trapR)}</span>`,
            `<span>P ${bool(data.reachP)} (${data.widP ?? "--"})</span><span>S ${bool(data.reachS)} (${data.widS ?? "--"})</span>`,
            `<span>seq ${seq}</span><span>swings ${total}</span>`,
            `<span>afterS ${afterS}</span><span>overkill ${overkill}</span>`,
            '</div>'
        ].join("");
    };
    updateShameInfo();
    updateResourceCacheInfo();
    updateReloadHud();
    updateInstaHud();
    if (root.NozoSingle && root.NozoSingle.player) {
        root.NozoSingle.player.onReloadHudUpdate = (payload) => updateReloadHud(payload);
        root.NozoSingle.player.onInstaHudUpdate = (payload) => updateInstaHud(payload);
    }
    setInterval(updateShameInfo, 200);
}
function styleOne(selector, styles) {
    const el = document.querySelector(selector);
    if (!el) return false;
    Object.assign(el.style, styles);
    return true;
}

function styleAll(selector, styles) {
    const els = document.querySelectorAll(selector);
    if (!els.length) return 0;
    els.forEach((el) => Object.assign(el.style, styles));
    return els.length;
}
function setText(selector, text) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.textContent = text;
    return true;
}

function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.innerHTML = html;
    return true;
}

function replaceTextContains(selector, findText, newText) {
    const els = document.querySelectorAll(selector);
    let count = 0;
    els.forEach((el) => {
        if ((el.textContent || "").includes(findText)) {
            el.textContent = (el.textContent || "").replace(findText, newText);
            count++;
        }
    });
    return count;
}
function themeMainMenuCentered() {
    const mainMenu = document.querySelector("#mainMenu");
    const menuContainer = document.querySelector("#menuContainer");
    if (!mainMenu || !menuContainer) return false;

    // Keep main menu centered
    const mainMenuStyle = {
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(180deg, rgba(8,12,18,.50), rgba(8,12,18,.35))"
    };
    // Do not force display:flex if game already hid menu (display:none).
    if (getComputedStyle(mainMenu).display !== "none") {
        mainMenuStyle.display = "flex";
    }
    styleOne("#mainMenu", mainMenuStyle);

    // Main container
    styleOne("#menuContainer", {
        width: "min(1120px, 96vw)",
        margin: "0 auto",
        padding: "14px"
    });

    // Top 3-card area
    styleOne("#menuCardHolder", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "12px",
        alignItems: "start"
    });

    // General card style (includes setupCard, guideCard, adCard/music card)
    styleAll("#menuCardHolder .menuCard", {
        background: "rgba(15,22,32,.82)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: "10px",
        boxShadow: "0 6px 24px rgba(0,0,0,.28)",
        color: "#e8edf7"
    });

    // Keep adCard visible (music player host)
    styleOne("#adCard", {
        display: "",
        overflow: "hidden"
    });

    // Keep wideAdCard visible (audio visualizer under cards)
    styleOne("#wideAdCard", {
        display: "",
        marginTop: "12px",
        background: "rgba(15,22,32,.82)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: "10px",
        boxShadow: "0 6px 24px rgba(0,0,0,.28)"
    });

    // Inputs + button polish
    styleOne("#nameInput", {
        background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.18)",
        color: "#fff",
        borderRadius: "8px",
        outline: "none"
    });

    styleOne("#enterGame", {
        borderRadius: "9px",
        border: "1px solid rgba(0,0,0,.22)",
        boxShadow: "0 4px 14px rgba(0,0,0,.24)",
        fontWeight: "700"
    });

    styleAll(".menuHeader", { color: "#f2f6ff" });
    styleAll(".menuText", { color: "rgba(230,236,248,.92)" });

    console.log("[themeMainMenuCentered] applied");
    return true;
}

function ensureMainMenuCentered() {
    let tries = 0;
    const maxTries = 240; // ~120s at 500ms
    const timer = setInterval(function () {
        tries++;
        themeMainMenuCentered();

        const enterGame = document.getElementById("enterGame");
        const ready =
            !!enterGame &&
            (!enterGame.classList || !enterGame.classList.contains("disabled"));

        // Stop re-applying once Enter Game is ready, or on timeout.
        if (ready || tries >= maxTries) {
            clearInterval(timer);
        }
    }, 500);
}

function mountLoadoutsWhenReady(manager) {
    let tries = 0;
    const t = setInterval(() => {
        tries++;
        if (manager.mount()) {
            clearInterval(t);
            return;
        }
        if (tries >= 120) clearInterval(t);
    }, 500);
}

function mountNormalMenuWhenReady() {
    let tries = 0;
    const t = setInterval(() => {
        tries++;
        mountNormalMenu();
        if (getEl("nozoNormalMenu")) {
            clearInterval(t);
            return;
        }
        if (tries >= 120) clearInterval(t);
    }, 500);
}

function styleGameUI_NoBars() {
    // Container wrappers
    styleOne("#bottomContainer", { background: "transparent", border: "none", boxShadow: "none" });
    styleOne("#actionBar", { background: "transparent", border: "none", boxShadow: "none" });
    styleOne("#topInfoHolder", { background: "transparent", border: "none", boxShadow: "none" });
    styleOne("#resDisplay", { background: "transparent", border: "none", boxShadow: "none" });

    // Leaderboard parity (non-transparent panel)
    styleOne("#leaderboard", {
        background: "rgba(12,18,16,.88)",
        border: "1px solid rgba(170,220,120,.35)",
        boxShadow: "0 6px 20px rgba(0,0,0,.35)"
    });
    styleOne("#leaderboardData", { background: "transparent" });
    styleAll(".leaderHolder", { borderBottom: "1px solid rgba(170,220,120,.12)" });

    // Leaf UI polish only
    styleAll(".resourceDisplay", {
        background: "rgba(10,14,22,.58)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: "8px",
        color: "#eaf1ff",
        padding: "4px 8px"
    });

    styleAll(".actionBarItem", {
        width: "clamp(54px,4.25vw,66px)",
        height: "clamp(54px,4.25vw,66px)",
        minWidth: "clamp(54px,4.25vw,66px)",
        minHeight: "clamp(54px,4.25vw,66px)",
        maxWidth: "clamp(54px,4.25vw,66px)",
        maxHeight: "clamp(54px,4.25vw,66px)",
        boxSizing: "border-box",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)",
        background: "rgba(10,14,22,.58)",
        overflow: "hidden"
    });

    styleOne("#actionBar", {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "4px",
        width: "100%",
        flexWrap: "nowrap"
    });

    styleAll(".actionBarItem img", {
        maxWidth: "90%",
        maxHeight: "90%",
        objectFit: "contain",
        pointerEvents: "none"
    });

    styleOne("#chatBox", {
        background: "rgba(0,0,0,.45)",
        border: "1px solid rgba(255,255,255,.16)",
        borderRadius: "8px",
        color: "#fff",
        padding: "6px 10px"
    });

    styleAll("#allianceButton, #leaderboardButton, #storeButton, #chatButton", {
        background: "rgba(10,14,22,.72)",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: "10px",
        color: "#eaf1ff"
    });

    // Age bar parity + stable centering
    styleOne("#ageBarContainer", {
        background: "transparent",
        border: "none",
        borderRadius: "0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%"
    });
    styleOne("#ageBar", {
        width: "min(520px,72vw)",
        height: "12px",
        borderRadius: "999px",
        background: "rgba(12,18,16,.9)",
        border: "1px solid rgba(170,220,120,.35)",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "inline-block"
    });

    styleOne("#ageBarBody", {
        height: "100%",
        minWidth: "0",
        background: "linear-gradient(90deg,#9be15d 0%,#00e3ae 100%)",
        transition: "width 120ms linear",
        boxSizing: "border-box"
    });

    styleAll(".leaderboardItem", { color: "#dfe8ff" });
    styleAll(".leaderScore", { color: "#9ec2ff" });
}
setText("#gameName", "NOZO NEXT");
setText("#loadingText", "Loading modules...");
setText("#enterGame", "Play");
document.getElementById("leaderboard").append("Nozo-Mod");
replaceTextContains(".menuHeader", "SETTINGS", "Preferences");
ensureMainMenuCentered();

const GameEntity = new Entity("NozoSingleGame", root);
GameEntity.registerModule("dom", { getEl, styleOne, styleAll, setText, setHTML, replaceTextContains });
GameEntity.registerModule("ui", {
    element,
    HtmlAction,
    Html,
    mountNormalMenu,
    themeMainMenuCentered,
    styleGameUI_NoBars
});
const loadoutManager = new LoadoutManager(root);
const bootstrapManager = new BootstrapManager(root, GameEntity);
const playerRuntime = new PlayerRuntime(root, GameEntity);
GameEntity.registerModule("loadouts", loadoutManager);
GameEntity.registerModule("bootstrap", bootstrapManager);
GameEntity.registerModule("player", playerRuntime);
GameEntity.registerModule("config", {
    get: () => syncConfigFromWindowConfig(),
    sync: () => syncConfigFromWindowConfig(),
    raw: _config
});
GameEntity.registerModule("configs", {
    get: () => getConfigs(),
    set: (next) => {
        const v = setConfigs(next);
        GameEntity.setState("configs", v);
        return v;
    },
    raw: _configs
});
GameEntity.setState("readyAt", Date.now());
GameEntity.setState("config", syncConfigFromWindowConfig());
GameEntity.setState("configs", getConfigs());
GameEntity.start();
playerRuntime.init();
mountLoadoutsWhenReady(loadoutManager);
bootstrapManager.bindTokenFlow();

root.NozoSingle = {
    Entity,
    Player,
    PlayerRuntime,
    game: GameEntity,
    LoadoutManager,
    BootstrapManager,
    LyricsPlayer,
    Animtext,
    Textmanager,
    DeadPlayer,
    addCh,
    Petal,
    MapPing,
    Store,
    Damages,
    Autoupgrade,
    Autobuy,
    AutoBreaker,
    Traps,
    Traps_,
    Instakill,
    CachedMapResource,
    CachedTreeResource,
    CachedBushResource,
    CachedStoneResource,
    CachedCatusResource,
    CachedGoldminResource,
    AStarNode,
    element,
    HtmlAction,
    Html,
    mountNormalMenu,
    themeMainMenuCentered,
    styleGameUI_NoBars,
    loadouts: loadoutManager,
    bootstrap: bootstrapManager,
    player: playerRuntime,
    getTrapState: function () {
        const rt = this.player;
        const traps = rt.traps;
        const info = traps.info || {};
        return {
            inTrap: !!traps.inTrap,
            dist: Number.isFinite(traps.dist) ? traps.dist : null,
            aim: Number.isFinite(traps.aim) ? traps.aim : null,
            hasInfo: !!(info && Object.keys(info).length),
            infoSid: info.sid != null ? info.sid : null,
            infoName: info.name != null ? info.name : null,
            infoHealth: Number.isFinite(info.health) ? info.health : null,
            tick: rt.root && rt.root.game ? rt.root.game.tick : null
        };
    },
    setConfigs,
    getConfigs
};

Object.defineProperty(root.NozoSingle, "config", {
    configurable: true,
    enumerable: true,
    get: function () {
        return syncConfigFromWindowConfig();
    }
});

Object.defineProperty(root.NozoSingle, "configs", {
    configurable: true,
    enumerable: true,
    get: function () {
        return getConfigs();
    }
});

Object.defineProperty(root.NozoSingle, "_things", {
    configurable: true,
    enumerable: true,
    get: function () {
        const rt = root.NozoSingle && root.NozoSingle.player;
        if (rt && rt.legacyCtx) return rt.legacyCtx;
        if (root._things && typeof root._things === "object") return root._things;
        return {};
    }
});

Object.defineProperty(root.NozoSingle, "trapState", {
    configurable: true,
    enumerable: true,
    get: function () {
        return root.NozoSingle.getTrapState();
    }
});

// Legacy-style alias expected by old code paths.
if (!root.configs || typeof root.configs !== "object") {
    root.configs = getConfigs();
}

mountNormalMenuWhenReady();
