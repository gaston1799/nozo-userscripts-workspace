class CachedGoldminResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "goldmins");
                    }
                    getFarmKind() {
                        return "gold";
                    }
                }
