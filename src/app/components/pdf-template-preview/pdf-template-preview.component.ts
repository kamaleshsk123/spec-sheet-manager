import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PdfTemplateComponent, PdfData } from '../pdf-template/pdf-template.component';
import { HtmlPdfService } from '../../services/html-pdf.service';
import { ApiService, ProtobufSpec } from '../../services/api.service';

@Component({
  selector: 'app-pdf-template-preview',
  standalone: true,
  imports: [CommonModule, PdfTemplateComponent],
  templateUrl: './pdf-template-preview.component.html',
  styleUrls: ['./pdf-template-preview.component.css']
})
export class PdfTemplatePreviewComponent implements OnInit {
  
  isLoadingSpec: boolean = false;
  currentSpec: ProtobufSpec | null = null;
  
  // Sample data for testing the PDF template
  sampleData: PdfData = {
    specTitle: 'Sample IoT Device Specification',
    specVersion: '2.1.0',
    specDescription: 'This is a comprehensive specification document for a sample IoT device that demonstrates all the features of our PDF template system.',
    deviceName: 'Smart Temperature Sensor Pro',
    protocols: ['MQTT', 'HTTP/REST', 'WebSocket', 'CoAP'],
    documentStatus: 'Draft',
    applicableTo: 'IoT Edge Devices, Smart Home Systems, Industrial Monitoring',
    selectedEnvelope: {
      id: 'temp_sensor_envelope',
      title: 'Temperature Sensor Message Envelope'
    },
    demoJsonText: JSON.stringify({
      "envelope_id": "temp_sensor_envelope",
      "device_id": "sensor_001",
      "timestamp": "2024-01-15T10:30:00Z",
      "message_type": "temperature_reading",
      "payload": {
        "temperature": 23.5,
        "humidity": 65.2,
        "battery_level": 87
      }
    }, null, 2),
    messageTypes: [
      {
        name: 'TemperatureReading',
        json_schema: {
          properties: {
            id: { type: 'string' },
            temperature: { type: 'number', minimum: -50, maximum: 100 },
            humidity: { type: 'number', minimum: 0, maximum: 100 },
            timestamp: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            battery_level: { type: 'integer', minimum: 0, maximum: 100 }
          }
        }
      },
      {
        name: 'DeviceStatus',
        json_schema: {
          properties: {
            device_id: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'maintenance'] },
            uptime: { type: 'integer' },
            last_seen: { type: 'string', format: 'date-time' },
            firmware_version: { type: 'string' },
            network_strength: { type: 'integer', minimum: 0, maximum: 100 }
          }
        }
      },
      {
        name: 'AlertMessage',
        json_schema: {
          properties: {
            alert_id: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            message: { type: 'string' },
            triggered_at: { type: 'string', format: 'date-time' },
            resolved: { type: 'boolean' },
            metadata: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                category: { type: 'string' }
              }
            }
          }
        }
      },
      {
        name: 'ConfigurationUpdate',
        json_schema: {
          properties: {
            config_id: { type: 'string' },
            settings: {
              type: 'object',
              properties: {
                sampling_rate: { type: 'integer' },
                reporting_interval: { type: 'integer' },
                thresholds: {
                  type: 'object',
                  properties: {
                    temperature_min: { type: 'number' },
                    temperature_max: { type: 'number' },
                    humidity_max: { type: 'number' }
                  }
                }
              }
            },
            applied_at: { type: 'string', format: 'date-time' },
            applied_by: { type: 'string' }
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

  constructor(
    private htmlPdfService: HtmlPdfService,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Check if we have query parameters for a specific spec
    this.route.queryParams.subscribe(params => {
      if (params['specId']) {
        this.loadSpecData(params['specId']);
      } else {
        console.log('PDF Template Preview loaded with sample data:', this.sampleData);
      }
    });
  }

  private loadSpecData(specId: string): void {
    this.isLoadingSpec = true;
    this.apiService.getSpec(specId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentSpec = response.data;
          this.convertSpecToPdfData(response.data);
        } else {
          console.error('Failed to load spec:', response.error);
          // Fall back to sample data
          console.log('Falling back to sample data');
        }
        this.isLoadingSpec = false;
      },
      error: (error) => {
        console.error('Error loading spec:', error);
        this.isLoadingSpec = false;
        // Fall back to sample data
        console.log('Falling back to sample data due to error');
      }
    });
  }

  private convertSpecToPdfData(spec: ProtobufSpec): void {
    // Convert the protobuf spec to PDF data format
    const specData = spec.spec_data || {};
    
    // Extract message types from the spec data
    const messageTypes = [];
    if (specData.messages && Array.isArray(specData.messages)) {
      for (const message of specData.messages) {
        messageTypes.push({
          name: message.name || 'Unknown',
          json_schema: this.convertMessageToJsonSchema(message)
        });
      }
    }

    // Create PDF data from the spec
    this.sampleData = {
      specTitle: spec.title || 'Untitled Specification',
      specVersion: spec.version || '1.0.0',
      specDescription: spec.description || 'No description provided',
      deviceName: spec.title || 'Unknown Device',
      protocols: this.extractProtocols(specData),
      documentStatus: spec.is_published ? 'Published' : 'Draft',
      applicableTo: this.extractApplicableTo(specData),
      selectedEnvelope: {
        id: 'spec_envelope',
        title: `${spec.title} Message Envelope`
      },
      demoJsonText: JSON.stringify(this.generateSampleJson(specData), null, 2),
      messageTypes: messageTypes,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    console.log('Converted spec to PDF data:', this.sampleData);
  }

  private convertMessageToJsonSchema(message: any): any {
    const properties: any = {};
    
    if (message.fields && Array.isArray(message.fields)) {
      for (const field of message.fields) {
        const fieldType = this.mapProtobufTypeToJsonType(field.type);
        properties[field.name] = {
          type: fieldType.type,
          ...fieldType.additional
        };
      }
    }

    return { properties };
  }

  private mapProtobufTypeToJsonType(protobufType: string): { type: string; additional?: any } {
    const typeMap: { [key: string]: { type: string; additional?: any } } = {
      'string': { type: 'string' },
      'int32': { type: 'integer' },
      'int64': { type: 'integer' },
      'uint32': { type: 'integer', additional: { minimum: 0 } },
      'uint64': { type: 'integer', additional: { minimum: 0 } },
      'float': { type: 'number' },
      'double': { type: 'number' },
      'bool': { type: 'boolean' },
      'bytes': { type: 'string', additional: { format: 'byte' } }
    };

    return typeMap[protobufType] || { type: 'string' };
  }

  private extractProtocols(specData: any): string[] {
    // Try to extract protocols from spec data or return defaults
    if (specData.protocols && Array.isArray(specData.protocols)) {
      return specData.protocols;
    }
    return ['gRPC', 'HTTP/REST']; // Default protocols for protobuf specs
  }

  private extractApplicableTo(specData: any): string {
    // Try to extract applicable systems from spec data
    if (specData.applicableTo) {
      return specData.applicableTo;
    }
    if (specData.package) {
      return `Systems using ${specData.package} package`;
    }
    return 'Distributed Systems, Microservices, API Communication';
  }

  private generateSampleJson(specData: any): any {
    // Generate a sample JSON based on the first message in the spec
    if (specData.messages && specData.messages.length > 0) {
      const firstMessage = specData.messages[0];
      const sampleJson: any = {};
      
      if (firstMessage.fields && Array.isArray(firstMessage.fields)) {
        for (const field of firstMessage.fields) {
          sampleJson[field.name] = this.generateSampleValue(field.type);
        }
      }
      
      return sampleJson;
    }
    
    // Fallback sample
    return {
      "message_id": "sample_001",
      "timestamp": new Date().toISOString(),
      "data": "Sample data from specification"
    };
  }

  private generateSampleValue(fieldType: string): any {
    const sampleValues: { [key: string]: any } = {
      'string': 'sample_string',
      'int32': 42,
      'int64': 1234567890,
      'uint32': 100,
      'uint64': 9876543210,
      'float': 3.14,
      'double': 2.718281828,
      'bool': true,
      'bytes': 'c2FtcGxlX2J5dGVz' // base64 encoded "sample_bytes"
    };

    return sampleValues[fieldType] || 'unknown_type';
  }

  // Generate PDF from the preview using enhanced method
  async generatePdf(): Promise<void> {
    try {
      // Use the enhanced PDF generation method for better styling preservation
      await this.htmlPdfService.generatePdfWithBetterStyling(this.sampleData, 'sample-specification-enhanced.pdf');
      console.log('Enhanced PDF generated successfully!');
    } catch (error) {
      console.error('Error generating enhanced PDF:', error);
      alert('Error generating enhanced PDF. Try the original method or check console for details.');
    }
  }

  // Generate PDF using original method for comparison
  async generatePdfOriginal(): Promise<void> {
    try {
      await this.htmlPdfService.generatePdfFromHtml(this.sampleData, 'sample-specification-original.pdf');
      console.log('Original PDF generated successfully!');
    } catch (error) {
      console.error('Error generating original PDF:', error);
      alert('Error generating original PDF. Check console for details.');
    }
  }

  // Print the preview
  async printPreview(): Promise<void> {
    try {
      await this.htmlPdfService.printHtml(this.sampleData);
      console.log('Print dialog opened!');
    } catch (error) {
      console.error('Error opening print dialog:', error);
      alert('Error opening print dialog. Check console for details.');
    }
  }

  // Update sample data for testing
  updateSampleData(): void {
    this.sampleData = {
      ...this.sampleData,
      specTitle: 'Updated ' + this.sampleData.specTitle,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }
}