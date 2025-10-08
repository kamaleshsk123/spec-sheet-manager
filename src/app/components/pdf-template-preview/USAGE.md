# 📄 PDF Template Preview - Usage Guide

## 🚀 How to Access

### Method 1: Direct URL
Navigate to: `http://localhost:4200/pdf-template-preview`

### Method 2: From Dashboard
1. Go to the main dashboard
2. Click the "📄 PDF Preview" button in the header

## 🎯 What You Can Do

### 1. **Live Preview**
- See exactly how your PDF will look
- Real-time preview of all styling and layout
- Sample data shows all PDF features

### 2. **Generate PDF**
- Click "📥 Generate PDF" to download a test PDF
- Uses the same HTML-to-PDF conversion as the main app
- Perfect for testing your customizations

### 3. **Print Preview**
- Click "🖨️ Print Preview" to open browser print dialog
- See how the PDF looks when printed
- Test print-specific CSS styles

### 4. **Update Data**
- Click "🔄 Update Data" to refresh with new sample data
- Test how the template handles data changes
- Verify reactivity of your customizations

## 🎨 Customization Workflow

### Step 1: Make Changes
Edit any of these files:
- `pdf-template.component.html` - Layout and structure
- `pdf-template.component.css` - Styling and colors
- `pdf-template.component.ts` - Logic and data handling

### Step 2: See Changes
- Refresh the preview page
- Changes appear immediately
- No need to go through the full app workflow

### Step 3: Test PDF Generation
- Click "Generate PDF" to test the actual PDF output
- Verify that your changes work in the final PDF

## 📝 Sample Data Included

The preview includes realistic sample data:
- **Specification Details**: Title, version, description, etc.
- **Device Information**: Name, protocols, status
- **Message Envelope**: With demo JSON
- **Message Types**: 4 different types with complex schemas
- **Demo JSON**: Realistic IoT sensor data

## 🔧 Development Tips

### Quick CSS Changes
```css
/* Change main colors */
.main-title { color: #your-color; }
.section-title { border-bottom-color: #your-accent; }

/* Change fonts */
.pdf-container { font-family: 'Your Font'; }

/* Adjust spacing */
.message-type-item { margin-bottom: 40px; }
```

### Quick HTML Changes
```html
<!-- Add new section -->
<section class="custom-section">
  <h2 class="section-title">Your Section</h2>
  <p>Your content</p>
</section>

<!-- Modify existing sections -->
<div class="your-custom-class">
  <!-- Your modifications -->
</div>
```

### Testing Different Data
Modify the `sampleData` object in `pdf-template-preview.component.ts` to test with different content.

## 🎯 Benefits of Standalone Preview

✅ **Faster Development** - No need to go through full app workflow
✅ **Isolated Testing** - Focus only on PDF appearance
✅ **Easy Debugging** - Clear separation of concerns
✅ **Quick Iterations** - Make changes and see results immediately
✅ **Client Demos** - Show PDF designs without full app setup

## 🚨 Troubleshooting

### PDF Generation Fails
- Check browser console for errors
- Ensure html2canvas is properly installed
- Verify sample data structure

### Styling Issues
- Check CSS syntax in pdf-template.component.css
- Verify CSS classes are applied correctly
- Test in different browsers

### Preview Not Loading
- Ensure all imports are correct
- Check that the route is properly configured
- Verify component dependencies

This standalone preview makes PDF customization as easy as editing a regular webpage!