import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfTemplateComponent, PdfData } from '../pdf-template/pdf-template.component';
import { HtmlPdfService } from '../../services/html-pdf.service';

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfTemplateComponent],
  templateUrl: './pdf-preview.component.html',
  styleUrls: ['./pdf-preview.component.css']
})
export class PdfPreviewComponent implements OnInit {
  
  // Sample data for testing the PDF template
  sampleData: PdfData = {
    specTitle: 'Sample IoT Device Specification',
    specVersion: '2.1.0',
    specDescription: 'This is a comprehensive specification document for IoT device communication protocols and message structures. It includes detailed information about supported protocols, message formats, and data validation rules.',
    deviceName: 'Smart Sensor Hub Pro',
    protocols: ['HTTP/HTTPS', 'MQTT', 'WebSocket', 'CoAP'],
    documentStatus: 'Draft',
    applicableTo: 'All IoT devices in the Smart Home ecosystem',
    selectedEnvelope: {
      id: 'env_001',
      title: 'Standard Message Envelope v2.0'
    },
    demoJsonText: `{
  "messageId": "msg_12345",
  "timestamp": "2024-10-08T10:30:00Z",
  "deviceId": "sensor_hub_001",
  "version": "2.0",
  "metadata": {
    "source": "temperature_sensor",
    "priority": "normal",
    "encrypted": false
  }
}`,
    messageTypes: [
      {
        name: 'TemperatureReading',
        json_schema: {
          properties: {
            temperature: { type: 'number', minimum: -50, maximum: 100 },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            sensorId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            accuracy: { type: 'number', minimum: 0, maximum: 1 }
          }
        }
      },
      {
        name: 'HumidityReading',
        json_schema: {
          properties: {
            humidity: { type: 'number', minimum: 0, maximum: 100 },
            sensorId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            calibrated: { type: 'boolean' }
          }
        }
      },
      {
        name: 'DeviceStatus',
        json_schema: {
          properties: {
            deviceId: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'maintenance'] },
            batteryLevel: { type: 'integer', minimum: 0, maximum: 100 },
            lastSeen: { type: 'string', format: 'date-time' },
            firmware: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                updateAvailable: { type: 'boolean' }
              }
            }
          }
        }
      },
      {
        name: 'AlertMessage',
        json_schema: {
          properties: {
            alertId: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            message: { type: 'string' },
            deviceId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            acknowledged: { type: 'boolean' },
            tags: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    ],
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };

  // Editable fields for live preview
  editableData: PdfData;
  
  constructor(private htmlPdfService: HtmlPdfService) {
    // Create a copy for editing
    this.editableData = JSON.parse(JSON.stringify(this.sampleData));
  }

  ngOnInit(): void {
    // Component initialization
  }

  // Reset to sample data
  resetToSample(): void {
    this.editableData = JSON.parse(JSON.stringify(this.sampleData));
  }

  // Generate PDF from current data
  async generatePdf(): Promise<void> {
    try {
      await this.htmlPdfService.generatePdfFromHtml(this.editableData, 'pdf-template-preview.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Check console for details.');
    }
  }

  // Print preview (opens browser print dialog)
  async printPreview(): Promise<void> {
    try {
      await this.htmlPdfService.printHtml(this.editableData);
    } catch (error) {
      console.error('Error printing:', error);
      alert('Error printing. Check console for details.');
    }
  }

  // Add a new message type for testing
  addMessageType(): void {
    const newMessageType = {
      name: 'CustomMessage' + (this.editableData.messageTypes.length + 1),
      json_schema: {
        properties: {
          id: { type: 'string' },
          data: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    };
    this.editableData.messageTypes.push(newMessageType);
  }

  // Remove a message type
  removeMessageType(index: number): void {
    this.editableData.messageTypes.splice(index, 1);
  }

  // Add a protocol
  addProtocol(): void {
    const newProtocol = prompt('Enter protocol name:');
    if (newProtocol && newProtocol.trim()) {
      this.editableData.protocols.push(newProtocol.trim());
    }
  }

  // Remove a protocol
  removeProtocol(index: number): void {
    this.editableData.protocols.splice(index, 1);
  }
}