import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-compare-modal',
  imports: [CommonModule],
  templateUrl: './json-compare-modal.component.html',
  styleUrls: ['./json-compare-modal.component.css'],
  standalone: true,
})
export class JsonCompareModalComponent {
  @Input() oldSpec: any;
  @Input() newSpec: any;
  @Output() close = new EventEmitter<void>();

  get oldSpecJson() {
    return JSON.stringify(this.oldSpec, null, 2);
  }

  get newSpecJson() {
    return JSON.stringify(this.newSpec, null, 2);
  }
}
