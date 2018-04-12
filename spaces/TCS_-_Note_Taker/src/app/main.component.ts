import {
    Component,
    OnInit,
    ViewChild
} from '@angular/core';

import { Router } from '@angular/router';

import {
    SpacesBaseService,
    SpacesLoggingService,
    SpacesMessagesService,
    SpacesStorageService
} from 'spaces-ng/';

// import { NewNoteComponent } from './components/new-note/new-note.component';
import { NoteTakerComponent } from './components/note-taker/note-taker.component';

@Component({
    templateUrl: './main.component.html',
    selector: 'tc-context-main',
})
export class MainComponent implements OnInit {
    // @ViewChild(NewNoteComponent) newNote: NewNoteComponent;
    @ViewChild(NoteTakerComponent) noteTaker: NoteTakerComponent;

    constructor(
        private logging: SpacesLoggingService,
        private messages: SpacesMessagesService,
        private router: Router,
        private spacesBase: SpacesBaseService,
        private storage: SpacesStorageService,
    ) {
        this.logging.moduleColor('#FFFF00', '#000', 'MainComponent');  // set logging console colors
    }

    ngOnInit() {
        // spacesBase promise (indicates query parameters have been stored)
        this.spacesBase.initialized.then();
    }
}
