import { Component, OnInit } from '@angular/core';

import { DatastoreService } from '../../services/datastore.service';

declare var $:any

@Component({
  selector: 'note-taker',
  templateUrl: './note-taker.component.html',
  styleUrls: ['./note-taker.component.less']
})
export class NoteTakerComponent implements OnInit {
  private notes: any[] = [];
  public noteText: string = '';
  public noteId: string = '';
  public saved: boolean = true;

  constructor(public datastore: DatastoreService) {}

  ngOnInit() {
    this.datastore.getNotes('');
    $(document).foundation();
    this.focus();
  }

  private focus() {
    /* Focus on the text area. */
    $('#noteInput').focus();
  }

  private reset() {
    this.noteText = '';
    this.noteId = '';
    this.focus();
    this.saved = true;
  }

  newNote() {
    /* Start a new note. */
    this.reset();
  }

  openNote(noteText: string, noteId: string) {
    this.noteText = noteText;
    this.noteId = noteId;
    this.focus();
    this.saved = true;
  }

  saveNote() {
    this.datastore.save('', this.noteText);
    // I'm clearing the noteText because I don't know how to update the note's id from the datastore.service, so I need to force the user to click on the recently saved note to load the note's id - todo: this is not ideal. fix it!
    this.reset();
  }

  updateNote() {
    this.datastore.save(this.noteId, this.noteText);
    this.focus();
    this.saved = true;
  }

  deleteNote(noteText: string, noteId: string) {
    // set the note text - I am intentionally not clearing this value so the user can re-save the note if the deletion was a mistake
    this.noteText = noteText;
    this.datastore.delete(noteId);
    // reset the note id
    this.noteId = '';
    this.focus();
    this.saved = false;
  }

}
