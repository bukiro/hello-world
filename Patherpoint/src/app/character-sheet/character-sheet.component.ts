import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostBinding } from '@angular/core';
import { CharacterService } from '../character.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-character-sheet',
    templateUrl: './character-sheet.component.html',
    styleUrls: ['./character-sheet.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharacterSheetComponent implements OnInit {

    @HostBinding("attr.style")
    public get valueAsStyle(): any {
        return this.sanitizer.bypassSecurityTrustStyle(`--accent: ${this.get_Accent()}`);
    }

    constructor(
        private characterService: CharacterService,
        private sanitizer: DomSanitizer,
        private changeDetector: ChangeDetectorRef
    ) { }
    
    still_loading() {
        return this.characterService.still_loading();
    }

    get_Accent() {
        return this.characterService.get_Accent();
    }

    get_GeneralMinimized() {
       return this.characterService.get_Character().settings.generalMinimized;
    }

    get_EffectsMinimized() {
        return this.characterService.get_Character().settings.effectsMinimized;
    }

    get_AbilitiesMinimized() {
       return this.characterService.get_Character().settings.abilitiesMinimized;
    }

    get_HealthMinimized() {
       return this.characterService.get_Character().settings.healthMinimized;
    }

    get_DefenseMinimized() {
       return this.characterService.get_Character().settings.defenseMinimized;
    }
    
    get_AttacksMinimized() {
        return this.characterService.get_Character().settings.attacksMinimized;
    }

    get_SkillsMinimized() {
        return this.characterService.get_Character().settings.skillsMinimized;
    }
    
    get_InventoryMinimized() {
       return this.characterService.get_Character().settings.inventoryMinimized;
    }
    
    get_ActivitiesMinimized() {
       return this.characterService.get_Character().settings.activitiesMinimized;
    }
    
    get_SpellbookMinimized() {
       return this.characterService.get_Character().settings.spellbookMinimized;
    }

    get_TimeMinimized() {
       return this.characterService.get_Character().settings.timeMinimized;
    }
    
    finish_Loading() {
        if (this.characterService.still_loading()) {
            setTimeout(() => this.finish_Loading(), 500)
        } else {
            this.characterService.get_Changed()
            .subscribe(() => 
            this.changeDetector.detectChanges()
            )
            return true;
        }
    }

    ngOnInit() {
        this.finish_Loading();
    }

}
