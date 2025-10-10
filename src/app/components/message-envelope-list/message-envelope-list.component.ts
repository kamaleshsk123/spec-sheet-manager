import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageEnvelopeService } from '../../services/message-envelope.service';
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
  @Output() dataChanged = new EventEmitter<void>();
  @Input() showNewButton: boolean = true;
  @Input() showDeleteButton: boolean = true;
  messageEnvelopes: any[] = [];
  selectedMessageEnvelope: any = null;

  constructor(
    private messageEnvelopeService: MessageEnvelopeService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.messageEnvelopeService.envelopes$.subscribe(envelopes => {
      this.messageEnvelopes = envelopes;
      if (!this.selectedMessageEnvelope && this.messageEnvelopes.length > 0) {
        this.selectMessageEnvelope(this.messageEnvelopes[0]);
      }
    });
    this.messageEnvelopeService.loadEnvelopes().subscribe();
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
    this.envelopeSelected.emit(newEnvelope);
    // Emit dataChanged when a new envelope is added
    this.dataChanged.emit();
  }

  deleteMessageEnvelope(id: string) {
    if (confirm('Are you sure you want to delete this message envelope?')) {
      this.messageEnvelopeService.deleteMessageEnvelope(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Success', 'Message envelope deleted successfully.');
            // The list will update automatically via the service
            if (this.selectedMessageEnvelope && this.selectedMessageEnvelope.id === id) {
              this.selectMessageEnvelope(this.messageEnvelopes.length > 0 ? this.messageEnvelopes[0] : null);
            }
            // Emit dataChanged when an envelope is successfully deleted
            this.dataChanged.emit();
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
