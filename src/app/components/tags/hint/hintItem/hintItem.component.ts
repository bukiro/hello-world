import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { TraitsService } from 'src/app/services/traits.service';
import { ActivitiesDataService } from 'src/app/core/services/data/activities-data.service';
import { CharacterService } from 'src/app/services/character.service';
import { Creature } from 'src/app/classes/Creature';
import { Item } from 'src/app/classes/Item';
import { RefreshService } from 'src/app/services/refresh.service';
import { Subscription } from 'rxjs';
import { EffectsService } from 'src/app/services/effects.service';

@Component({
    selector: 'app-hintItem',
    templateUrl: './hintItem.component.html',
    styleUrls: ['./hintItem.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HintItemComponent implements OnInit {

    @Input()
    creature = 'Character';
    @Input()
    item: Item | any;

    constructor(
        public characterService: CharacterService,
        public effectsService: EffectsService,
        private readonly changeDetector: ChangeDetectorRef,
        private readonly traitsService: TraitsService,
        private readonly activitiesService: ActivitiesDataService,
        private readonly refreshService: RefreshService,
    ) { }

    trackByIndex(index: number): number {
        return index;
    }

    get_Creature(creature: string = this.creature) {
        return this.characterService.creatureFromType(creature) as Creature;
    }

    get_Traits(name = '') {
        return this.traitsService.traits(name);
    }

    get_Activities(name = '') {
        return this.activitiesService.activities(name);
    }

    finish_Loading() {
        if (this.item.id) {
            this.changeSubscription = this.refreshService.componentChanged$
                .subscribe(target => {
                    if (target == this.item.id) {
                        this.changeDetector.detectChanges();
                    }
                });
            this.viewChangeSubscription = this.refreshService.detailChanged$
                .subscribe(view => {
                    if (view.target == this.item.id) {
                        this.changeDetector.detectChanges();
                    }
                });
        }
    }

    public ngOnInit(): void {
        this.finish_Loading();
    }

    private changeSubscription: Subscription;
    private viewChangeSubscription: Subscription;

    ngOnDestroy() {
        this.changeSubscription?.unsubscribe();
        this.viewChangeSubscription?.unsubscribe();
    }

}
