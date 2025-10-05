import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-message-envelope-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-envelope-list.component.html',
  styleUrls: ['./message-envelope-list.component.css']
})
export class MessageEnvelopeListComponent implements OnInit {
  @Output() envelopeSelected = new EventEmitter<any>();
  @Input() showNewButton: boolean = true;
  @Input() showDeleteButton: boolean = true;
  messageEnvelopes: any[] = [];
  selectedMessageEnvelope: any = null;

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadMessageEnvelopes();
  }

  loadMessageEnvelopes() {
    this.apiService.getMessageEnvelopes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.messageEnvelopes = response.data;
          if (this.messageEnvelopes.length > 0) {
            this.selectMessageEnvelope(this.messageEnvelopes[0]);
          }
        }
      },
      error: (err) => {
        this.notificationService.error('Error', 'Failed to load message envelopes.');
      }
    });
  }

  selectMessageEnvelope(envelope: any) {
    this.selectedMessageEnvelope = envelope;
    this.envelopeSelected.emit(this.selectedMessageEnvelope);
  }

  newMessageEnvelope() {
    const newEnvelope = {
      title: 'New Message Envelope',
      description: '',
      json_fields: [
        { name: 'imei', type: 'number', is_required: true, digits: 15, children: [], items: { type: 'string', children: [] } },
        { name: 'event_ts', type: 'time', is_required: true, children: [], items: { type: 'string', children: [] } },
        { name: 'message-type', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
        { name: 'sequence', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
        { name: 'csq-dbm', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
        { name: 'rat_code', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
        { name: 'cmd_id', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
      ]
    };
    // We don't add it to the main list until it's saved.
    // We just emit it so the parent can deal with it.
    this.envelopeSelected.emit(newEnvelope);
  }

  deleteMessageEnvelope(id: string) {
    if (confirm('Are you sure you want to delete this message envelope?')) {
      this.apiService.deleteMessageEnvelope(id).subscribe({
        next: (response) => {
          if (response.success) {
            const deletedIndex = this.messageEnvelopes.findIndex(e => e.id === id);
            if (deletedIndex > -1) {
              this.messageEnvelopes.splice(deletedIndex, 1);
              if (this.selectedMessageEnvelope && this.selectedMessageEnvelope.id === id) {
                const newSelection = this.messageEnvelopes.length > 0 ? this.messageEnvelopes[0] : null;
                this.selectMessageEnvelope(newSelection);
              }
            }
            this.notificationService.success('Success', 'Message envelope deleted successfully.');
          } else {
            this.notificationService.error('Error', 'Failed to delete message envelope.');
          }
        },
        error: (err) => {
          this.notificationService.error('Error', 'Failed to delete message envelope.');
        }
      });
    }
  }
}
