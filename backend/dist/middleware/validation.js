"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.updateMessageTypeSchema = exports.createMessageTypeSchema = exports.updateSpecSchema = exports.createSpecSchema = exports.loginSchema = exports.createUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// User validation schemas
exports.createUserSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().min(2).max(100).required(),
    password: joi_1.default.string().min(6).required(),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
});
// Protobuf spec validation schemas
const fieldSchema = joi_1.default.object({
    type: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.object()).required(),
    name: joi_1.default.string().required(),
    number: joi_1.default.number().integer().min(1).required(),
    repeated: joi_1.default.boolean().optional(),
    optional: joi_1.default.boolean().optional(),
});
const enumValueSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    number: joi_1.default.number().integer().min(0).required(),
});
const enumSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    values: joi_1.default.array().items(enumValueSchema).min(1).required(),
});
const serviceMethodSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    inputType: joi_1.default.string().required(),
    outputType: joi_1.default.string().required(),
    streaming: joi_1.default.object({
        input: joi_1.default.boolean().optional(),
        output: joi_1.default.boolean().optional(),
    }).optional(),
});
const serviceSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    methods: joi_1.default.array().items(serviceMethodSchema).required(),
});
const messageSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    fields: joi_1.default.array().items(fieldSchema).required(),
    nestedMessages: joi_1.default.array().items(joi_1.default.link('#messageSchema')).optional(),
    nestedEnums: joi_1.default.array().items(enumSchema).optional(),
}).id('messageSchema');
const protoFileDataSchema = joi_1.default.object({
    syntax: joi_1.default.string().valid('proto2', 'proto3').required(),
    package: joi_1.default.string().allow('').optional(),
    imports: joi_1.default.array().items(joi_1.default.string()).default([]),
    messages: joi_1.default.array().items(messageSchema).default([]),
    enums: joi_1.default.array().items(enumSchema).default([]),
    services: joi_1.default.array().items(serviceSchema).default([]),
});
const jsonSchemaPropertySchema = joi_1.default.object({
    type: joi_1.default.string().valid('string', 'number', 'integer', 'boolean', 'object', 'array').required(),
    pattern: joi_1.default.string().optional(),
    minimum: joi_1.default.number().optional(),
    maximum: joi_1.default.number().optional(),
    enum: joi_1.default.array().items(joi_1.default.any()).optional(),
    properties: joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.link('#jsonSchemaPropertySchema')).optional(),
    required: joi_1.default.array().items(joi_1.default.string()).optional(),
    items: joi_1.default.link('#jsonSchemaPropertySchema').optional(),
}).id('jsonSchemaPropertySchema');
const jsonSchemaDataSchema = joi_1.default.object({
    title: joi_1.default.string().required(),
    type: joi_1.default.string().valid('object').required(),
    properties: joi_1.default.object().pattern(joi_1.default.string(), jsonSchemaPropertySchema).required(),
    required: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.createSpecSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(255).required(),
    version: joi_1.default.string().max(50).optional(),
    description: joi_1.default.string().max(1000).allow('').optional(),
    spec_type: joi_1.default.string().valid('protobuf', 'json').default('protobuf'),
    spec_data: joi_1.default.alternatives()
        .try(protoFileDataSchema, jsonSchemaDataSchema)
        .required(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional(),
    team_id: joi_1.default.string()
        .guid({ version: ['uuidv4', 'uuidv5'] })
        .allow(null)
        .optional(),
    device_name: joi_1.default.string().max(255).allow(null).optional(),
    protocols: joi_1.default.array().items(joi_1.default.string().max(100)).optional(),
    document_status: joi_1.default.string().max(50).allow(null).optional(),
    for_field: joi_1.default.string().max(255).allow(null).optional(),
});
exports.updateSpecSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(255).optional(),
    version: joi_1.default.string().max(50).optional(),
    description: joi_1.default.string().max(1000).allow('').optional(),
    spec_type: joi_1.default.string().valid('protobuf', 'json').optional(),
    spec_data: joi_1.default.alternatives()
        .try(protoFileDataSchema, jsonSchemaDataSchema)
        .optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional(),
    is_published: joi_1.default.boolean().optional(),
    github_repo_url: joi_1.default.string().uri().allow(null).optional(),
    github_repo_name: joi_1.default.string().max(255).allow(null).optional(),
    team_id: joi_1.default.string()
        .guid({ version: ['uuidv4', 'uuidv5'] })
        .allow(null)
        .optional(),
});
exports.createMessageTypeSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).required(),
    payload_definition: joi_1.default.string().allow('').optional(),
    json_schema: joi_1.default.object().allow(null).optional(),
});
exports.updateMessageTypeSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).optional(),
    payload_definition: joi_1.default.string().allow('').optional(),
    json_schema: joi_1.default.object().optional(),
});
// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { allowUnknown: false, stripUnknown: true });
        if (error) {
            console.error('Validation error:', error.details);
            console.error('Request body:', JSON.stringify(req.body, null, 2));
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map((detail) => detail.message),
            });
        }
        // Use the validated and cleaned value
        req.body = value;
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map