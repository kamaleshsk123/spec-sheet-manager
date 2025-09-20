import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  specSheets = [
    { id: 1, title: 'Device Telemetry', createdDate: new Date(), version: '1.0' },
    { id: 2, title: 'User Profile', createdDate: new Date(), version: '1.2' },
    { id: 3, title: 'Product Catalog', createdDate: new Date(), version: '2.0' },
  ];
}