export class Savegame {
        name: string = "Unnamed";
    id: string;
    dbId: string;
    class: string;
    classChoice: string;
    heritage: string;
    ancestry: string;
    level: number;
    partyName: string;
    companionName: string;
    companionId: string;
    familiarName: string;
    familiarId: string;
    recast() {
        return this;
    }
}