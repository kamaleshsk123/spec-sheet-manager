
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { HtmlPdfService } from '../../services/html-pdf.service';
import { PdfData } from '../pdf-template/pdf-template.component';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-tab-list-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-list-overlay.component.html',
  styleUrls: ['./tab-list-overlay.component.css']
})
export class TabListOverlayComponent implements OnInit {
  @Input() tabs: { name: string, content: string }[] = [];
  @Input() specTitle: string = '';
  @Input() specVersion: string = '';
  @Input() specDescription: string = '';
  @Input() deviceName: string | undefined = '';
  @Input() protocols: string[] | undefined = [];
  @Input() documentStatus: string | undefined = '';
  @Input() applicableTo: string | undefined = '';
  @Input() messageEnvelopes: any[] = [];
  @Input() selectedEnvelopeId: string | null = null;
  @Input() demoJsonText: string = '';
  @Input() messageTypes: any[] = [];
  @Input() combinedPayloadText: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() envelopeSelected = new EventEmitter<string>();
  @Output() messageTypeSelected = new EventEmitter<any>();

  selectedTabIndex: number | null = 0;
  selectedMessageTypeIndex: number | null = null;
  isExpanded: boolean = true;
  isCopied: string | null = null;
  searchTerm: string = '';
  filteredMessageTypes: any[] = [];
  currentStep: number = 1;

  selectedDownloadFormat: string = 'pdf';
  isDownloading: boolean = false;

  // PDF configuration constants for formatting
  private readonly PDF_CONFIG = {
    pageSize: 'a4' as const,
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    fonts: {
      header: { size: 16, style: 'bold' },
      subheader: { size: 14, style: 'bold' },
      body: { size: 10, style: 'normal' }
    },
    colors: {
      header: '#333333',
      text: '#000000',
      border: '#cccccc'
    }
  };

  constructor(
    private notificationService: NotificationService,
    private htmlPdfService: HtmlPdfService
  ) {}

  ngOnInit(): void {
    this.filterMessageTypes();
    if (this.isExpanded) {
      this.selectedTabIndex = null; // Open all tabs
      if (this.messageEnvelopes.length > 0) {
        this.selectEnvelope(this.messageEnvelopes[0].id);
      }
    }
  }

  downloadSpec() {
    // Ensure loading state is properly managed during PDF generation
    this.isDownloading = true;
    
    // Validate basic requirements before proceeding
    if (!this.selectedDownloadFormat) {
      this.notificationService.error('Please select a download format');
      this.isDownloading = false;
      return;
    }
    
    let fileContent: string = '';
    let fileType: string = '';
    let fileName: string = `${this.specTitle || 'specification'}.${this.selectedDownloadFormat}`;

    console.log('📥 Download format selected:', this.selectedDownloadFormat);
    
    switch (this.selectedDownloadFormat) {
      case 'pdf':
        console.log('🎯 PDF format selected - calling handleHtmlPdfGeneration');
        // Use HTML-based PDF generation for better styling and easier customization
        this.handleHtmlPdfGeneration(fileName);
        return; // Exit early for PDF to avoid the generic download logic below
      case 'pdf-legacy':
        // Use legacy jsPDF generation method
        this.handlePdfGeneration(fileName);
        return; // Exit early for PDF to avoid the generic download logic below
      case 'json':
        try {
          const jsonContent = {
            specTitle: this.specTitle || 'N/A',
            specVersion: this.specVersion || 'N/A',
            specDescription: this.specDescription || 'N/A',
            deviceName: this.deviceName || 'N/A',
            protocols: this.protocols || [],
            documentStatus: this.documentStatus || 'N/A',
            applicableTo: this.applicableTo || 'N/A',
            selectedEnvelopeId: this.selectedEnvelopeId || null,
            messageTypes: this.messageTypes?.map((mt: any) => mt?.name || 'Unknown') || []
          };
          fileContent = JSON.stringify(jsonContent, null, 2);
          fileType = 'application/json';
        } catch (jsonError) {
          console.error('JSON generation error:', jsonError);
          this.notificationService.error('Failed to generate JSON file. Please try again.');
          this.isDownloading = false;
          return;
        }
        break;
      case 'yaml':
        try {
          // Manually constructing simple YAML. For complex objects, a YAML serialization library is recommended.
          let yamlContent = `specTitle: ${this.specTitle || 'N/A'}\n`;
          yamlContent += `specVersion: ${this.specVersion || 'N/A'}\n`;
          yamlContent += `specDescription: ${this.specDescription || 'N/A'}\n`;
          yamlContent += `deviceName: ${this.deviceName || 'N/A'}\n`;
          yamlContent += `protocols: [${this.protocols?.join(', ') || ''}]\n`;
          yamlContent += `documentStatus: ${this.documentStatus || 'N/A'}\n`;
          yamlContent += `applicableTo: ${this.applicableTo || 'N/A'}\n`;
          yamlContent += `selectedEnvelopeId: ${this.selectedEnvelopeId || 'null'}\n`;
          yamlContent += `messageTypes:\n`;
          if (this.messageTypes && this.messageTypes.length > 0) {
            this.messageTypes.forEach((mt: any) => {
              yamlContent += `  - ${mt?.name || 'Unknown'}\n`;
            });
          } else {
            yamlContent += `  []\n`;
          }
          fileContent = yamlContent;
          fileType = 'application/x-yaml';
        } catch (yamlError) {
          console.error('YAML generation error:', yamlError);
          this.notificationService.error('Failed to generate YAML file. Please try again.');
          this.isDownloading = false;
          return;
        }
        break;
      default:
        this.notificationService.error('Unsupported download format.');
        this.isDownloading = false;
        return;
    }

    // Simulate API call and download
    setTimeout(() => {
      try {
        const blob = new Blob([fileContent], { type: fileType });
        
        // Validate that the blob was created successfully
        if (!blob || blob.size === 0) {
          throw new Error('Generated file blob is empty or invalid');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.notificationService.success(`Downloaded ${fileName}`);
        this.isDownloading = false;
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        this.notificationService.error('Failed to download file. Please try again.');
        this.isDownloading = false;
      }
    }, 2000);
  }
  filterMessageTypes() {
    if (!this.searchTerm) {
      this.filteredMessageTypes = this.messageTypes;
    } else {
      this.filteredMessageTypes = this.messageTypes.filter(messageType =>
        messageType.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  closeOverlay() {
    this.close.emit();
  }

  toggleTab(index: number) {
    if (this.isExpanded) {
      return; // Keep all tabs open
    }
    if (this.selectedTabIndex === index) {
      this.selectedTabIndex = null;
    } else {
      this.selectedTabIndex = index;
    }
  }

  selectEnvelope(envelopeId: string) {
    this.envelopeSelected.emit(envelopeId);
    this.selectedMessageTypeIndex = null;
  }

  toggleMessageType(index: number, messageType: any) {
    if (this.selectedMessageTypeIndex === index) {
      this.selectedMessageTypeIndex = null;
      this.messageTypeSelected.emit(null);
    } else {
      this.selectedMessageTypeIndex = index;
      this.messageTypeSelected.emit(messageType);
    }
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.selectedTabIndex = null; // Open all tabs
      if (this.messageEnvelopes.length > 0) {
        this.selectEnvelope(this.messageEnvelopes[0].id);
      }
    }
  }

  copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.isCopied = type;
      this.notificationService.success('Copied to clipboard');
      setTimeout(() => {
        this.isCopied = null;
      }, 2000);
    });
  }

  changeStep(step: number) {
    this.currentStep = step;
  }

  // Core PDF generation functionality
  private generatePDF(): jsPDF {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: this.PDF_CONFIG.pageSize
      });
      
      // Validate jsPDF instance was created successfully
      if (!doc) {
        throw new Error('Failed to initialize jsPDF document');
      }
      
      // Set up document margins and page structure
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - this.PDF_CONFIG.margins.left - this.PDF_CONFIG.margins.right;
      
      // Validate page dimensions
      if (pageWidth <= 0 || pageHeight <= 0 || contentWidth <= 0) {
        throw new Error('Invalid page dimensions calculated');
      }
      
      // Add document title and header formatting
      let yPosition = this.PDF_CONFIG.margins.top;
      
      try {
        // Main document title - handle edge cases with missing or incomplete data
        doc.setFontSize(this.PDF_CONFIG.fonts.header.size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.PDF_CONFIG.colors.header);
        
        // Provide fallback title if missing
        let title = this.specTitle?.trim() || 'Specification Document';
        if (title.length > 100) {
          title = title.substring(0, 97) + '...'; // Truncate very long titles
        }
        
        const titleLines = doc.splitTextToSize(title, contentWidth);
        doc.text(titleLines, this.PDF_CONFIG.margins.left, yPosition);
        yPosition += titleLines.length * 8 + 10;
        
        // Document metadata header
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.PDF_CONFIG.colors.text);
        
        const currentDate = new Date().toLocaleDateString();
        const version = this.specVersion?.trim() || 'N/A';
        const headerInfo = `Generated on: ${currentDate} | Version: ${version}`;
        doc.text(headerInfo, this.PDF_CONFIG.margins.left, yPosition);
        yPosition += 15;
        
        // Add a separator line
        doc.setDrawColor(this.PDF_CONFIG.colors.border);
        doc.setLineWidth(0.5);
        doc.line(this.PDF_CONFIG.margins.left, yPosition, pageWidth - this.PDF_CONFIG.margins.right, yPosition);
        yPosition += 10;
      } catch (headerError) {
        console.warn('Error generating PDF header, using minimal header:', headerError);
        // Fallback to minimal header - handle edge cases gracefully
        try {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor('#000000');
          const fallbackTitle = this.specTitle?.trim() || 'Specification Document';
          doc.text(fallbackTitle.substring(0, 50), this.PDF_CONFIG.margins.left, yPosition);
          yPosition += 20;
        } catch (fallbackError) {
          console.warn('Even fallback header failed, using absolute minimal header:', fallbackError);
          // Absolute minimal fallback
          yPosition += 20;
        }
      }
      
      // Store current position for content sections
      (doc as any).currentYPosition = yPosition;
      (doc as any).contentWidth = contentWidth;
      (doc as any).pageHeight = pageHeight;
      
      // Add specification details section with error handling
      try {
        this.addSpecificationDetails(doc);
      } catch (specError) {
        console.warn('Error adding specification details to PDF:', specError);
        // Continue with other sections even if this fails
      }
      
      // Add message envelope section with error handling
      try {
        this.addMessageEnvelopeSection(doc);
      } catch (envelopeError) {
        console.warn('Error adding message envelope section to PDF:', envelopeError);
        // Continue with other sections even if this fails
      }
      
      // Add message types section with error handling
      try {
        this.addMessageTypesSection(doc);
      } catch (typesError) {
        console.warn('Error adding message types section to PDF:', typesError);
        // Continue even if this fails
      }
      
      return doc;
    } catch (error) {
      console.error('Critical error in PDF generation:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addSpecificationDetails(doc: jsPDF): void {
    try {
      const docAny = doc as any;
      let yPosition = docAny.currentYPosition;
      const contentWidth = docAny.contentWidth;
      const pageHeight = docAny.pageHeight;
      const leftMargin = this.PDF_CONFIG.margins.left;
      
      // Validate required parameters
      if (!doc || !yPosition || !contentWidth || !pageHeight) {
        throw new Error('Invalid parameters for specification details section');
      }
    
    // Section header
    doc.setFontSize(this.PDF_CONFIG.fonts.subheader.size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.PDF_CONFIG.colors.header);
    doc.text('Specification Details', leftMargin, yPosition);
    yPosition += 12;
    
    // Reset font for content
    doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PDF_CONFIG.colors.text);
    
    // Define table structure - handle edge cases with missing or incomplete data
    const tableData = [
      { 
        label: 'Title:', 
        value: this.specTitle?.trim() || 'Not specified' 
      },
      { 
        label: 'Version:', 
        value: this.specVersion?.trim() || 'Not specified' 
      },
      { 
        label: 'Description:', 
        value: this.specDescription?.trim() || 'No description provided' 
      },
      { 
        label: 'Device Name:', 
        value: this.deviceName?.trim() || 'Not specified' 
      },
      { 
        label: 'Protocols:', 
        value: this.protocols && this.protocols.length > 0 
          ? this.protocols.filter(p => p && p.trim()).join(', ') || 'None specified'
          : 'None specified' 
      },
      { 
        label: 'Document Status:', 
        value: this.documentStatus?.trim() || 'Not specified' 
      },
      { 
        label: 'Applicable To:', 
        value: this.applicableTo?.trim() || 'Not specified' 
      }
    ];
    
    // Table formatting constants
    const labelWidth = 40;
    const valueWidth = contentWidth - labelWidth - 5;
    const rowHeight = 6;
    const cellPadding = 2;
    
    // Draw table
    tableData.forEach((row, index) => {
      // Check if we need a new page
      if (yPosition + rowHeight + 10 > pageHeight - this.PDF_CONFIG.margins.bottom) {
        doc.addPage();
        yPosition = this.PDF_CONFIG.margins.top;
      }
      
      // Draw row background (alternating colors for better readability)
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(leftMargin, yPosition - rowHeight + 1, contentWidth, rowHeight, 'F');
      }
      
      // Draw borders
      doc.setDrawColor(this.PDF_CONFIG.colors.border);
      doc.setLineWidth(0.1);
      
      // Label cell border
      doc.rect(leftMargin, yPosition - rowHeight + 1, labelWidth, rowHeight);
      
      // Value cell border
      doc.rect(leftMargin + labelWidth, yPosition - rowHeight + 1, valueWidth, rowHeight);
      
      // Add label text (bold)
      doc.setFont('helvetica', 'bold');
      doc.text(row.label, leftMargin + cellPadding, yPosition - 1);
      
      // Add value text (normal)
      doc.setFont('helvetica', 'normal');
      
      // Handle long text by wrapping
      const valueLines = doc.splitTextToSize(row.value, valueWidth - cellPadding * 2);
      
      // If text is too long for single row, adjust row height
      if (valueLines.length > 1) {
        const extraHeight = (valueLines.length - 1) * 4;
        
        // Redraw cells with proper height
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(leftMargin, yPosition - rowHeight + 1, contentWidth, rowHeight + extraHeight, 'F');
        }
        
        // Redraw borders with new height
        doc.rect(leftMargin, yPosition - rowHeight + 1, labelWidth, rowHeight + extraHeight);
        doc.rect(leftMargin + labelWidth, yPosition - rowHeight + 1, valueWidth, rowHeight + extraHeight);
        
        // Redraw label
        doc.setFont('helvetica', 'bold');
        doc.text(row.label, leftMargin + cellPadding, yPosition - 1);
        doc.setFont('helvetica', 'normal');
        
        // Add multiline value text
        valueLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, leftMargin + labelWidth + cellPadding, yPosition - 1 + (lineIndex * 4));
        });
        
        yPosition += extraHeight;
      } else {
        // Single line value
        doc.text(valueLines[0] || '', leftMargin + labelWidth + cellPadding, yPosition - 1);
      }
      
      yPosition += rowHeight;
    });
    
      // Add some spacing after the table
      yPosition += 10;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
    } catch (error) {
      console.error('Error in addSpecificationDetails:', error);
      // Re-throw to be handled by calling method
      throw new Error(`Failed to add specification details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addMessageEnvelopeSection(doc: jsPDF): void {
    try {
      const docAny = doc as any;
      let yPosition = docAny.currentYPosition;
      const contentWidth = docAny.contentWidth;
      const pageHeight = docAny.pageHeight;
      const leftMargin = this.PDF_CONFIG.margins.left;
      
      // Validate required parameters
      if (!doc || !yPosition || !contentWidth || !pageHeight) {
        throw new Error('Invalid parameters for message envelope section');
      }
    
    // Check if we need a new page
    if (yPosition + 30 > pageHeight - this.PDF_CONFIG.margins.bottom) {
      doc.addPage();
      yPosition = this.PDF_CONFIG.margins.top;
    }
    
    // Section header
    doc.setFontSize(this.PDF_CONFIG.fonts.subheader.size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.PDF_CONFIG.colors.header);
    doc.text('Message Envelope', leftMargin, yPosition);
    yPosition += 12;
    
    // Reset font for content
    doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PDF_CONFIG.colors.text);
    
    // Handle cases where no envelope is selected - improved edge case handling
    if (!this.selectedEnvelopeId || !this.messageEnvelopes || this.messageEnvelopes.length === 0) {
      let noEnvelopeText = 'No message envelopes available.';
      
      if (this.messageEnvelopes && this.messageEnvelopes.length > 0) {
        noEnvelopeText = 'No message envelope selected.';
      } else if (!this.messageEnvelopes) {
        noEnvelopeText = 'Message envelope data not loaded.';
      }
      
      doc.setFont('helvetica', 'italic');
      doc.setTextColor('#666666');
      doc.text(noEnvelopeText, leftMargin, yPosition);
      yPosition += 15;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
      return;
    }
    
    // Find the selected envelope
    const selectedEnvelope = this.messageEnvelopes.find(envelope => envelope.id === this.selectedEnvelopeId);
    
    if (!selectedEnvelope) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor('#666666');
      doc.text('Selected envelope not found.', leftMargin, yPosition);
      yPosition += 15;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
      return;
    }
    
    // Add selected envelope information when available - handle incomplete data
    const envelopeData = [
      { 
        label: 'Title:', 
        value: selectedEnvelope.title?.trim() || 'Untitled envelope' 
      }
    ];
    
    // Table formatting constants
    const labelWidth = 40;
    const valueWidth = contentWidth - labelWidth - 5;
    const rowHeight = 6;
    const cellPadding = 2;
    
    // Draw envelope details table
    envelopeData.forEach((row, index) => {
      // Check if we need a new page
      if (yPosition + rowHeight + 10 > pageHeight - this.PDF_CONFIG.margins.bottom) {
        doc.addPage();
        yPosition = this.PDF_CONFIG.margins.top;
      }
      
      // Draw row background (alternating colors for better readability)
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(leftMargin, yPosition - rowHeight + 1, contentWidth, rowHeight, 'F');
      }
      
      // Draw borders
      doc.setDrawColor(this.PDF_CONFIG.colors.border);
      doc.setLineWidth(0.1);
      
      // Label cell border
      doc.rect(leftMargin, yPosition - rowHeight + 1, labelWidth, rowHeight);
      
      // Value cell border
      doc.rect(leftMargin + labelWidth, yPosition - rowHeight + 1, valueWidth, rowHeight);
      
      // Add label text (bold)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.PDF_CONFIG.colors.text);
      doc.text(row.label, leftMargin + cellPadding, yPosition - 1);
      
      // Add value text (normal)
      doc.setFont('helvetica', 'normal');
      
      // Handle long text by wrapping
      const valueLines = doc.splitTextToSize(row.value, valueWidth - cellPadding * 2);
      
      // If text is too long for single row, adjust row height
      if (valueLines.length > 1) {
        const extraHeight = (valueLines.length - 1) * 4;
        
        // Redraw cells with proper height
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(leftMargin, yPosition - rowHeight + 1, contentWidth, rowHeight + extraHeight, 'F');
        }
        
        // Redraw borders with new height
        doc.rect(leftMargin, yPosition - rowHeight + 1, labelWidth, rowHeight + extraHeight);
        doc.rect(leftMargin + labelWidth, yPosition - rowHeight + 1, valueWidth, rowHeight + extraHeight);
        
        // Redraw label
        doc.setFont('helvetica', 'bold');
        doc.text(row.label, leftMargin + cellPadding, yPosition - 1);
        doc.setFont('helvetica', 'normal');
        
        // Add multiline value text
        valueLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, leftMargin + labelWidth + cellPadding, yPosition - 1 + (lineIndex * 4));
        });
        
        yPosition += extraHeight;
      } else {
        // Single line value
        doc.text(valueLines[0] || '', leftMargin + labelWidth + cellPadding, yPosition - 1);
      }
      
      yPosition += rowHeight;
    });
    
    // Add Demo JSON section if available - handle edge cases with missing or incomplete data
    const demoJson = this.demoJsonText?.trim();
    if (demoJson) {
      yPosition += 8;
      
      // Check if we need a new page for the demo JSON section
      if (yPosition + 20 > pageHeight - this.PDF_CONFIG.margins.bottom) {
        doc.addPage();
        yPosition = this.PDF_CONFIG.margins.top;
      }
      
      try {
        // Demo JSON header
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.PDF_CONFIG.colors.header);
        doc.text('Demo JSON:', leftMargin, yPosition);
        yPosition += 8;
        
        // Demo JSON content
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(this.PDF_CONFIG.colors.text);
        
        // Validate and format JSON if possible
        let jsonContent = demoJson;
        try {
          // Try to parse and re-stringify for better formatting
          const parsed = JSON.parse(demoJson);
          jsonContent = JSON.stringify(parsed, null, 2);
        } catch (jsonError) {
          // If parsing fails, use original content
          console.warn('Demo JSON is not valid JSON, using as-is:', jsonError);
        }
        
        // Truncate very long JSON content to prevent PDF issues
        if (jsonContent.length > 5000) {
          jsonContent = jsonContent.substring(0, 4950) + '\n... (content truncated)';
        }
        
        // Split the JSON text into lines that fit the page width
        const jsonLines = doc.splitTextToSize(jsonContent, contentWidth);
        
        // Add each line, checking for page breaks
        jsonLines.forEach((line: string) => {
          if (yPosition + 4 > pageHeight - this.PDF_CONFIG.margins.bottom) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margins.top;
          }
          doc.text(line, leftMargin, yPosition);
          yPosition += 4;
        });
        
        // Reset font size back to normal
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
      } catch (jsonSectionError) {
        console.warn('Error adding demo JSON section, skipping:', jsonSectionError);
        // Add a note that JSON section failed
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
        doc.setTextColor('#666666');
        doc.text('Demo JSON section could not be rendered.', leftMargin, yPosition);
        yPosition += 10;
      }
    } else {
      // Add note when no demo JSON is available
      yPosition += 8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
      doc.setTextColor('#666666');
      doc.text('No demo JSON available for this envelope.', leftMargin, yPosition);
      yPosition += 10;
    }
      
      // Add some spacing after the section
      yPosition += 10;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
    } catch (error) {
      console.error('Error in addMessageEnvelopeSection:', error);
      // Re-throw to be handled by calling method
      throw new Error(`Failed to add message envelope section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addMessageTypesSection(doc: jsPDF): void {
    try {
      const docAny = doc as any;
      let yPosition = docAny.currentYPosition;
      const contentWidth = docAny.contentWidth;
      const pageHeight = docAny.pageHeight;
      const leftMargin = this.PDF_CONFIG.margins.left;
      
      // Validate required parameters
      if (!doc || !yPosition || !contentWidth || !pageHeight) {
        throw new Error('Invalid parameters for message types section');
      }
    
    // Check if we need a new page
    if (yPosition + 30 > pageHeight - this.PDF_CONFIG.margins.bottom) {
      doc.addPage();
      yPosition = this.PDF_CONFIG.margins.top;
    }
    
    // Section header
    doc.setFontSize(this.PDF_CONFIG.fonts.subheader.size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.PDF_CONFIG.colors.header);
    doc.text('Message Types', leftMargin, yPosition);
    yPosition += 12;
    
    // Reset font for content
    doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PDF_CONFIG.colors.text);
    
    // Handle empty message types array gracefully - improved edge case handling
    if (!this.messageTypes || this.messageTypes.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor('#666666');
      
      let noTypesText = 'No message types available.';
      if (!this.messageTypes) {
        noTypesText = 'Message types data not loaded.';
      }
      
      doc.text(noTypesText, leftMargin, yPosition);
      yPosition += 15;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
      return;
    }
    
    // Format message types in a numbered structure with demo JSON
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PDF_CONFIG.colors.text);
    
    // Add introductory text
    const introText = `Total message types: ${this.messageTypes.length}`;
    doc.text(introText, leftMargin, yPosition);
    yPosition += 15;
    
    // List formatting constants
    const indentWidth = 15;
    const lineHeight = 6;
    const jsonIndentWidth = 20;
    
    // Add each message type as a numbered list item with demo JSON
    this.messageTypes.forEach((messageType: any, index: number) => {
      // Check if we need a new page for the message type header
      if (yPosition + 30 > pageHeight - this.PDF_CONFIG.margins.bottom) {
        doc.addPage();
        yPosition = this.PDF_CONFIG.margins.top;
        
        // Re-add section header on new page
        doc.setFontSize(this.PDF_CONFIG.fonts.subheader.size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.PDF_CONFIG.colors.header);
        doc.text('Message Types (continued)', leftMargin, yPosition);
        yPosition += 15;
        
        // Reset font for content
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.PDF_CONFIG.colors.text);
      }
      
      // Add numbered message type (3.1, 3.2, etc.)
      const messageNumber = `3.${index + 1}`;
      doc.setFont('helvetica', 'bold');
      doc.text(messageNumber, leftMargin, yPosition);
      
      // Add message type name with proper handling of missing or undefined names
      let messageTypeName = messageType?.name?.trim() || `Message Type ${index + 1}`;
      
      // Handle very long message type names
      if (messageTypeName.length > 80) {
        messageTypeName = messageTypeName.substring(0, 77) + '...';
      }
      
      // Add the message type name next to the number
      doc.setFont('helvetica', 'normal');
      doc.text(messageTypeName, leftMargin + indentWidth, yPosition);
      yPosition += lineHeight + 3;
      
      // Generate and add demo JSON for this message type
      try {
        let demoJson = '';
        if (messageType?.json_schema) {
          demoJson = this.generateDemoJsonForMessageType(messageType.json_schema);
        } else {
          // Fallback demo JSON if no schema available
          demoJson = JSON.stringify({
            "id": `${messageType?.name?.toLowerCase().replace(/\s+/g, '_') || 'message'}_${Math.floor(Math.random() * 1000)}`,
            "timestamp": new Date().toISOString(),
            "data": "Sample data for " + (messageType?.name || 'Unknown Message Type')
          }, null, 2);
        }
        
        // Add Demo JSON header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Demo JSON:', leftMargin + jsonIndentWidth, yPosition);
        yPosition += 6;
        
        // Add Demo JSON content
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#333333');
        
        // Truncate very long JSON content
        if (demoJson.length > 2000) {
          demoJson = demoJson.substring(0, 1950) + '\n... (content truncated)';
        }
        
        // Split the JSON text into lines that fit the page width
        const jsonLines = doc.splitTextToSize(demoJson, contentWidth - jsonIndentWidth);
        
        // Add each line, checking for page breaks
        jsonLines.forEach((line: string) => {
          if (yPosition + 4 > pageHeight - this.PDF_CONFIG.margins.bottom) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margins.top;
          }
          doc.text(line, leftMargin + jsonIndentWidth, yPosition);
          yPosition += 3.5;
        });
        
        // Reset font and color for next message type
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.PDF_CONFIG.colors.text);
        
      } catch (jsonError) {
        console.warn('Error generating demo JSON for message type, skipping:', jsonError);
        // Add a note that JSON generation failed
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor('#666666');
        doc.text('Demo JSON could not be generated for this message type.', leftMargin + jsonIndentWidth, yPosition);
        yPosition += 8;
        
        // Reset font and color
        doc.setFontSize(this.PDF_CONFIG.fonts.body.size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.PDF_CONFIG.colors.text);
      }
      
      // Add spacing between message types
      yPosition += 10;
    });
    
      // Add some spacing after the section
      yPosition += 10;
      
      // Update the document's current position
      docAny.currentYPosition = yPosition;
    } catch (error) {
      console.error('Error in addMessageTypesSection:', error);
      // Re-throw to be handled by calling method
      throw new Error(`Failed to add message types section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate demo JSON for a specific message type based on its schema
  private generateDemoJsonForMessageType(schema: any): string {
    try {
      if (!schema || !schema.properties) {
        return JSON.stringify({
          "message": "No schema available",
          "timestamp": new Date().toISOString()
        }, null, 2);
      }

      const demo: any = {};
      const props = schema.properties || {};
      
      Object.keys(props).forEach((key) => {
        const property = props[key];
        demo[key] = this.generateMockValueForProperty(property, key);
      });

      return JSON.stringify(demo, null, 2);
    } catch (error) {
      console.warn('Error generating demo JSON for message type:', error);
      return JSON.stringify({
        "error": "Could not generate demo JSON",
        "timestamp": new Date().toISOString()
      }, null, 2);
    }
  }

  // Generate mock values for JSON schema properties
  private generateMockValueForProperty(property: any, key: string): any {
    const type = property.type || 'string';
    
    switch (type) {
      case 'string':
        if (property.format === 'date-time') {
          return new Date().toISOString();
        }
        if (property.enum && property.enum.length > 0) {
          return property.enum[Math.floor(Math.random() * property.enum.length)];
        }
        if (key.toLowerCase().includes('id')) {
          return `${key}_${Math.floor(Math.random() * 10000)}`;
        }
        if (key.toLowerCase().includes('name')) {
          return `Sample ${key}`;
        }
        return `Sample ${key} value`;
        
      case 'number':
      case 'integer':
        const min = property.minimum || 0;
        const max = property.maximum || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
        
      case 'boolean':
        return Math.random() < 0.5;
        
      case 'array':
        const itemType = property.items?.type || 'string';
        const arrayLength = Math.floor(Math.random() * 3) + 1; // 1-3 items
        const items = [];
        for (let i = 0; i < arrayLength; i++) {
          if (property.items && property.items.type === 'object') {
            items.push(this.generateMockValueForProperty(property.items, key));
          } else {
            items.push(this.generateMockValueForProperty({ type: itemType }, `${key}_item`));
          }
        }
        return items;
        
      case 'object':
        const nestedDemo: any = {};
        if (property.properties) {
          Object.keys(property.properties).forEach((nestedKey) => {
            nestedDemo[nestedKey] = this.generateMockValueForProperty(property.properties[nestedKey], nestedKey);
          });
        }
        return nestedDemo;
        
      default:
        return `Sample ${key}`;
    }
  }



  // Handle HTML-based PDF generation (new method)
  private async handleHtmlPdfGeneration(fileName: string): Promise<void> {
    console.log('🎯 handleHtmlPdfGeneration called with fileName:', fileName);
    
    // Prepare data for PDF template (outside try block so it's accessible in catch)
    const pdfData: PdfData = {
        specTitle: this.specTitle?.trim() || 'Specification Document',
        specVersion: this.specVersion?.trim() || '1.0.0',
        specDescription: this.specDescription?.trim() || 'No description provided',
        deviceName: this.deviceName?.trim() || 'Not specified',
        protocols: this.protocols?.filter(p => p && p.trim()) || [],
        documentStatus: this.documentStatus?.trim() || 'Not specified',
        applicableTo: this.applicableTo?.trim() || 'Not specified',
        selectedEnvelope: this.selectedEnvelopeId ? {
          id: this.selectedEnvelopeId,
          title: this.messageEnvelopes?.find(e => e.id === this.selectedEnvelopeId)?.title || 'Unknown Envelope'
        } : undefined,
        demoJsonText: this.demoJsonText?.trim() || undefined,
        messageTypes: this.messageTypes?.map(mt => ({
          name: mt.name?.trim() || 'Unknown Message Type',
          json_schema: mt.json_schema,
          demoJson: mt.json_schema ? this.generateDemoJsonForMessageType(mt.json_schema) : undefined // Generate demo JSON for each message type
        })) || [],
        generatedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

    try {
      console.log('🎯 Starting HTML PDF generation with enhanced styling...');
      console.log('📄 PDF Data:', pdfData);
      
      this.notificationService.info('Generating PDF...', 'Creating your specification document from HTML template.');
      
      // Generate text-based PDF with beautiful styling
      console.log('🚀 Calling generateTextBasedPdf method...');
      await this.htmlPdfService.generateTextBasedPdf(pdfData, fileName);
      console.log('✅ Text-based PDF generation completed successfully!');
      
      this.notificationService.success(
        'PDF Generated Successfully!', 
        `${fileName} has been created using HTML template and is ready to download.`
      );
      
      this.isDownloading = false;
      
    } catch (error) {
      console.error('❌ Enhanced HTML PDF generation error:', error);
      
      // Try the original HTML PDF method as fallback
      try {
        console.log('🔄 Trying fallback HTML PDF method...');
        this.notificationService.info('Trying alternative PDF generation...', 'Using fallback method.');
        await this.htmlPdfService.generatePdfFromHtml(pdfData, fileName);
        console.log('✅ Fallback PDF generation completed successfully!');
        
        this.notificationService.success(
          'PDF Generated Successfully!', 
          `${fileName} has been created using fallback method.`
        );
        
        this.isDownloading = false;
        
      } catch (fallbackError) {
        console.error('❌ Both HTML PDF generation methods failed:', fallbackError);
        console.log('🔄 Falling back to legacy jsPDF method...');
        this.isDownloading = false;
        
        this.notificationService.error(
          'PDF Generation Failed', 
          'Failed to generate PDF from HTML template. Falling back to legacy PDF generation.'
        );
        
        // Final fallback to original jsPDF generation method
        this.handlePdfGeneration(fileName);
      }
    }
  }

  // Handle PDF generation with proper loading states and user feedback (legacy method)
  private handlePdfGeneration(fileName: string): void {
    try {
      // Display info notification about PDF generation starting
      this.notificationService.info('Generating PDF...', 'Please wait while we create your specification document.');
      
      // Handle edge cases with missing or incomplete data
      const hasMinimalData = this.validateMinimalDataForPdf();
      
      if (!hasMinimalData.isValid) {
        this.notificationService.warning(
          'Incomplete Data Detected', 
          `Some fields are missing: ${hasMinimalData.missingFields.join(', ')}. PDF will be generated with available information.`
        );
      }
      
      // Use setTimeout to allow UI to update with loading state
      setTimeout(() => {
        try {
          // Generate PDF using jsPDF implementation
          const doc = this.generatePDF();
          
          // Generate proper PDF blob with correct MIME type
          const pdfBlob = doc.output('blob');
          
          // Validate that the blob was created successfully
          if (!pdfBlob || pdfBlob.size === 0) {
            throw new Error('Generated PDF blob is empty or invalid');
          }
          
          // Create download link for PDF
          const url = window.URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          // Display success notification on successful PDF download
          this.notificationService.success(
            'PDF Downloaded Successfully', 
            `${fileName} has been downloaded and is ready to view.`
          );
          
          // Reset loading state
          this.isDownloading = false;
          
        } catch (error) {
          console.error('PDF generation error:', error);
          
          // Reset loading state on errors
          this.isDownloading = false;
          
          // Display error notifications when PDF generation fails
          let errorMessage = 'Failed to generate PDF. ';
          
          if (error instanceof Error) {
            // Handle specific error types
            if (error.message.includes('jsPDF')) {
              errorMessage += 'PDF library error occurred.';
            } else if (error.message.includes('memory') || error.message.includes('Memory')) {
              errorMessage += 'Insufficient memory to generate PDF.';
            } else if (error.message.includes('blob')) {
              errorMessage += 'Error creating PDF file.';
            } else {
              errorMessage += error.message;
            }
          } else {
            errorMessage += 'An unexpected error occurred.';
          }
          
          this.notificationService.error('PDF Generation Failed', errorMessage);
          
          // Provide fallback behavior for critical failures
          this.providePdfFallback(fileName);
        }
      }, 100); // Small delay to ensure UI updates
      
    } catch (error) {
      console.error('Critical error in PDF generation handler:', error);
      
      // Reset loading state on errors
      this.isDownloading = false;
      
      this.notificationService.error(
        'PDF Generation Error', 
        'A critical error occurred while preparing PDF generation. Please try again.'
      );
      
      // Provide fallback behavior for critical failures
      this.providePdfFallback(fileName);
    }
  }

  // Validate minimal data required for PDF generation and handle edge cases
  private validateMinimalDataForPdf(): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    // Check for essential fields
    if (!this.specTitle || this.specTitle.trim() === '') {
      missingFields.push('Specification Title');
    }
    
    if (!this.specVersion || this.specVersion.trim() === '') {
      missingFields.push('Version');
    }
    
    if (!this.specDescription || this.specDescription.trim() === '') {
      missingFields.push('Description');
    }
    
    // Check for optional but important fields
    if (!this.deviceName || this.deviceName.trim() === '') {
      missingFields.push('Device Name');
    }
    
    if (!this.protocols || this.protocols.length === 0) {
      missingFields.push('Protocols');
    }
    
    if (!this.documentStatus || this.documentStatus.trim() === '') {
      missingFields.push('Document Status');
    }
    
    if (!this.applicableTo || this.applicableTo.trim() === '') {
      missingFields.push('Applicable To');
    }
    
    // Consider it valid if we have at least the basic fields (title, version, description)
    const hasBasicFields = !!(this.specTitle && this.specVersion && this.specDescription);
    
    return {
      isValid: hasBasicFields && missingFields.length <= 4, // Allow some missing optional fields
      missingFields
    };
  }

  // Provide fallback behavior for critical failures
  private providePdfFallback(fileName: string): void {
    try {
      this.notificationService.info(
        'Generating Fallback File', 
        'PDF generation failed. Creating a JSON backup of your specification data.'
      );
      
      // Fallback to JSON download when PDF generation fails - handle edge cases
      const fallbackContent = {
        specTitle: this.specTitle?.trim() || 'Not specified',
        specVersion: this.specVersion?.trim() || 'Not specified',
        specDescription: this.specDescription?.trim() || 'No description provided',
        deviceName: this.deviceName?.trim() || 'Not specified',
        protocols: this.protocols?.filter(p => p && p.trim()) || [],
        documentStatus: this.documentStatus?.trim() || 'Not specified',
        applicableTo: this.applicableTo?.trim() || 'Not specified',
        selectedEnvelopeId: this.selectedEnvelopeId || null,
        messageEnvelopes: this.messageEnvelopes?.length || 0,
        messageTypes: this.messageTypes?.map((mt: any) => ({
          name: mt?.name?.trim() || 'Unknown',
          hasData: !!mt
        })) || [],
        generatedAt: new Date().toISOString(),
        note: 'This is a fallback export due to PDF generation failure. All available specification data has been preserved.'
      };
      
      const jsonContent = JSON.stringify(fallbackContent, null, 2);
      const fallbackFileName = fileName.replace('.pdf', '_fallback.json');
      
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      if (!blob || blob.size === 0) {
        throw new Error('Failed to create fallback file blob');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.notificationService.success(
        'Fallback File Downloaded', 
        `${fallbackFileName} contains your specification data in JSON format.`
      );
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      this.notificationService.error(
        'Complete Download Failure', 
        'Both PDF generation and fallback download failed. Please check your browser settings and try again.'
      );
    }
  }
}

