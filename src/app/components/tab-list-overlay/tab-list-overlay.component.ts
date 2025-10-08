
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Team } from '../../services/api.service';
import { JsonField, JsonSchemaProperty } from '../definition-details/definition-details';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-tab-list-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-list-overlay.component.html',
  styleUrls: ['./tab-list-overlay.component.css']
})
export class TabListOverlayComponent implements OnInit {
  @Input() tabs: { name: string, content: string }[] = [];
  @Input() specTitle: string = '';
  @Input() specVersion: string = '';
  @Input() specDescription: string = '';
  @Input() deviceName: string | undefined = '';
  @Input() protocols: string[] | undefined = [];
  @Input() documentStatus: string | undefined = '';
  @Input() applicableTo: string | undefined = '';
  @Input() messageEnvelopes: any[] = [];
  @Input() selectedEnvelopeId: string | null = null;
  @Input() demoJsonText: string = '';
  @Input() messageTypes: any[] = [];
  @Input() combinedPayloadText: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() envelopeSelected = new EventEmitter<string>();
  @Output() messageTypeSelected = new EventEmitter<any>();

  selectedTabIndex: number | null = 0;
  selectedMessageTypeIndex: number | null = null;
  isExpanded: boolean = true;
  isCopied: string | null = null;
  searchTerm: string = '';
  filteredMessageTypes: any[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.filterMessageTypes();
    if (this.isExpanded) {
      this.selectedTabIndex = null; // Open all tabs
      if (this.messageEnvelopes.length > 0) {
        this.selectEnvelope(this.messageEnvelopes[0].id);
      }
    }
  }

  filterMessageTypes() {
    if (!this.searchTerm) {
      this.filteredMessageTypes = this.messageTypes;
    } else {
      this.filteredMessageTypes = this.messageTypes.filter(messageType =>
        messageType.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  closeOverlay() {
    this.close.emit();
  }

  toggleTab(index: number) {
    if (this.isExpanded) {
      return; // Keep all tabs open
    }
    if (this.selectedTabIndex === index) {
      this.selectedTabIndex = null;
    } else {
      this.selectedTabIndex = index;
    }
  }

  selectEnvelope(envelopeId: string) {
    this.envelopeSelected.emit(envelopeId);
    this.selectedMessageTypeIndex = null;
  }

  toggleMessageType(index: number, messageType: any) {
    if (this.selectedMessageTypeIndex === index) {
      this.selectedMessageTypeIndex = null;
      this.messageTypeSelected.emit(null);
    } else {
      this.selectedMessageTypeIndex = index;
      this.messageTypeSelected.emit(messageType);
    }
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.selectedTabIndex = null; // Open all tabs
      if (this.messageEnvelopes.length > 0) {
        this.selectEnvelope(this.messageEnvelopes[0].id);
      }
    }
  }

  copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.isCopied = type;
      this.notificationService.success('Copied to clipboard');
      setTimeout(() => {
        this.isCopied = null;
      }, 2000);
    });
  }
}

