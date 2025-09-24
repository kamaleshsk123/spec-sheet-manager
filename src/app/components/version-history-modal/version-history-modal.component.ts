import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProtobufSpec, SpecVersion } from '../../services/api.service';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-modal.component.html',
  styleUrls: ['./version-history-modal.component.css']
})
export class VersionHistoryModalComponent {
  @Input() spec: ProtobufSpec | null = null;
  @Input() versions: SpecVersion[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() editVersion = new EventEmitter<{ specId: string, version: string }>();

  closeModal() {
    this.close.emit();
  }

  onEditVersion(specId: string, version: string) {
    this.editVersion.emit({ specId, version });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
