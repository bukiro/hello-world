import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { Activity } from 'src/app/classes/activities/activity';
import { Creature } from 'src/app/classes/creatures/creature';
import { Trait } from 'src/app/classes/hints/trait';
import { Equipment } from 'src/app/classes/items/equipment';
import { Item } from 'src/app/classes/items/item';
import { Rune } from 'src/app/classes/items/rune';
import { ActivityPropertiesService } from 'src/libs/shared/services/activity-properties/activity-properties.service';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { TraitsDataService } from 'src/libs/shared/services/data/traits-data.service';
import { ItemRolesService } from 'src/libs/shared/services/item-roles/item-roles.service';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { BaseClass } from 'src/libs/shared/util/classes/base-class';
import { TrackByMixin } from 'src/libs/shared/util/mixins/track-by-mixin';

interface ItemParameters {
    item: Item;
    asGrantingActivities?: Equipment;
    asHavingItemActivities?: Equipment | Rune;
}

@Component({
    selector: 'app-hint-item',
    templateUrl: './hint-item.component.html',
    styleUrls: ['./hint-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HintItemComponent extends TrackByMixin(BaseClass) implements OnInit, OnDestroy {

    @Input()
    public creature: Creature = CreatureService.character;
    @Input()
    public item!: Item;

    private _changeSubscription?: Subscription;
    private _viewChangeSubscription?: Subscription;

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _traitsDataService: TraitsDataService,
        private readonly _refreshService: RefreshService,
        private readonly _itemRolesService: ItemRolesService,
        private readonly _activityPropertiesService: ActivityPropertiesService,
    ) {
        super();
    }

    public itemParameters(): ItemParameters {
        const itemRoles = this._itemRolesService.getItemRoles(this.item);

        return {
            item: this.item,
            asGrantingActivities: itemRoles.asEquipment,
            asHavingItemActivities: this.item instanceof Rune ? this.item : itemRoles.asEquipment,
        };
    }

    public itemTraits$(): Observable<Array<string>> {
        return this.item.effectiveTraits$;
    }

    public traitFromName(name: string): Trait {
        return this._traitsDataService.traitFromName(name);
    }

    public activityCooldown$(activity: Activity): Observable<number> {
        return this._activityPropertiesService.effectiveCooldown$(activity, { creature: this.creature });
    }

    public ngOnInit(): void {
        if (this.item.id) {
            this._changeSubscription = this._refreshService.componentChanged$
                .subscribe(target => {
                    if (target === this.item.id) {
                        this._changeDetector.detectChanges();
                    }
                });
            this._viewChangeSubscription = this._refreshService.detailChanged$
                .subscribe(view => {
                    if (view.target === this.item.id) {
                        this._changeDetector.detectChanges();
                    }
                });
        }
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
    }

}
