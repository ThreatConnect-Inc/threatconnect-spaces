import { Injectable } from '@angular/core';
import {
    SpacesLoggingService,
    SpacesMessagesService
} from 'spaces-ng';
import { TcExchangeDbService } from 'threatconnect-ng';


@Injectable()
export class DatastoreService {
    public domain: string = 'local';  // system, organization, local
    public typeName: string = 'notes';
    public notes: any[] = [];

    constructor(
        private exchangeDB: TcExchangeDbService,
        private logging: SpacesLoggingService,
        private messages: SpacesMessagesService
    ) { /* empty block */ }

    public getNotes(searchCommand: string) {
        /*
         * Get the notes from the datastore
         */
        this.exchangeDB.read(this.domain, this.typeName, searchCommand)
            .subscribe(
                response => {
                    for (var i = response.hits.hits.length - 1; i >= 0; i--) {
                        this.notes.push({
                            'text': response.hits.hits[i]._source.text,
                            'id': response.hits.hits[i]._id
                        });
                    }
                },
                err => {
                  this.logging.error('Error', err);
                  this.messages.showError('Failed', 'Unable to retrieve the notes: ' + err);
                }
            );
    }

    public save(searchCommand: string, noteText: string) {
        /*
         * Save a note to the datastore
         */
        let jsonifiedNoteText = JSON.parse('{"text": "' + noteText + '"}');

        this.exchangeDB.create(this.domain, this.typeName, searchCommand, jsonifiedNoteText)
                .subscribe(
                    response => {
                        // this.messages.showSuccess('Success', 'Note saved');
                        // if a note is being updated, simply update the note's text rather than adding a new note
                        if (searchCommand !== '') {
                            for (var i = this.notes.length - 1; i >= 0; i--) {
                                if (this.notes[i].id === searchCommand) {
                                    this.notes[i].text = noteText
                                    break;
                                }
                            }
                        } else {
                            this.notes.push({
                                'text': noteText,
                                'id': response._id,
                            });
                        }
                    },
                    err => {
                        this.logging.error('Error', err);
                        this.messages.showError('Failed', 'Unable to save note: ' + err);
                    }
                );
    }

    public delete(noteId: string) {
        this.exchangeDB.delete(this.domain, this.typeName, noteId)
                .subscribe(
                    response => {
                        // this.messages.showSuccess('Success', 'Note deleted');
                        for (var i = this.notes.length - 1; i >= 0; i--) {
                            // remove the note from the list of notes
                            if (this.notes[i].id === noteId) {
                                this.notes.splice(i, 1);
                                break;
                            }
                        }
                    },
                    err => {
                        this.logging.error('Error', err);
                        this.messages.showError('Failed', 'Unable to delete note: ' + err);
                    }
                );
    }
}
