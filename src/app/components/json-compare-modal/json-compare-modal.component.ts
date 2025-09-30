import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-json-compare-modal',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: './json-compare-modal.component.html',
  styleUrls: ['./json-compare-modal.component.css']
})
export class JsonCompareModalComponent {
  @Input() specData: { oldSpec: any, newSpec: any } | null = null;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
