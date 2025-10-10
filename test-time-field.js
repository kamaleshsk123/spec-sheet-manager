// Simple test to verify the time field implementation
// This simulates the behavior of our updated component

// Mock JsonSchemaProperty interface
class JsonSchemaProperty {
    constructor(type, format = null) {
        this.type = type;
        if (format) this.format = format;
    }
}

// Mock JsonField interface
class JsonField {
    constructor(name, type, is_required = false) {
        this.name = name;
        this.type = type;
        this.is_required = is_required;
        this.children = [];
        this.items = { type: 'string', children: [] };
    }
}

// Simulate the buildSchema function logic for time fields
function buildSchemaForTimeField(fields) {
    const properties = {};
    const required = [];

    for (const field of fields) {
        if (!field.name) continue;

        // This is the key logic we added
        const property = { type: field.type === 'time' ? 'string' : field.type };
        if (field.type === 'time') property.format = 'date-time';

        if (field.is_required) required.push(field.name);

        properties[field.name] = property;
    }

    return { properties, required };
}

// Simulate the generateMockForProperty function for time fields
function generateMockForTimeProperty(prop, key) {
    if (prop.type === 'string' && prop.format === 'date-time') {
        // Generate a valid ISO 8601 timestamp
        const now = new Date();
        const randomOffset = Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000); // Random offset up to 1 year
        const randomDate = new Date(now.getTime() - randomOffset);
        return randomDate.toISOString();
    }
    return 'mock-value';
}

// Test cases
console.log('Testing time field implementation...\n');

// Test 1: Basic time field schema generation
const timeField = new JsonField('created_at', 'time', true);
const schema = buildSchemaForTimeField([timeField]);

console.log('Test 1 - Time field schema generation:');
console.log('Input field:', { name: timeField.name, type: timeField.type, is_required: timeField.is_required });
console.log('Generated schema:', JSON.stringify(schema, null, 2));

// Verify the schema is correct
const expectedProperty = schema.properties.created_at;
if (expectedProperty.type === 'string' && expectedProperty.format === 'date-time') {
    console.log('✅ PASS: Time field correctly generates string type with date-time format\n');
} else {
    console.log('❌ FAIL: Time field schema generation failed\n');
}

// Test 2: Mock data generation for time field
const timeProperty = new JsonSchemaProperty('string', 'date-time');
const mockValue = generateMockForTimeProperty(timeProperty, 'created_at');

console.log('Test 2 - Time field mock data generation:');
console.log('Generated mock value:', mockValue);

// Verify the mock value is a valid ISO 8601 timestamp
const isValidTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(mockValue);
if (isValidTimestamp) {
    console.log('✅ PASS: Generated mock value is a valid ISO 8601 timestamp\n');
} else {
    console.log('❌ FAIL: Generated mock value is not a valid timestamp\n');
}

// Test 3: Mixed field types including time
const mixedFields = [
    new JsonField('id', 'integer', true),
    new JsonField('name', 'string', true),
    new JsonField('created_at', 'time', true),
    new JsonField('updated_at', 'time', false),
    new JsonField('is_active', 'boolean', false)
];

const mixedSchema = buildSchemaForTimeField(mixedFields);

console.log('Test 3 - Mixed field types with time fields:');
console.log('Generated schema:', JSON.stringify(mixedSchema, null, 2));

// Verify mixed schema
const hasCorrectTimeFields =
    mixedSchema.properties.created_at.type === 'string' &&
    mixedSchema.properties.created_at.format === 'date-time' &&
    mixedSchema.properties.updated_at.type === 'string' &&
    mixedSchema.properties.updated_at.format === 'date-time' &&
    mixedSchema.properties.name.type === 'string' &&
    !mixedSchema.properties.name.format;

if (hasCorrectTimeFields) {
    console.log('✅ PASS: Mixed schema correctly handles time and non-time fields\n');
} else {
    console.log('❌ FAIL: Mixed schema generation failed\n');
}

console.log('All tests completed!');