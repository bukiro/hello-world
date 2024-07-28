import { Component, ChangeDetectionStrategy, OnInit, Input } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { Character } from 'src/app/classes/creatures/character/character';
import { ItemCollection } from 'src/app/classes/items/item-collection';
import { WornItem } from 'src/app/classes/items/worn-item';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { ItemsDataService } from 'src/libs/shared/services/data/items-data.service';
import { InventoryPropertiesService } from 'src/libs/shared/services/inventory-properties/inventory-properties.service';
import { InventoryService } from 'src/libs/shared/services/inventory/inventory.service';
import { RecastService } from 'src/libs/shared/services/recast/recast.service';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { DurationsService } from 'src/libs/shared/time/services/durations/durations.service';
import { BaseClass } from 'src/libs/shared/util/classes/base-class';
import { priceTextFromCopper } from 'src/libs/shared/util/currency-utils';
import { TrackByMixin } from 'src/libs/shared/util/mixins/track-by-mixin';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface AeonStoneSet {
    aeonStone: WornItem;
    inv?: ItemCollection;
}

@Component({
    selector: 'app-item-aeon-stones',
    templateUrl: './item-aeon-stones.component.html',
    styleUrls: ['./item-aeon-stones.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ],
})
export class ItemAeonStonesComponent extends TrackByMixin(BaseClass) implements OnInit {

    @Input()
    public item!: WornItem;
    @Input()
    public itemStore?: boolean;

    public newAeonStone: Array<AeonStoneSet> = [];

    constructor(
        private readonly _refreshService: RefreshService,
        private readonly _itemsDataService: ItemsDataService,
        private readonly _inventoryPropertiesService: InventoryPropertiesService,
        private readonly _durationsService: DurationsService,
        private readonly _inventoryService: InventoryService,
    ) {
        super();
    }

    private get _character(): Character {
        return CreatureService.character;
    }

    public availableSlots(): Array<number> {
        const indexes: Array<number> = [];

        for (let index = 0; index < this.item.isWayfinder; index++) {
            indexes.push(index);
        }

        return indexes;
    }

    public inventories(): Array<ItemCollection> {
        if (this.itemStore) {
            return [this._cleanItems()];
        } else {
            return this._character.inventories;
        }
    }

    public inventoryName$(inventory: ItemCollection): Observable<string> {
        return this._inventoryPropertiesService.effectiveName$(inventory, this._character);
    }

    public initialAeonStones(index: number): Array<AeonStoneSet> {
        const item = this.item;

        const defaultStone = { aeonStone: WornItem.from({ name: '' }, RecastService.recastFns) };
        //Start with one empty stone to select nothing.
        const allStones: Array<AeonStoneSet> = [defaultStone];

        //Add the current choice, if the item has a stone at that index.
        if (item.aeonStones[index] && this.newAeonStone[index]) {
            allStones.push(this.newAeonStone[index]);
        }

        return allStones;
    }

    public availableAeonStones(inv: ItemCollection): Array<AeonStoneSet> {
        if (this.itemStore) {
            return inv.wornitems.filter(wornItem => wornItem.isAeonStone).map(aeonStone => ({ aeonStone }));
        } else {
            return inv.wornitems.filter(wornItem => wornItem.isAeonStone).map(aeonStone => ({ aeonStone, inv }));
        }
    }

    public aeonStoneCooldownText$(stone: WornItem): Observable<string> {
        //If any resonant activity on this aeon Stone has a cooldown, return the lowest of these in a human readable format.
        if (stone.activities?.some(activity => activity.resonant && activity.activeCooldown)) {
            const lowestCooldown =
                Math.min(
                    ...stone.activities
                        .filter(activity => activity.resonant && activity.activeCooldown)
                        .map(activity => activity.activeCooldown),
                );

            return this._durationsService.durationDescription$(lowestCooldown)
                .pipe(
                    map(durationDescription => ` (Cooldown: ${ durationDescription })`),
                );
        } else {
            return of('');
        }
    }

    public onSelectAeonStone(index: number): void {
        const item: WornItem = this.item;
        const stone = this.newAeonStone[index]?.aeonStone;
        const inv: ItemCollection | undefined = this.newAeonStone[index]?.inv;

        if (!stone) {
            return;
        }

        if (!item.aeonStones[index] || stone !== item.aeonStones[index]) {
            // If there is an Aeon Stone in this slot, return the old stone to the inventory, unless we are in the item store.
            // Then remove it from the item.
            if (item.aeonStones[index]) {
                if (!this.itemStore) {
                    this._removeAeonStone(index);
                }

                item.aeonStones.splice(index, 1);
            }

            //Then add the new Aeon Stone to the item and (unless we are in the item store) remove it from the inventory.
            if (stone.name !== '') {
                //Add a copy of the stone to the item

                const newStone = stone
                    .clone(RecastService.recastFns)
                    .with({ amount: 1, isSlottedAeonStone: true }, RecastService.recastFns);

                item.aeonStones.push(newStone);

                // If we are not in the item store, remove the inserted Aeon Stone from the inventory,
                // either by decreasing the amount or by dropping the item.
                if (!this.itemStore && inv) {
                    this._inventoryService.dropInventoryItem(this._character, inv, stone, false, false, false, 1);
                }
            }
        }

        this._prepareChanges(stone);
        this._setAeonStoneNames();
        this._refreshService.processPreparedChanges();
    }

    public hint(stone: WornItem): string | undefined {
        if (this.itemStore && stone.price) {
            return `Price ${ this._priceText(stone) }`;
        }
    }

    public ngOnInit(): void {
        this._setAeonStoneNames();
    }

    private _cleanItems(): ItemCollection {
        return this._itemsDataService.cleanItems();
    }

    private _removeAeonStone(index: number): void {
        const character = this._character;
        const item: WornItem = this.item;
        const oldStone = item.aeonStones[index];

        if (!oldStone) {
            return;
        }

        oldStone.isSlottedAeonStone = false;
        this._prepareChanges(oldStone);
        //Add the extracted stone back to the inventory.
        this._inventoryService.grantInventoryItem(
            oldStone,
            { creature: character, inventory: character.mainInventory },
            { resetRunes: false, changeAfter: false, equipAfter: false },
        );
    }

    private _prepareChanges(stone: WornItem): void {
        this._refreshService.prepareChangesByItem(this._character, stone);
    }

    private _priceText(stone: WornItem): string {
        if (stone.price) {
            return priceTextFromCopper(stone.price);
        } else {
            return '';
        }
    }

    private _setAeonStoneNames(): void {
        this.newAeonStone =
            (this.item.aeonStones ? [
                (this.item.aeonStones[0] ? { aeonStone: this.item.aeonStones[0] } : { aeonStone: new WornItem() }),
                (this.item.aeonStones[1] ? { aeonStone: this.item.aeonStones[1] } : { aeonStone: new WornItem() }),
            ] : [{ aeonStone: new WornItem() }, { aeonStone: new WornItem() }]);
        this.newAeonStone.filter(stone => stone.aeonStone.name === 'New Item').forEach(stone => {
            stone.aeonStone.name = '';
        });
    }

}
