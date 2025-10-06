import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { Team } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-specification-details',
  templateUrl: './specification-details.component.html',
  styleUrls: ['./specification-details.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class SpecificationDetailsComponent {
  @Input() specTitle: string = '';
  @Input() specVersion: string = '';
  @Input() specDescription: string = '';
  @Input() specTags: string = '';

  // New fields
  @Input() deviceName: string = '';
  @Input() protocols: string[] = [];
  @Input() documentStatus: string = '';
  @Input() forField: string = '';

  @Input() myTeams: Team[] = [];
  @Input() selectedTeamId: string | 'personal' = 'personal';
  @Input() currentSpecId: string | null = null;

  @Output() specTitleChange = new EventEmitter<string>();
  @Output() specVersionChange = new EventEmitter<string>();
  @Output() specDescriptionChange = new EventEmitter<string>();
  @Output() specTagsChange = new EventEmitter<string>();

  // New field change outputs for two-way binding support
  @Output() deviceNameChange = new EventEmitter<string>();
  @Output() protocolsChange = new EventEmitter<string[]>();
  @Output() documentStatusChange = new EventEmitter<string>();
  @Output() forFieldChange = new EventEmitter<string>();

  @Output() selectedTeamIdChange = new EventEmitter<string | 'personal'>();
  @Output() saveSpecDetails = new EventEmitter<void>();

  isProtocolOpen = false;
  isStatusOpen = false;
  statusOptions = ['Draft', 'In Review', 'Approved', 'Released', 'Deprecated', 'Retired'];

  constructor(private eRef: ElementRef) {}

  toggleProtocol(option: string) {
    if (this.protocols.includes(option)) {
      this.protocols = this.protocols.filter((p) => p !== option);
    } else {
      this.protocols.push(option);
    }
    this.protocolsChange.emit(this.protocols);
  }

  statusColors: Record<string, string> = {
    Draft: 'bg-yellow-400',
    'In Review': 'bg-blue-400',
    Approved: 'bg-green-500',
    Released: 'bg-purple-500',
    Deprecated: 'bg-orange-500',
    Retired: 'bg-gray-500',
  };

  selectStatus(option: string) {
    this.documentStatus = option;
    this.documentStatusChange.emit(option);
    this.isStatusOpen = false;
  }

  // 👇 Detect outside clicks and close dropdowns
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isProtocolOpen = false;
      this.isStatusOpen = false;
    }
  }

  // 👇 Close dropdowns when ESC key is pressed
  @HostListener('document:keydown.escape')
  onEscKey() {
    this.isProtocolOpen = false;
    this.isStatusOpen = false;
  }
}
