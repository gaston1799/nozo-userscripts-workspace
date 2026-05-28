class CachedCatusResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "catuses");
                    }
                    getFarmKind() {
                        return "cactus";
                    }
                }
