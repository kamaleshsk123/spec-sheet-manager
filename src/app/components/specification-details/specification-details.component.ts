import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Team } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-specification-details',
  templateUrl: './specification-details.component.html',
  styleUrls: ['./specification-details.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SpecificationDetailsComponent {
  @Input() specTitle: string = '';
  @Input() specVersion: string = '';
  @Input() specDescription: string = '';
  @Input() specTags: string = '';
  @Input() myTeams: Team[] = [];
  @Input() selectedTeamId: string | 'personal' = 'personal';
  @Input() currentSpecId: string | null = null;

  @Output() specTitleChange = new EventEmitter<string>();
  @Output() specVersionChange = new EventEmitter<string>();
  @Output() specDescriptionChange = new EventEmitter<string>();
  @Output() specTagsChange = new EventEmitter<string>();
  @Output() selectedTeamIdChange = new EventEmitter<string | 'personal'>();
}
