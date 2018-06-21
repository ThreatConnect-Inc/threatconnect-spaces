import { Injectable } from '@angular/core';
import {
    SpacesLoggingService,
    SpacesMessagesService
} from 'spaces-ng';
import { TcExchangeDbService } from 'threatconnect-ng';

import { Profile } from '../interfaces';


@Injectable()
export class DatastoreService {
    private domain: string = 'organization';
    private typeName: string = 'app-data';
    private searchCommand: string = 'indicatorProfiles';
    public existingProfiles: Profile[] = [];

    constructor(
        private exchangeDB: TcExchangeDbService,
        private logging: SpacesLoggingService,
        private messages: SpacesMessagesService
    ) { }

    public getData() {
        /*
         * Get the data from the datastore
         */
        this.exchangeDB.read(this.domain, this.typeName, this.searchCommand, null, '{"size": 10000}')
            .subscribe(
                response => {
                    this.existingProfiles = JSON.parse(response._source.text);
                },
                err => {
                  this.logging.error('Error', err);
                  this.messages.showError('Failed', 'Unable to get data from the datastore: ' + err);
                }
            );
    }

    private writeToDatastore() {
        /* Write the existingProfiles to the datastore. */
        // console.log('stringified: ' + JSON.stringify(this.existingProfiles));
        let stringified = JSON.stringify(this.existingProfiles).replace(/"/g, "\\\"");
        let newData = '{"text": "' + stringified + '"}'
        this.exchangeDB.create(this.domain, this.typeName, this.searchCommand, newData)
            .subscribe(
                response => {
                    this.messages.showSuccess('Success', 'Profile updated')
                },
                err => {
                    this.logging.error('Error', err);
                    this.messages.showError('Failed', 'Unable to save data: ' + err);
                }
            );
    }

    private removeProfile(profileName: string) {
        for (var i = this.existingProfiles.length - 1; i >= 0; i--) {
            if (this.existingProfiles[i].name === profileName) {
                this.existingProfiles.splice(i, 1);
                break;
            }
        }
    }

    public save(data: Profile) {
        /*
         * Save data into the datastore
         */
        this.removeProfile(data.name);
        this.existingProfiles.push(data);
        this.writeToDatastore();
    }

    public delete(profileName: string) {
        this.removeProfile(profileName);
        this.writeToDatastore();
    }
}