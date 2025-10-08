import { Injectable, ComponentRef, ViewContainerRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { PdfTemplateComponent, PdfData } from '../components/pdf-template/pdf-template.component';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class HtmlPdfService {

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  async generatePdfFromHtml(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    try {
      // Create the PDF template component dynamically
      const componentRef = createComponent(PdfTemplateComponent, {
        environmentInjector: this.injector
      });

      // Set the data
      componentRef.instance.data = data;
      
      // Attach to application
      this.appRef.attachView(componentRef.hostView);

      // Create a temporary container that matches the preview exactly
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels
      tempContainer.style.background = '#ffffff';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.6';
      tempContainer.style.color = '#333333';
      tempContainer.style.visibility = 'hidden'; // Hide but keep in layout
      tempContainer.style.zIndex = '-1000';
      tempContainer.appendChild(componentRef.location.nativeElement);
      document.body.appendChild(tempContainer);

      // Force Angular change detection
      componentRef.changeDetectorRef.detectChanges();

      // Wait for component to render and fonts to load with longer timeout
      console.log('⏳ Waiting for component rendering (original method)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ensure all fonts are loaded
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      // Check if element has content
      const element = componentRef.location.nativeElement;
      console.log('📏 Element dimensions (original):', { 
        scrollWidth: element.scrollWidth, 
        scrollHeight: element.scrollHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight
      });
      
      if (element.scrollHeight === 0) {
        console.warn('⚠️ Element has zero height (original), trying visibility fixes...');
        
        // Try making the container visible temporarily
        tempContainer.style.visibility = 'visible';
        tempContainer.style.left = '0';
        tempContainer.style.top = '0';
        
        // Force layout recalculation
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';
        
        // Wait for layout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📏 After visibility fix (original):', { 
          scrollWidth: element.scrollWidth, 
          scrollHeight: element.scrollHeight 
        });
        
        // Hide it again for capture
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
      }

      // Generate PDF using html2canvas + jsPDF with conservative settings
      const canvas = await html2canvas(componentRef.location.nativeElement, {
        scale: 1, // Conservative scale to avoid memory issues
        useCORS: false, // Disable CORS to avoid taint issues
        allowTaint: true, // Allow taint to handle cross-origin content
        backgroundColor: '#ffffff',
        width: 794, // Fixed A4 width in pixels
        height: componentRef.location.nativeElement.scrollHeight,
        logging: false, // Disable logging for cleaner output
        removeContainer: true,
        imageTimeout: 0,
        // Force specific styles for better PDF rendering
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('.pdf-container');
          if (clonedElement) {
            // Ensure consistent styling in the cloned element
            (clonedElement as HTMLElement).style.fontFamily = 'Arial, sans-serif';
            (clonedElement as HTMLElement).style.fontSize = '12px';
            (clonedElement as HTMLElement).style.lineHeight = '1.6';
            (clonedElement as HTMLElement).style.color = '#333333';
            (clonedElement as HTMLElement).style.background = '#ffffff';
            
            // Fix any gradient backgrounds that might not render properly
            const gradientElements = clonedDoc.querySelectorAll('[style*="gradient"]');
            gradientElements.forEach(el => {
              (el as HTMLElement).style.background = '#3498db';
            });
            
            // Ensure JSON code blocks have proper styling and formatting
            const jsonBlocks = clonedDoc.querySelectorAll('.json-code');
            jsonBlocks.forEach(block => {
              (block as HTMLElement).style.background = '#f8f9fa';
              (block as HTMLElement).style.color = '#2c3e50';
              (block as HTMLElement).style.fontFamily = 'Courier New, monospace';
              (block as HTMLElement).style.fontSize = '10px';
              (block as HTMLElement).style.lineHeight = '1.5';
              (block as HTMLElement).style.whiteSpace = 'pre';
              (block as HTMLElement).style.wordWrap = 'break-word';
              (block as HTMLElement).style.padding = '15px';
              (block as HTMLElement).style.border = '1px solid #dee2e6';
              (block as HTMLElement).style.borderRadius = '4px';
            });
          }
        }
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Generate JPEG image data to avoid PNG signature issues
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Add first page
      pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(filename);

      // Cleanup
      document.body.removeChild(tempContainer);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();

    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      throw error;
    }
  }

  // Enhanced PDF generation method with better styling preservation
  async generatePdfWithBetterStyling(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    console.log('🎨 generatePdfWithBetterStyling called with data:', data);
    console.log('📁 filename:', filename);
    
    try {
      console.log('🔧 Creating PDF template component...');
      // Create the PDF template component dynamically
      const componentRef = createComponent(PdfTemplateComponent, {
        environmentInjector: this.injector
      });
      console.log('✅ PDF template component created successfully');

      // Set the data
      componentRef.instance.data = data;
      
      // Attach to application
      this.appRef.attachView(componentRef.hostView);

      // Create a temporary container that exactly matches the preview
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels (210mm at 96dpi)
      tempContainer.style.background = '#ffffff';
      tempContainer.style.zIndex = '-1000';
      tempContainer.style.visibility = 'hidden'; // Hide but keep in layout
      tempContainer.appendChild(componentRef.location.nativeElement);
      document.body.appendChild(tempContainer);

      // Force Angular change detection
      componentRef.changeDetectorRef.detectChanges();
      
      // Wait for rendering and fonts with longer timeout
      console.log('⏳ Waiting for component rendering...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      // Check if element has content
      const element = componentRef.location.nativeElement;
      console.log('📏 Element dimensions:', { 
        scrollWidth: element.scrollWidth, 
        scrollHeight: element.scrollHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        innerHTML: element.innerHTML.length > 0 ? 'Has content' : 'Empty'
      });
      
      if (element.scrollHeight === 0) {
        console.warn('⚠️ Element has zero height, trying visibility fixes...');
        
        // Try making the container visible temporarily
        tempContainer.style.visibility = 'visible';
        tempContainer.style.left = '0';
        tempContainer.style.top = '0';
        
        // Force layout recalculation
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';
        
        // Wait for layout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📏 After visibility fix:', { 
          scrollWidth: element.scrollWidth, 
          scrollHeight: element.scrollHeight 
        });
        
        // Hide it again for capture
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
      }

      // Get the element to capture (already declared above)
      
      // Generate PDF using html2canvas with conservative settings
      console.log('📸 Starting html2canvas capture with conservative settings...');
      const canvas = await html2canvas(element, {
        scale: 1, // Conservative scale to avoid memory issues
        useCORS: false, // Disable CORS to avoid taint issues
        allowTaint: true, // Allow taint to handle cross-origin content
        backgroundColor: '#ffffff',
        width: 794, // Fixed A4 width in pixels
        height: element.scrollHeight,
        logging: false,
        removeContainer: true,
        imageTimeout: 0, // Disable image timeout
        foreignObjectRendering: false, // Disable for better compatibility
        ignoreElements: (element) => {
          // Skip problematic elements
          const tagName = element.tagName?.toLowerCase();
          return tagName === 'script' || 
                 tagName === 'style' ||
                 tagName === 'iframe' ||
                 tagName === 'object' ||
                 tagName === 'embed' ||
                 element.classList?.contains('ignore-pdf');
        },
        onclone: (clonedDoc) => {
          // Apply consistent styling to cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            .pdf-container {
              font-family: Arial, sans-serif !important;
              background: #ffffff !important;
              color: #333333 !important;
            }
            .json-code {
              background: #f8f9fa !important;
              color: #2c3e50 !important;
              font-family: 'Courier New', monospace !important;
              font-size: 10px !important;
              line-height: 1.5 !important;
              white-space: pre !important;
              word-wrap: break-word !important;
              padding: 15px !important;
              border: 1px solid #dee2e6 !important;
              border-radius: 4px !important;
            }
            .header-divider {
              background: #3498db !important;
            }
            /* Remove any problematic CSS that might cause rendering issues */
            img, svg, canvas {
              max-width: 100% !important;
              height: auto !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Validate canvas before creating PDF
      console.log('🔍 Validating canvas:', { width: canvas.width, height: canvas.height });
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.error('❌ Canvas validation failed. Element info:', {
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          offsetWidth: element.offsetWidth,
          offsetHeight: element.offsetHeight,
          hasContent: element.innerHTML.length > 0,
          isVisible: element.offsetParent !== null
        });
        throw new Error(`Invalid canvas generated by html2canvas: width=${canvas?.width}, height=${canvas?.height}. Element may not be properly rendered.`);
      }
      console.log('✅ Canvas validation passed');

      // Create PDF with better quality settings
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Generate image data using JPEG to avoid PNG signature issues
      console.log('📸 Converting canvas to JPEG format...');
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Validate the image data
      if (!imageData || imageData.length < 100 || !imageData.startsWith('data:image/jpeg')) {
        throw new Error('Failed to generate valid JPEG image data');
      }
      
      console.log('✅ JPEG image data generated successfully');

      // Add first page with JPEG image data
      pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(filename);

      // Cleanup
      document.body.removeChild(tempContainer);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();

    } catch (error) {
      console.error('❌ Error generating enhanced PDF:', error);
      console.error('❌ Error details:', error);
      throw error;
    }
  }

  // Generate text-based PDF with beautiful styling (selectable text)
  async generateTextBasedPdf(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    try {
      console.log('📝 Starting text-based PDF generation...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Colors
      const primaryColor = [52, 152, 219]; // #3498db
      const darkColor = [44, 62, 80]; // #2c3e50
      const grayColor = [127, 140, 141]; // #7f8c8d
      const lightGrayColor = [248, 249, 250]; // #f8f9fa

      // Helper function to check if we need a new page
      const checkNewPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Helper function to add styled text
      const addStyledText = (text: string, options: {
        fontSize?: number;
        fontStyle?: 'normal' | 'bold';
        color?: number[];
        align?: 'left' | 'center' | 'right';
        marginBottom?: number;
        maxWidth?: number;
      } = {}) => {
        const {
          fontSize = 12,
          fontStyle = 'normal',
          color = [0, 0, 0],
          align = 'left',
          marginBottom = 5,
          maxWidth = contentWidth
        } = options;

        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        pdf.setTextColor(color[0], color[1], color[2]);

        const lines = pdf.splitTextToSize(text, maxWidth);
        const textHeight = lines.length * fontSize * 0.35;
        
        checkNewPage(textHeight + marginBottom);

        let xPosition = margin;
        if (align === 'center') {
          xPosition = pageWidth / 2;
        } else if (align === 'right') {
          xPosition = pageWidth - margin;
        }

        pdf.text(lines, xPosition, yPosition, { align: align });
        yPosition += textHeight + marginBottom;
      };

      // Helper function to add a colored line
      const addColoredLine = (color: number[] = primaryColor, thickness: number = 1) => {
        checkNewPage(thickness + 5);
        pdf.setDrawColor(color[0], color[1], color[2]);
        pdf.setLineWidth(thickness);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += thickness + 5;
      };

      // Helper function to add a table row
      const addTableRow = (label: string, value: string, isEven: boolean = false) => {
        const rowHeight = 8;
        checkNewPage(rowHeight);

        // Background for even rows
        if (isEven) {
          pdf.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
          pdf.rect(margin, yPosition - 2, contentWidth, rowHeight, 'F');
        }

        // Label (bold)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        pdf.text(label, margin + 5, yPosition + 3);

        // Value (normal)
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const valueLines = pdf.splitTextToSize(value, contentWidth - 60);
        pdf.text(valueLines, margin + 60, yPosition + 3);

        yPosition += Math.max(rowHeight, valueLines.length * 3.5);
      };

      // Helper function to add JSON code block
      const addJsonCodeBlock = (jsonText: string, title: string = '') => {
        if (title) {
          addStyledText(title, { fontSize: 12, fontStyle: 'bold', color: [73, 80, 87], marginBottom: 3 });
        }

        // Background rectangle
        const lines = jsonText.split('\n');
        const blockHeight = lines.length * 3 + 6;
        checkNewPage(blockHeight + 5);

        pdf.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        pdf.rect(margin, yPosition - 2, contentWidth, blockHeight, 'F');

        // Border
        pdf.setDrawColor(222, 226, 230);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, yPosition - 2, contentWidth, blockHeight);

        // JSON text
        pdf.setFontSize(9);
        pdf.setFont('courier', 'normal');
        pdf.setTextColor(44, 62, 80);
        
        lines.forEach((line, index) => {
          pdf.text(line, margin + 3, yPosition + 2 + (index * 3));
        });

        yPosition += blockHeight + 8;
      };

      // 1. Header
      addStyledText(data.specTitle || 'Specification Document', {
        fontSize: 20,
        fontStyle: 'bold',
        color: darkColor,
        align: 'center',
        marginBottom: 8
      });

      addStyledText(`Version: ${data.specVersion || 'N/A'} | Generated: ${data.generatedDate}`, {
        fontSize: 11,
        color: grayColor,
        align: 'center',
        marginBottom: 10
      });

      addColoredLine(primaryColor, 2);

      // 2. Specification Details
      addStyledText('Specification Details', {
        fontSize: 16,
        fontStyle: 'bold',
        color: darkColor,
        marginBottom: 10
      });

      let rowIndex = 0;
      addTableRow('Title:', data.specTitle || 'Not specified', rowIndex++ % 2 === 0);
      addTableRow('Version:', data.specVersion || 'Not specified', rowIndex++ % 2 === 0);
      addTableRow('Description:', data.specDescription || 'No description provided', rowIndex++ % 2 === 0);
      addTableRow('Device Name:', data.deviceName || 'Not specified', rowIndex++ % 2 === 0);
      addTableRow('Protocols:', data.protocols?.join(', ') || 'None specified', rowIndex++ % 2 === 0);
      addTableRow('Document Status:', data.documentStatus || 'Not specified', rowIndex++ % 2 === 0);
      addTableRow('Applicable To:', data.applicableTo || 'Not specified', rowIndex++ % 2 === 0);

      yPosition += 10;

      // 3. Message Envelope
      if (data.selectedEnvelope) {
        addStyledText('Message Envelope', {
          fontSize: 16,
          fontStyle: 'bold',
          color: darkColor,
          marginBottom: 10
        });

        addTableRow('Title:', data.selectedEnvelope.title || 'Untitled envelope', true);

        if (data.demoJsonText) {
          yPosition += 5;
          addJsonCodeBlock(data.demoJsonText, 'Demo JSON:');
        }
      }

      // 4. Message Types
      if (data.messageTypes && data.messageTypes.length > 0) {
        addStyledText('Message Types', {
          fontSize: 16,
          fontStyle: 'bold',
          color: darkColor,
          marginBottom: 5
        });

        addStyledText(`Total message types: ${data.messageTypes.length}`, {
          fontSize: 12,
          marginBottom: 10
        });

        data.messageTypes.forEach((messageType, index) => {
          // Message type title with number
          addStyledText(`3.${index + 1} ${messageType.name || 'Message Type ' + (index + 1)}`, {
            fontSize: 14,
            fontStyle: 'bold',
            color: darkColor,
            marginBottom: 8
          });

          // JSON Schema
          if (messageType.json_schema) {
            try {
              const schemaText = JSON.stringify(messageType.json_schema, null, 2);
              addJsonCodeBlock(schemaText, 'JSON Schema:');
            } catch (e) {
              addJsonCodeBlock('Invalid JSON Schema', 'JSON Schema:');
            }
          }

          // Demo JSON
          const demoJson = messageType.demoJson || this.generateDemoJsonForMessageType(messageType.json_schema);
          if (demoJson) {
            addJsonCodeBlock(demoJson, 'Demo JSON:');
          }

          yPosition += 5;
        });
      }

      // Download the PDF
      pdf.save(filename);
      console.log('✅ Text-based PDF generated and downloaded successfully!');

    } catch (error) {
      console.error('❌ Text-based PDF generation failed:', error);
      
      // Fallback to image-based method
      console.log('🔄 Falling back to image-based PDF...');
      try {
        await this.generateStyledPdf(data, filename);
        console.log('✅ Image-based PDF succeeded as fallback');
      } catch (fallbackError) {
        console.error('❌ All PDF methods failed:', fallbackError);
        throw new Error('PDF generation failed. Please try again.');
      }
    }
  }

  // Generate styled PDF using HTML template (fixed approach)
  async generateStyledPdf(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    try {
      console.log('🎨 Starting styled PDF generation...');
      
      // Create the PDF template component dynamically
      const componentRef = createComponent(PdfTemplateComponent, {
        environmentInjector: this.injector
      });

      // Set the data
      componentRef.instance.data = data;
      
      // Attach to application
      this.appRef.attachView(componentRef.hostView);

      // Force change detection
      componentRef.changeDetectorRef.detectChanges();
      
      // Create a visible container temporarily to ensure proper rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels
      tempContainer.style.background = '#ffffff';
      tempContainer.style.zIndex = '9999';
      tempContainer.style.visibility = 'visible';
      tempContainer.appendChild(componentRef.location.nativeElement);
      document.body.appendChild(tempContainer);

      // Wait for component to fully render
      console.log('⏳ Waiting for component rendering...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Ensure all fonts are loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Get the element and check dimensions
      const element = componentRef.location.nativeElement;
      console.log('📏 Element dimensions:', { 
        scrollWidth: element.scrollWidth, 
        scrollHeight: element.scrollHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight
      });

      // Now hide the container for capture
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.left = '-9999px';
      
      // Make sure element is fully visible for capture
      tempContainer.style.visibility = 'visible';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      
      // Wait a bit more for visibility
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use html2canvas with very simple settings
      console.log('📸 Starting html2canvas capture...');
      console.log('📏 Pre-capture element check:', {
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        isVisible: element.offsetParent !== null,
        hasContent: element.innerHTML.length > 0
      });
      
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        removeContainer: false,
        imageTimeout: 0,
        width: element.scrollWidth || element.offsetWidth,
        height: element.scrollHeight || element.offsetHeight
      });

      console.log('🔍 Canvas dimensions:', { width: canvas.width, height: canvas.height });
      
      // Test canvas content
      const ctx = canvas.getContext('2d');
      const pixelData = ctx?.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
      const hasContent = pixelData?.data.some(pixel => pixel !== 255); // Check if not all white
      console.log('🎨 Canvas has content:', hasContent);

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.error('❌ Canvas generation failed - dimensions are zero');
        throw new Error('Canvas generation failed - trying print method instead');
      }
      
      if (!hasContent) {
        console.warn('⚠️ Canvas appears to be empty/white - might be a rendering issue');
      }

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Convert to JPEG to avoid PNG issues
      const jpegData = canvas.toDataURL('image/jpeg', 0.95);
      console.log('📊 Image data length:', jpegData.length);
      console.log('📊 Image data preview:', jpegData.substring(0, 100) + '...');
      
      // Validate image data
      if (jpegData.length < 1000) {
        console.error('❌ Image data is too small, likely empty canvas');
        throw new Error('Generated image is too small - canvas might be empty');
      }
      
      // Add first page
      pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(filename);
      console.log('✅ Styled PDF generated and downloaded successfully!');

      // Cleanup
      document.body.removeChild(tempContainer);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();

    } catch (error) {
      console.error('❌ Styled PDF generation failed:', error);
      console.log('🔄 Trying alternative PDF generation method...');
      
      // Try alternative method using different html2canvas settings
      try {
        await this.generateAlternativePdf(data, filename);
        console.log('✅ Alternative PDF method succeeded');
      } catch (altError) {
        console.error('❌ Alternative PDF method failed:', altError);
        console.log('🔄 Falling back to print method...');
        
        // Final fallback to print method
        try {
          await this.printHtml(data);
          console.log('✅ Print method succeeded as final fallback');
        } catch (printError) {
          console.error('❌ All PDF methods failed:', printError);
          throw new Error('All PDF generation methods failed. Please try the print option or contact support.');
        }
      }
    }
  }

  // Alternative PDF generation method with different approach
  async generateAlternativePdf(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    try {
      console.log('🔄 Starting alternative PDF generation...');
      
      // Create the PDF template component dynamically
      const componentRef = createComponent(PdfTemplateComponent, {
        environmentInjector: this.injector
      });

      // Set the data
      componentRef.instance.data = data;
      
      // Attach to application
      this.appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();
      
      // Create a container that's actually in the viewport
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '50px';
      tempContainer.style.top = '50px';
      tempContainer.style.width = '794px';
      tempContainer.style.background = '#ffffff';
      tempContainer.style.zIndex = '10000';
      tempContainer.style.border = '2px solid red'; // Visible border for debugging
      tempContainer.appendChild(componentRef.location.nativeElement);
      document.body.appendChild(tempContainer);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const element = componentRef.location.nativeElement;
      console.log('📏 Alternative method - element dimensions:', {
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight
      });

      // Try html2canvas with different settings
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true,
        removeContainer: true,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          // Apply inline styles to ensure they're captured
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * { box-sizing: border-box; }
            .pdf-container { 
              font-family: Arial, sans-serif !important;
              background: white !important;
              color: black !important;
            }
            .json-code {
              background: #f8f9fa !important;
              color: #333 !important;
              font-family: monospace !important;
              white-space: pre !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      console.log('🔍 Alternative canvas dimensions:', { width: canvas.width, height: canvas.height });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Alternative canvas generation also failed');
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pngData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(pngData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Handle multiple pages if needed
      if (imgHeight > 297) {
        let heightLeft = imgHeight - 297;
        let position = -297;
        
        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(pngData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
          position -= 297;
        }
      }

      pdf.save(filename);
      console.log('✅ Alternative PDF generated successfully!');

      // Cleanup
      document.body.removeChild(tempContainer);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();

    } catch (error) {
      console.error('❌ Alternative PDF generation failed:', error);
      throw error;
    }
  }

  // Direct PDF generation method that creates PDF content without html2canvas
  async generateDirectPdf(data: PdfData, filename: string = 'specification.pdf'): Promise<void> {
    try {
      console.log('📄 Starting direct PDF generation...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.35) > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * fontSize * 0.35 + 5;
      };

      // Add header
      addText(data.specTitle || 'Specification Document', 20, true);
      addText(`Version: ${data.specVersion || 'N/A'} | Generated: ${data.generatedDate}`, 10);
      
      // Add a line
      pdf.setDrawColor(52, 152, 219);
      pdf.setLineWidth(1);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Specification Details
      addText('Specification Details', 16, true);
      addText(`Title: ${data.specTitle || 'Not specified'}`, 12);
      addText(`Description: ${data.specDescription || 'No description provided'}`, 12);
      addText(`Device Name: ${data.deviceName || 'Not specified'}`, 12);
      addText(`Protocols: ${data.protocols?.join(', ') || 'None specified'}`, 12);
      addText(`Document Status: ${data.documentStatus || 'Not specified'}`, 12);
      addText(`Applicable To: ${data.applicableTo || 'Not specified'}`, 12);
      yPosition += 10;

      // Message Envelope
      if (data.selectedEnvelope) {
        addText('Message Envelope', 16, true);
        addText(`Title: ${data.selectedEnvelope.title || 'Untitled envelope'}`, 12);
        
        if (data.demoJsonText) {
          addText('Demo JSON:', 14, true);
          addText(data.demoJsonText, 10);
        }
        yPosition += 10;
      }

      // Message Types
      if (data.messageTypes && data.messageTypes.length > 0) {
        addText('Message Types', 16, true);
        addText(`Total message types: ${data.messageTypes.length}`, 12);
        yPosition += 5;

        data.messageTypes.forEach((messageType, index) => {
          addText(`3.${index + 1} ${messageType.name || 'Message Type ' + (index + 1)}`, 14, true);
          
          // JSON Schema
          if (messageType.json_schema) {
            addText('JSON Schema:', 12, true);
            try {
              const schemaText = JSON.stringify(messageType.json_schema, null, 2);
              addText(schemaText, 9);
            } catch (e) {
              addText('Invalid JSON Schema', 9);
            }
          }
          
          // Demo JSON
          const demoJson = messageType.demoJson || this.generateDemoJsonForMessageType(messageType.json_schema);
          if (demoJson) {
            addText('Demo JSON:', 12, true);
            addText(demoJson, 9);
          }
          
          yPosition += 5;
        });
      }

      // Download the PDF
      pdf.save(filename);
      console.log('✅ Direct PDF generated and downloaded successfully!');

    } catch (error) {
      console.error('❌ Error generating direct PDF:', error);
      throw error;
    }
  }

  // Helper method to generate demo JSON (simplified version)
  private generateDemoJsonForMessageType(schema: any): string {
    if (!schema || !schema.properties) {
      return JSON.stringify({
        "message": "Sample data",
        "timestamp": new Date().toISOString(),
        "id": Math.floor(Math.random() * 1000)
      }, null, 2);
    }

    const demo: any = {};
    Object.keys(schema.properties).forEach((key) => {
      const property = schema.properties[key];
      demo[key] = this.generateMockValue(property, key);
    });

    return JSON.stringify(demo, null, 2);
  }

  private generateMockValue(property: any, key: string): any {
    const type = property.type || 'string';
    
    switch (type) {
      case 'string':
        if (property.format === 'date-time') {
          return new Date().toISOString();
        }
        if (property.enum && property.enum.length > 0) {
          return property.enum[0];
        }
        return `Sample ${key}`;
        
      case 'number':
      case 'integer':
        const min = property.minimum || 0;
        const max = property.maximum || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
        
      case 'boolean':
        return true;
        
      case 'object':
        const nestedDemo: any = {};
        if (property.properties) {
          Object.keys(property.properties).forEach((nestedKey) => {
            nestedDemo[nestedKey] = this.generateMockValue(property.properties[nestedKey], nestedKey);
          });
        }
        return nestedDemo;
        
      default:
        return `Sample ${key}`;
    }
  }

  // Alternative method using browser's print functionality
  async printHtml(data: PdfData): Promise<void> {
    try {
      console.log('🖨️ Starting print HTML method...');
      
      // Create the PDF template component dynamically
      const componentRef = createComponent(PdfTemplateComponent, {
        environmentInjector: this.injector
      });

      // Set the data
      componentRef.instance.data = data;
      
      // Attach to application
      this.appRef.attachView(componentRef.hostView);

      // Force change detection
      componentRef.changeDetectorRef.detectChanges();
      
      // Wait for component to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups for this site.');
      }

      // Get the HTML content
      const htmlContent = componentRef.location.nativeElement.outerHTML;
      
      // Get inline styles from the component
      const componentStyles = `
        .pdf-container {
          font-family: Arial, sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: #ffffff;
          color: #333333;
          line-height: 1.6;
          font-size: 12px;
        }
        .pdf-header {
          margin-bottom: 30px;
          text-align: center;
        }
        .main-title {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header-metadata {
          font-size: 14px;
          color: #7f8c8d;
          margin-bottom: 20px;
        }
        .header-divider {
          height: 3px;
          background: #3498db;
          border-radius: 2px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0 0 20px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #3498db;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table-row:nth-child(even) {
          background-color: #f8f9fa;
        }
        .label-cell {
          font-weight: bold;
          padding: 12px 15px;
          border: 1px solid #dee2e6;
          background-color: #e9ecef;
          width: 30%;
        }
        .value-cell {
          padding: 12px 15px;
          border: 1px solid #dee2e6;
        }
        .message-type-item {
          margin-bottom: 35px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          background: #f8f9fa;
        }
        .message-type-title {
          font-size: 16px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0 0 15px 0;
        }
        .message-number {
          background: #3498db;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          margin-right: 15px;
        }
        .json-code {
          background: #f8f9fa;
          color: #2c3e50;
          padding: 15px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.5;
          white-space: pre;
          word-wrap: break-word;
          border: 1px solid #dee2e6;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media print {
          body { 
            margin: 0; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-container { 
            max-width: none; 
            margin: 0; 
            padding: 15mm; 
          }
          .json-code {
            background: #f8f9fa !important;
            color: #2c3e50 !important;
            border: 1px solid #dee2e6 !important;
          }
        }
      `;

      // Write to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Specification Document</title>
          <meta charset="utf-8">
          <style>
            ${componentStyles}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Don't close automatically - let user close after printing
        }, 500);
      };

      console.log('✅ Print window opened successfully');

      // Cleanup
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();

    } catch (error) {
      console.error('❌ Error printing HTML:', error);
      throw error;
    }
  }
}