import { Catalog } from '/core/ui/utilities/utility-serialize.js';

const CATALOG_VERSION = 1;
const CATALOG_NAME = "bzArmyTrixCatalog";
const CATALOG_OBJECT_NAME = "bz-army-trix-data";

class bzArmyTrixDataSingleton {
    catalogs = [];
    currentCatalog;
    playerID;
    static getInstance() {
        if (!bzArmyTrixDataSingleton._instance) {
            bzArmyTrixDataSingleton._instance = new bzArmyTrixDataSingleton();
        }
        return bzArmyTrixDataSingleton._instance;
    }
    constructor() {
        this.playerID = GameContext.localPlayerID;
        this.currentCatalog = new Catalog({
            name: CATALOG_NAME,
            version: CATALOG_VERSION,
            player: Players.get(this.playerID),
        });
        this.catalogs[this.playerID] = this.currentCatalog;
        this.loadData();
        engine.on("LocalPlayerChanged", this.onLocalPlayerChanged, this);
    }
    get(key) {
        const value = this.data.get(key);
        console.warn(`TRIX GET ${key} = ${JSON.stringify(value)}`);
        return value;
    }
    set(key, value) {
        const store = this.currentCatalog.getObject(CATALOG_OBJECT_NAME);
        store.write(key, value);
        this.data.set(key, value);
        console.warn(`TRIX WRITE ${key} = ${JSON.stringify(value)}`);
    }
    loadData() {
        const store = this.currentCatalog.getObject(CATALOG_OBJECT_NAME);
        this.data = new Map();
        for (const key of store.getKeys()) {
            const value = store.read(key);
            this.data.set(key, value);
            console.warn(`TRIX READ ${key} = ${JSON.stringify(value)}`);
        }
    }
    onLocalPlayerChanged() {
        this.playerID = GameContext.localPlayerID;
        if (this.catalogs[this.playerID] == void 0) {
            this.currentCatalog = new Catalog({
                name: CATALOG_NAME,
                version: CATALOG_VERSION,
                player: Players.get(this.playerID),
            });
            this.catalogs[this.playerID] = this.currentCatalog;
        } else {
            this.currentCatalog = this.catalogs[this.playerID];
        }
        this.loadData();
    }
}

const bzArmyTrixData = bzArmyTrixDataSingleton.getInstance();
export { bzArmyTrixData as default };
