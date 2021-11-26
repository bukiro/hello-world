import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CharacterService } from 'src/app/services/character.service';
import { SavegameService } from 'src/app/services/savegame.service';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlayerMessage } from 'src/app/classes/PlayerMessage';
import { MessageService } from 'src/app/services/message.service';
import { TimeService } from 'src/app/services/time.service';
import { ToastService } from 'src/app/services/toast.service';
import { ConfigService } from 'src/app/services/config.service';
import { TypeService } from 'src/app/services/type.service';
import { ItemsService } from 'src/app/services/items.service';
import { RefreshService } from 'src/app/services/refresh.service';

@Component({
    selector: 'app-top-bar',
    templateUrl: './top-bar.component.html',
    styleUrls: ['./top-bar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopBarComponent implements OnInit {

    public newMessages: PlayerMessage[] = [];
    public modalOpen: boolean = false;
    public loginModalOpen: boolean = false;
    public password: string = "";
    public passwordFailed: boolean = false;
    @ViewChild('NewMessagesModal', { static: false })
    private newMessagesModal;
    @ViewChild('LoginModal', { static: false })
    private loginModal;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private characterService: CharacterService,
        private refreshService: RefreshService,
        private configService: ConfigService,
        private savegameService: SavegameService,
        private messageService: MessageService,
        private timeService: TimeService,
        private toastService: ToastService,
        private modalService: NgbModal,
        private typeService: TypeService,
        private itemsService: ItemsService,
        public modal: NgbActiveModal
    ) { }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    get_Database() {
        return this.configService.get_HasDBConnectionURL();
    }

    get_LoggingIn() {
        return this.configService.get_LoggingIn();
    }

    get_LoggedIn() {
        return this.configService.get_LoggedIn();
    }

    get_CannotLogin() {
        return this.configService.get_CannotLogin();
    }

    get_LoggedOutMessage() {
        return this.configService.get_LoggedOutMessage();
    }

    get_Savegames() {
        if (this.savegameService.get_LoadingError() || this.get_SavegamesInitializing()) {
            return null
        } else {
            return this.savegameService.get_Savegames();
        }
    }

    get_LoadingButtonTitle() {
        return this.characterService.get_LoadingStatus();
    }

    get_NewConditionMessages() {
        return this.messageService.get_NewMessages(this.characterService);
    }

    get_SavegamesInitializing() {
        return this.savegameService.still_loading();
    }

    set_Changed() {
        this.refreshService.set_Changed();
    }

    get_Darkmode() {
        return this.characterService.get_Darkmode();
    }

    toggle_Menu(menu: string) {
        this.characterService.toggle_Menu(menu);
        this.refreshService.set_ToChange("Character", "character-sheet");
        this.refreshService.process_ToChange();
    }

    get_ItemsMenuState() {
        return this.characterService.get_ItemsMenuState();
    }

    get_CraftingMenuState() {
        return this.characterService.get_CraftingMenuState();
    }

    get_CharacterMenuState() {
        return this.characterService.get_CharacterMenuState();
    }

    get_CompanionMenuState() {
        return this.characterService.get_CompanionMenuState();
    }

    get_FamiliarMenuState() {
        return this.characterService.get_FamiliarMenuState();
    }

    get_SpellsMenuState() {
        return this.characterService.get_SpellsMenuState();
    }

    get_SpellLibraryMenuState() {
        return this.characterService.get_SpellLibraryMenuState();
    }

    get_ConditionsMenuState() {
        return this.characterService.get_ConditionsMenuState();
    }

    get_DiceMenuState() {
        return this.characterService.get_DiceMenuState();
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_CompanionAvailable() {
        return this.characterService.get_CompanionAvailable();
    }

    get_FamiliarAvailable() {
        return this.characterService.get_FamiliarAvailable();
    }

    get_GMMode() {
        return this.characterService.get_GMMode();
    }

    get_ManualMode() {
        return this.characterService.get_ManualMode();
    }

    get_Companion() {
        return this.characterService.get_Companion();
    }

    get_Familiar() {
        return this.characterService.get_Familiar();
    }

    still_loading() {
        return this.characterService.still_loading();
    }

    get_IsBlankCharacter() {
        return this.characterService.get_IsBlankCharacter();
    }

    get_HasSpells() {
        let character = this.get_Character();
        return character.class?.spellCasting.some(casting => casting.spellChoices.some(choice => choice.charLevelAvailable <= character.level));
    }

    save() {
        this.characterService.save_Character();
    }

    get_Messages() {
        if (this.get_ManualMode() || !this.get_LoggedIn()) {
            //Don't check effects in manual mode or if not logged in.
            return false;
        }
        if (this.modalOpen) {
            //Don't check for messages if you are currently selecting messages from a previous check.
            return;
        };
        if (this.get_Character().settings.checkMessagesAutomatically) {
            //If the app checks for messages automatically, you don't need to check again manually. Just open the Dialog if messages exist, or let us know if not.
            if (this.messageService.get_NewMessages(this.characterService).length) {
                this.open_NewMessagesModal();
            } else {
                this.toastService.show("No new effects are available.");
            }
        } else {
            //Clean up old messages, then check for new messages, then open the dialog if any are found.
            this.messageService.cleanup_OldMessages().subscribe(() => {
                this.messageService.load_Messages(this.characterService.get_Character().id)
                    .subscribe((results: string[]) => {
                        //Get any new messages.
                        let newMessages = this.messageService.process_Messages(this.characterService, results)
                        //Add them to the list of new messages.
                        this.messageService.add_NewMessages(newMessages);
                        //If any exist, start the dialog. Otherwise give an appropriate response.
                        if (this.messageService.get_NewMessages(this.characterService).length) {
                            this.open_NewMessagesModal();
                        } else {
                            this.toastService.show("No new effects are available.");
                        }
                    }, (error) => {
                        this.toastService.show("An error occurred while searching for new effects. See console for more information.")
                        console.log('Error loading messages from database: ' + error.message);
                    });
            }, error => {
                if (error.status == 401) {
                    this.configService.on_LoggedOut("Your login is no longer valid. New effects could not be checked. Please try again after logging in.");
                } else {
                    this.toastService.show("An error occurred while cleaning up messages. See console for more information.")
                    console.log('Error cleaning up messages: ' + error.message);
                }
            })
        }
    }

    get_MessageCreature(message: PlayerMessage) {
        return this.characterService.get_MessageCreature(message);
    }

    get_MessageSender(message: PlayerMessage) {
        return this.characterService.get_MessageSender(message);
    }

    get_ItemMessageIncluded(message: PlayerMessage) {
        let included: string[] = [];
        if (message.includedItems.length) {
            included.push(message.includedItems.length + " extra items");
        }
        if (message.includedInventories.length) {
            included.push(message.includedInventories.length + " containers");
        }
        if (included.length) {
            return "Includes " + included.join(" and ");
        }
        return "";
    }

    open_NewMessagesModal() {
        this.modalOpen = true;
        //Freeze the new messages by cloning them so that the modal doesn't change while it's open.
        this.newMessages = this.get_NewConditionMessages().map(message => Object.assign<PlayerMessage, PlayerMessage>(new PlayerMessage(), JSON.parse(JSON.stringify(message))).recast(this.typeService, this.itemsService));
        this.modalService.open(this.newMessagesModal, { centered: true, ariaLabelledBy: 'modal-title' }).result.then((result) => {
            if (result == "Apply click") {
                //Prepare to refresh the effects of all affected creatures;
                this.characterService.get_Creatures().forEach(creature => {
                    if (this.newMessages.some(message => message.id == creature.id)) {
                        this.refreshService.set_ToChange(creature.type, "effects");
                    }
                })
                this.characterService.apply_MessageConditions(this.newMessages.filter(message => message.gainCondition.length));
                this.characterService.apply_MessageItems(this.newMessages.filter(message => message.offeredItem.length));
                this.newMessages.length = 0;
                this.refreshService.set_ToChange("Character", "top-bar");
                this.refreshService.process_ToChange();
                this.modalOpen = false;
            }
        }, (reason) => {
            //Do nothing if cancelled.
            this.modalOpen = false;
        });
    }

    on_SelectAllMessages(checked: boolean) {
        this.newMessages.forEach(message => {
            message.selected = checked;
        })
    }

    get_AllMessagesSelected() {
        return (this.newMessages.filter(message => message.selected).length >= this.newMessages.filter(message => this.get_MessageCreature(message)).length);
    }

    get_Duration(duration: number) {
        if (duration == -5) {
            return "(Default duration)";
        } else {
            return this.timeService.get_Duration(duration, false, true);
        }
    }

    open_LoginModal(passwordFailed: boolean = false) {
        if (!this.modalOpen) {
            this.modalOpen = true;
            this.password = "";
            if (passwordFailed) {
                this.passwordFailed = true;
            }
            this.modalService.open(this.loginModal, { centered: true, ariaLabelledBy: 'modal-title' }).result.then((result) => {
                if (result == "OK click") {
                    this.passwordFailed = false;
                    this.modalOpen = false;
                    this.configService.get_Login(this.password, this.characterService, this.savegameService);
                    this.password = "";
                }
            }, (reason) => {
                //If the login modal is cancelled in any way, it can go ahead and open right back up.
                this.modalOpen = false;
                this.open_LoginModal();
            });
        }
    }

    finish_Loading() {
        if (!this.get_Database() && !this.configService.still_loading()) {
            setTimeout(() => this.finish_Loading(), 500)
        } else {
            this.refreshService.get_Changed
                .subscribe((target) => {
                    if (["top-bar", "all", "character"].includes(target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                });
            this.refreshService.get_ViewChanged
                .subscribe((view) => {
                    if (view.creature.toLowerCase() == "character" && ["top-bar", "all"].includes(view.target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                    if (view.creature.toLowerCase() == "character" && view.target.toLowerCase() == "check-messages-manually") {
                        this.get_Messages();
                    }
                    if (view.creature.toLowerCase() == "character" && view.target.toLowerCase() == "logged-out") {
                        this.open_LoginModal();
                    }
                    if (view.creature.toLowerCase() == "character" && view.target.toLowerCase() == "password-failed") {
                        this.open_LoginModal(true);
                    }
                });
            return true;
        }
    }

    ngOnInit() {
        this.characterService.initialize("");
        this.finish_Loading();
    }

}