# PDF Template Component

This component provides an HTML-based PDF generation system that's much easier to customize than the legacy jsPDF approach.

## 🎯 Features

- **HTML/CSS Based**: Easy to style and customize using standard web technologies
- **Responsive Design**: Automatically handles layout and formatting
- **Professional Styling**: Clean, modern design with proper typography
- **Easy Maintenance**: Separate template files for easy modifications

## 📁 Files

- `pdf-template.component.ts` - Component logic and data handling
- `pdf-template.component.html` - HTML template (easy to customize!)
- `pdf-template.component.css` - Styling (easy to modify colors, fonts, layout!)

## 🎨 Customization Guide

### Changing Colors
Edit `pdf-template.component.css`:
```css
.main-title {
  color: #2c3e50; /* Change header color */
}

.section-title {
  border-bottom: 2px solid #3498db; /* Change accent color */
}

.message-number {
  background: #3498db; /* Change number background */
}
```

### Modifying Layout
Edit `pdf-template.component.html`:
- Reorder sections by moving HTML blocks
- Add new sections by copying existing patterns
- Modify table structure for different data presentation

### Adding New Sections
1. Add HTML in `pdf-template.component.html`
2. Add corresponding CSS in `pdf-template.component.css`
3. Update `PdfData` interface if new data is needed

### Changing Fonts
```css
.pdf-container {
  font-family: 'Your Font', sans-serif;
}
```

## 🚀 Usage

The component is automatically used when you select "PDF (HTML Template)" in the download options.

### Data Structure
```typescript
interface PdfData {
  specTitle: string;
  specVersion: string;
  specDescription: string;
  deviceName: string;
  protocols: string[];
  documentStatus: string;
  applicableTo: string;
  selectedEnvelope?: {
    id: string;
    title: string;
  };
  demoJsonText?: string;
  messageTypes: Array<{
    name: string;
    json_schema?: any;
    demoJson?: string;
  }>;
  generatedDate: string;
}
```

## 💡 Benefits over Legacy PDF

| Feature | HTML Template | Legacy jsPDF |
|---------|---------------|--------------|
| **Styling** | CSS (easy) | Manual positioning (hard) |
| **Layout** | Automatic | Manual calculations |
| **Maintenance** | Simple HTML/CSS edits | Complex code changes |
| **Customization** | Very easy | Difficult |
| **Responsive** | Yes | No |
| **Print Support** | Built-in | Limited |

## 🔧 Technical Details

- Uses `html2canvas` to convert HTML to image
- Uses `jsPDF` to create PDF from image
- Supports multi-page documents
- Handles page breaks automatically
- Print-optimized CSS included

## 📝 Example Customizations

### 1. Add Company Logo
```html
<!-- In pdf-template.component.html header section -->
<div class="company-logo">
  <img src="assets/logo.png" alt="Company Logo" />
</div>
```

### 2. Change Color Scheme
```css
/* Blue theme */
:root {
  --primary-color: #2563eb;
  --secondary-color: #1e40af;
  --accent-color: #3b82f6;
}
```

### 3. Add Footer
```html
<footer class="pdf-footer">
  <p>© 2024 Your Company Name | Generated on {{ data.generatedDate }}</p>
</footer>
```

This approach makes PDF customization as easy as editing a webpage!