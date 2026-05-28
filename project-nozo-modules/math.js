(function () {
    "use strict";

    const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    const Nozo = root.NozoNext = root.NozoNext || {};

    function getX(obj, offsetType) {
        if (!obj) return 0;
        if (offsetType === 2 && Number.isFinite(obj.x2)) return obj.x2;
        if (offsetType === 3 && Number.isFinite(obj.x3)) return obj.x3;
        return Number.isFinite(obj.x) ? obj.x : 0;
    }

    function getY(obj, offsetType) {
        if (!obj) return 0;
        if (offsetType === 2 && Number.isFinite(obj.y2)) return obj.y2;
        if (offsetType === 3 && Number.isFinite(obj.y3)) return obj.y3;
        return Number.isFinite(obj.y) ? obj.y : 0;
    }

    Nozo.math = {
        getXY(obj, offsetType = 0) {
            return {
                x: getX(obj, offsetType),
                y: getY(obj, offsetType)
            };
        },

        dist(a, b, aOffsetType = 0, bOffsetType = 0) {
            if (!a || !b) return Infinity;
            return Math.hypot(
                getX(a, aOffsetType) - getX(b, bOffsetType),
                getY(a, aOffsetType) - getY(b, bOffsetType)
            );
        },

        dir(to, from, toOffsetType = 0, fromOffsetType = 0) {
            if (!to || !from) return 0;
            return Math.atan2(
                getY(to, toOffsetType) - getY(from, fromOffsetType),
                getX(to, toOffsetType) - getX(from, fromOffsetType)
            );
        },

        angleDist(a, b) {
            const diff = Math.abs((b || 0) - (a || 0)) % (Math.PI * 2);
            return diff > Math.PI ? (Math.PI * 2) - diff : diff;
        },

        clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }
    };
})();
