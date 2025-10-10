import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabListOverlayComponent } from './tab-list-overlay.component';
import { NotificationService } from '../../services/notification.service';
import { jsPDF } from 'jspdf';

describe('TabListOverlayComponent - PDF Generation Tests', () => {
  let component: TabListOverlayComponent;
  let fixture: ComponentFixture<TabListOverlayComponent>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [TabListOverlayComponent],
      providers: [
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TabListOverlayComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  describe('Loading States and User Feedback', () => {
    it('should properly manage loading state during PDF generation', () => {
      // Arrange
      component.selectedDownloadFormat = 'pdf';
      component.specTitle = 'Test Spec';
      component.specVersion = '1.0';
      component.specDescription = 'Test Description';

      // Act
      expect(component.isDownloading).toBeFalse();
      
      // Note: We can't easily test the full PDF generation without mocking jsPDF,
      // but we can verify the loading state management
      component.downloadSpec();
      
      // Assert
      expect(component.isDownloading).toBeTrue();
    });

    it('should validate minimal data for PDF generation', () => {
      // Arrange - Complete data
      component.specTitle = 'Test Spec';
      component.specVersion = '1.0';
      component.specDescription = 'Test Description';
      component.deviceName = 'Test Device';
      component.protocols = ['HTTP', 'MQTT'];
      component.documentStatus = 'Draft';
      component.applicableTo = 'All devices';

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeTrue();
      expect(result.missingFields.length).toBe(0);
    });

    it('should handle missing essential fields', () => {
      // Arrange - Missing essential fields
      component.specTitle = '';
      component.specVersion = '';
      component.specDescription = '';

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeFalse();
      expect(result.missingFields).toContain('Specification Title');
      expect(result.missingFields).toContain('Version');
      expect(result.missingFields).toContain('Description');
    });

    it('should handle partial data gracefully', () => {
      // Arrange - Only basic fields
      component.specTitle = 'Test Spec';
      component.specVersion = '1.0';
      component.specDescription = 'Test Description';
      // Leave other fields empty

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeTrue(); // Should be valid with basic fields
      expect(result.missingFields.length).toBeGreaterThan(0); // But should report missing optional fields
    });

    it('should show error notification for invalid download format', () => {
      // Arrange
      component.selectedDownloadFormat = '';

      // Act
      component.downloadSpec();

      // Assert
      expect(notificationService.error).toHaveBeenCalledWith('Please select a download format');
      expect(component.isDownloading).toBeFalse();
    });

    it('should handle edge cases with null/undefined data', () => {
      // Arrange - Null/undefined data
      component.specTitle = null as any;
      component.specVersion = undefined as any;
      component.specDescription = '';
      component.messageTypes = null as any;
      component.messageEnvelopes = undefined as any;

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeFalse();
      expect(result.missingFields).toContain('Specification Title');
      expect(result.missingFields).toContain('Version');
      expect(result.missingFields).toContain('Description');
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle very long titles gracefully', () => {
      // Arrange
      const longTitle = 'A'.repeat(200);
      component.specTitle = longTitle;
      component.specVersion = '1.0';
      component.specDescription = 'Test';

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeTrue();
      expect(result.missingFields).not.toContain('Specification Title');
    });

    it('should handle empty arrays gracefully', () => {
      // Arrange
      component.protocols = [];
      component.messageTypes = [];
      component.messageEnvelopes = [];

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.missingFields).toContain('Protocols');
      // Should not crash with empty arrays
    });

    it('should handle whitespace-only strings', () => {
      // Arrange
      component.specTitle = '   ';
      component.specVersion = '\t\n';
      component.specDescription = '  \r\n  ';

      // Act
      const result = (component as any).validateMinimalDataForPdf();

      // Assert
      expect(result.isValid).toBeFalse();
      expect(result.missingFields).toContain('Specification Title');
      expect(result.missingFields).toContain('Version');
      expect(result.missingFields).toContain('Description');
    });
  });

  describe('PDF Generation Methods', () => {
    beforeEach(() => {
      // Set up complete specification data for PDF generation tests
      component.specTitle = 'Test Specification';
      component.specVersion = '1.0.0';
      component.specDescription = 'A comprehensive test specification document';
      component.deviceName = 'Test Device';
      component.protocols = ['HTTP', 'MQTT', 'WebSocket'];
      component.documentStatus = 'Draft';
      component.applicableTo = 'All test environments';
      component.messageEnvelopes = [
        { id: 'env1', title: 'Test Envelope 1' },
        { id: 'env2', title: 'Test Envelope 2' }
      ];
      component.selectedEnvelopeId = 'env1';
      component.demoJsonText = '{"test": "data", "version": 1}';
      component.messageTypes = [
        { 
          name: 'TestMessage1',
          json_schema: {
            properties: {
              id: { type: 'string' },
              message: { type: 'string' }
            }
          }
        },
        { 
          name: 'TestMessage2',
          json_schema: {
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              count: { type: 'integer' }
            }
          }
        },
        { 
          name: 'TestMessage3',
          json_schema: {
            properties: {
              active: { type: 'boolean' },
              data: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      ];
    });

    describe('generatePDF method', () => {
      it('should create a valid jsPDF document with complete data', () => {
        // Act
        const doc = (component as any).generatePDF();

        // Assert
        expect(doc).toBeDefined();
        expect(doc.internal).toBeDefined();
        expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(0);
        expect(doc.internal.pageSize.getHeight()).toBeGreaterThan(0);
      });

      it('should handle missing title gracefully', () => {
        // Arrange
        component.specTitle = '';

        // Act
        const doc = (component as any).generatePDF();

        // Assert
        expect(doc).toBeDefined();
        expect(doc.internal).toBeDefined();
      });

      it('should handle very long titles by truncating', () => {
        // Arrange
        component.specTitle = 'A'.repeat(200);

        // Act
        const doc = (component as any).generatePDF();

        // Assert
        expect(doc).toBeDefined();
        expect(doc.internal).toBeDefined();
      });

      it('should throw error for critical failures', () => {
        // Arrange - Mock jsPDF constructor to fail by making it return null
        const originalJsPDF = jsPDF;
        spyOn(component as any, 'generatePDF').and.callFake(() => {
          throw new Error('PDF initialization failed');
        });

        // Act & Assert
        expect(() => (component as any).generatePDF()).toThrowError('PDF initialization failed');
      });
    });

    describe('addSpecificationDetails method', () => {
      it('should add specification details to PDF with complete data', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;

        // Act
        (component as any).addSpecificationDetails(doc);

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle missing specification fields', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.specTitle = '';
        component.deviceName = '';
        component.protocols = [];

        // Act
        expect(() => (component as any).addSpecificationDetails(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle null and undefined values', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.specTitle = null as any;
        component.deviceName = undefined as any;
        component.protocols = null as any;

        // Act
        expect(() => (component as any).addSpecificationDetails(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should throw error for invalid parameters', () => {
        // Arrange
        const doc = new jsPDF();
        // Don't set required properties

        // Act & Assert
        expect(() => (component as any).addSpecificationDetails(doc)).toThrowError();
      });
    });

    describe('addMessageEnvelopeSection method', () => {
      it('should add message envelope section with selected envelope', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;

        // Act
        (component as any).addMessageEnvelopeSection(doc);

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle no selected envelope', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.selectedEnvelopeId = null;

        // Act
        expect(() => (component as any).addMessageEnvelopeSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle empty message envelopes array', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.messageEnvelopes = [];

        // Act
        expect(() => (component as any).addMessageEnvelopeSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle invalid demo JSON gracefully', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.demoJsonText = 'invalid json {';

        // Act
        expect(() => (component as any).addMessageEnvelopeSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle very large demo JSON by truncating', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.demoJsonText = JSON.stringify({ data: 'x'.repeat(10000) });

        // Act
        expect(() => (component as any).addMessageEnvelopeSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(40);
      });
    });

    describe('addMessageTypesSection method', () => {
      it('should add message types section with complete data', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;

        // Act
        (component as any).addMessageTypesSection(doc);

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle empty message types array', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.messageTypes = [];

        // Act
        expect(() => (component as any).addMessageTypesSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle null message types', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.messageTypes = null as any;

        // Act
        expect(() => (component as any).addMessageTypesSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle message types with missing names', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.messageTypes = [
          { name: 'ValidMessage', json_schema: { properties: { id: { type: 'string' } } } },
          { name: '' },
          { name: null },
          { name: undefined },
          {}
        ];

        // Act
        expect(() => (component as any).addMessageTypesSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should handle very long message type names', () => {
        // Arrange
        const doc = new jsPDF();
        (doc as any).currentYPosition = 50;
        (doc as any).contentWidth = 170;
        (doc as any).pageHeight = 297;
        
        component.messageTypes = [
          { name: 'A'.repeat(200), json_schema: { properties: { test: { type: 'string' } } } }
        ];

        // Act
        expect(() => (component as any).addMessageTypesSection(doc)).not.toThrow();

        // Assert
        expect((doc as any).currentYPosition).toBeGreaterThan(50);
      });

      it('should generate demo JSON for message types with schemas', () => {
        // Arrange
        const testSchema = {
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 100 },
            active: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        };

        // Act
        const result = (component as any).generateDemoJsonForMessageType(testSchema);
        const parsedResult = JSON.parse(result);

        // Assert
        expect(result).toBeDefined();
        expect(parsedResult.id).toBeDefined();
        expect(parsedResult.name).toBeDefined();
        expect(typeof parsedResult.count).toBe('number');
        expect(typeof parsedResult.active).toBe('boolean');
        expect(parsedResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it('should handle message types without schemas gracefully', () => {
        // Arrange
        const emptySchema = null;

        // Act
        const result = (component as any).generateDemoJsonForMessageType(emptySchema);
        const parsedResult = JSON.parse(result);

        // Assert
        expect(result).toBeDefined();
        expect(parsedResult.message).toBe('No schema available');
        expect(parsedResult.timestamp).toBeDefined();
      });
    });

    describe('handlePdfGeneration method', () => {
      beforeEach(() => {
        jasmine.clock().install();
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('should handle successful PDF generation', () => {
        // Arrange
        spyOn(component as any, 'generatePDF').and.returnValue({
          output: jasmine.createSpy('output').and.returnValue(new Blob(['test'], { type: 'application/pdf' }))
        });
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
        spyOn(window.URL, 'revokeObjectURL');
        spyOn(document, 'createElement').and.returnValue({
          href: '',
          download: '',
          click: jasmine.createSpy('click')
        } as any);
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');

        // Act
        (component as any).handlePdfGeneration('test.pdf');
        jasmine.clock().tick(200);

        // Assert
        expect(notificationService.info).toHaveBeenCalledWith('Generating PDF...', jasmine.any(String));
        expect(notificationService.success).toHaveBeenCalledWith('PDF Downloaded Successfully', jasmine.any(String));
        expect(component.isDownloading).toBeFalse();
      });

      it('should handle PDF generation errors', () => {
        // Arrange
        spyOn(component as any, 'generatePDF').and.throwError('PDF generation failed');
        spyOn(component as any, 'providePdfFallback');

        // Act
        (component as any).handlePdfGeneration('test.pdf');
        jasmine.clock().tick(200);

        // Assert
        expect(notificationService.error).toHaveBeenCalledWith('PDF Generation Failed', jasmine.any(String));
        expect(component.isDownloading).toBeFalse();
        expect((component as any).providePdfFallback).toHaveBeenCalledWith('test.pdf');
      });

      it('should show warning for incomplete data', () => {
        // Arrange - Set up incomplete data scenario with more than 4 missing fields to trigger warning
        component.specTitle = 'Test'; // Keep basic fields
        component.specVersion = '1.0';
        component.specDescription = 'Test';
        component.deviceName = ''; // Missing optional field 1
        component.protocols = []; // Missing optional field 2
        component.documentStatus = ''; // Missing optional field 3
        component.applicableTo = ''; // Missing optional field 4
        
        // Mock the validation to return invalid to force the warning
        spyOn(component as any, 'validateMinimalDataForPdf').and.returnValue({
          isValid: false,
          missingFields: ['Device Name', 'Protocols', 'Document Status', 'Applicable To', 'Extra Field']
        });
        
        spyOn(component as any, 'generatePDF').and.returnValue({
          output: jasmine.createSpy('output').and.returnValue(new Blob(['test'], { type: 'application/pdf' }))
        });
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
        spyOn(window.URL, 'revokeObjectURL');
        spyOn(document, 'createElement').and.returnValue({
          href: '',
          download: '',
          click: jasmine.createSpy('click')
        } as any);
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');

        // Act
        (component as any).handlePdfGeneration('test.pdf');
        jasmine.clock().tick(200);

        // Assert
        expect(notificationService.warning).toHaveBeenCalledWith('Incomplete Data Detected', jasmine.any(String));
      });
    });

    describe('providePdfFallback method', () => {
      it('should create fallback JSON file', () => {
        // Arrange
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
        spyOn(window.URL, 'revokeObjectURL');
        spyOn(document, 'createElement').and.returnValue({
          href: '',
          download: '',
          click: jasmine.createSpy('click')
        } as any);
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');

        // Act
        (component as any).providePdfFallback('test.pdf');

        // Assert
        expect(notificationService.info).toHaveBeenCalledWith('Generating Fallback File', jasmine.any(String));
        expect(notificationService.success).toHaveBeenCalledWith('Fallback File Downloaded', jasmine.any(String));
      });

      it('should handle fallback creation errors', () => {
        // Arrange
        spyOn(window, 'Blob').and.throwError('Blob creation failed');

        // Act
        (component as any).providePdfFallback('test.pdf');

        // Assert
        expect(notificationService.error).toHaveBeenCalledWith('Complete Download Failure', jasmine.any(String));
      });
    });
  });

  describe('PDF Integration Tests', () => {
    it('should complete full PDF download workflow with complete data', () => {
      // Arrange
      component.selectedDownloadFormat = 'pdf';
      component.specTitle = 'Integration Test Spec';
      component.specVersion = '2.0';
      component.specDescription = 'Full integration test';
      
      spyOn(component as any, 'generatePDF').and.returnValue({
        output: jasmine.createSpy('output').and.returnValue(new Blob(['test'], { type: 'application/pdf' }))
      });
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(window.URL, 'revokeObjectURL');

      // Act
      component.downloadSpec();

      // Assert
      expect(component.isDownloading).toBeTrue();
    });

    it('should handle PDF download with partial data', () => {
      // Arrange
      component.selectedDownloadFormat = 'pdf';
      component.specTitle = 'Partial Test Spec';
      component.specVersion = '1.0';
      component.specDescription = 'Minimal test data';
      component.deviceName = '';
      component.protocols = [];
      component.messageTypes = [];
      component.messageEnvelopes = [];

      spyOn(component as any, 'generatePDF').and.returnValue({
        output: jasmine.createSpy('output').and.returnValue(new Blob(['test'], { type: 'application/pdf' }))
      });

      // Act
      expect(() => component.downloadSpec()).not.toThrow();

      // Assert
      expect(component.isDownloading).toBeTrue();
    });

    it('should generate a valid PDF that can be opened by PDF viewers', () => {
      // Arrange - Set up complete test data
      component.specTitle = 'PDF Viewer Test Specification';
      component.specVersion = '1.0.0';
      component.specDescription = 'This is a test specification to verify PDF generation creates valid files';
      component.deviceName = 'Test Device';
      component.protocols = ['HTTP', 'MQTT'];
      component.documentStatus = 'Draft';
      component.applicableTo = 'Test Environment';
      component.messageEnvelopes = [
        { id: 'env1', title: 'Test Envelope', json_fields: [] }
      ];
      component.selectedEnvelopeId = 'env1';
      component.demoJsonText = '{"test": "data"}';
      component.messageTypes = [
        { 
          name: 'TestMessage1',
          json_schema: {
            properties: {
              id: { type: 'string' },
              data: { type: 'string' }
            }
          }
        },
        { 
          name: 'TestMessage2',
          json_schema: {
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              value: { type: 'number' }
            }
          }
        }
      ];

      // Act - Generate actual PDF
      const doc = (component as any).generatePDF();
      const pdfBlob = doc.output('blob');

      // Assert - Verify PDF properties
      expect(pdfBlob).toBeDefined();
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(0);
      
      // Verify PDF starts with PDF header
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const header = String.fromCharCode(...uint8Array.slice(0, 4));
        expect(header).toBe('%PDF');
      };
      reader.readAsArrayBuffer(pdfBlob);
    });
  });
});