import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProtobufSpec } from '../../services/api.service';

@Component({
  selector: 'app-push-to-branch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './push-to-branch-modal.component.html',
  styleUrls: ['./push-to-branch-modal.component.css']
})
export class PushToBranchModalComponent {
  @Input() spec: ProtobufSpec | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() push = new EventEmitter<any>();

  commitMessage: string = '';

  ngOnChanges() {
    if (this.spec) {
      this.commitMessage = `Update ${this.spec.title} v${this.spec.version}`;
    }
  }

  onPush() {
    this.push.emit({ commitMessage: this.commitMessage });
  }

  onClose() {
    this.close.emit();
  }
}
