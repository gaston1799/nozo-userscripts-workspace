class CachedTreeResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "trees");
                    }
                    getFarmKind() {
                        return "wood";
                    }
                }
