import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProtobufSpec } from '../../services/api.service';

@Component({
  selector: 'app-publish-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publish-modal.component.html',
  styleUrls: ['./publish-modal.component.css']
})
export class PublishModalComponent {
  @Input() spec: ProtobufSpec | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() publish = new EventEmitter<any>();

  repoName: string = '';
  description: string = '';
  isPrivate: boolean = false;

  ngOnChanges() {
    if (this.spec) {
      this.repoName = this.spec.title.replace(/\s+/g, '-').toLowerCase();
      this.description = this.spec.description || '';
    }
  }

  onPublish() {
    this.publish.emit({ 
      repoName: this.repoName, 
      description: this.description, 
      isPrivate: this.isPrivate 
    });
  }

  onClose() {
    this.close.emit();
  }
}
