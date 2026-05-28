class Node {
            constructor(parent, x, y, g, h) { this.parent = parent; this.x = x; this.y = y; this.costSoFar = g; this.simpleDistanceToTarget = h; this._inOpen = false; }
            bestGuessDistance() { return this.costSoFar + this.simpleDistanceToTarget; }
        }
