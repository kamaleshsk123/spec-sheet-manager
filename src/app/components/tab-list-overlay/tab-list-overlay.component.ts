
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '../../services/api.service';

@Component({
  selector: 'app-tab-list-overlay',
  standalone: true,
  imports: [CommonModule],
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

  @Output() close = new EventEmitter<void>();

  selectedTabIndex: number | null = null;

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
}
