
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Team } from '../../services/api.service';
import { JsonField, JsonSchemaProperty } from '../definition-details/definition-details';

@Component({
  selector: 'app-tab-list-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-list-overlay.component.html',
  styleUrls: ['./tab-list-overlay.component.css']
})
export class TabListOverlayComponent {
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

  selectedTabIndex: number | null = null;
  selectedMessageTypeIndex: number | null = null;

  constructor() {}

  closeOverlay() {
    this.close.emit();
  }

  toggleTab(index: number) {
    if (this.selectedTabIndex === index) {
      this.selectedTabIndex = null;
    } else {
      this.selectedTabIndex = index;
    }
  }

  selectEnvelope(envelopeId: string) {
    this.envelopeSelected.emit(envelopeId);
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
}

