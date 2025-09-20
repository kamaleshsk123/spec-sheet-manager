"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.updateSpecSchema = exports.createSpecSchema = exports.loginSchema = exports.createUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// User validation schemas
exports.createUserSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().min(2).max(100).required(),
    password: joi_1.default.string().min(6).required()
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
// Protobuf spec validation schemas
const fieldSchema = joi_1.default.object({
    type: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    number: joi_1.default.number().integer().min(1).required(),
    repeated: joi_1.default.boolean().optional(),
    optional: joi_1.default.boolean().optional()
});
const enumValueSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    number: joi_1.default.number().integer().min(0).required()
});
const enumSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    values: joi_1.default.array().items(enumValueSchema).min(1).required()
});
const serviceMethodSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    inputType: joi_1.default.string().required(),
    outputType: joi_1.default.string().required(),
    streaming: joi_1.default.object({
        input: joi_1.default.boolean().optional(),
        output: joi_1.default.boolean().optional()
    }).optional()
});
const serviceSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    methods: joi_1.default.array().items(serviceMethodSchema).required()
});
const messageSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    fields: joi_1.default.array().items(fieldSchema).required(),
    nestedMessages: joi_1.default.array().items(joi_1.default.link('#messageSchema')).optional(),
    nestedEnums: joi_1.default.array().items(enumSchema).optional()
}).id('messageSchema');
const protoFileDataSchema = joi_1.default.object({
    syntax: joi_1.default.string().valid('proto2', 'proto3').required(),
    package: joi_1.default.string().optional(),
    imports: joi_1.default.array().items(joi_1.default.string()).required(),
    messages: joi_1.default.array().items(messageSchema).required(),
    enums: joi_1.default.array().items(enumSchema).required(),
    services: joi_1.default.array().items(serviceSchema).required()
});
exports.createSpecSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(255).required(),
    version: joi_1.default.string().max(50).optional(),
    description: joi_1.default.string().max(1000).optional(),
    spec_data: protoFileDataSchema.required(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional()
});
exports.updateSpecSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(255).optional(),
    version: joi_1.default.string().max(50).optional(),
    description: joi_1.default.string().max(1000).optional(),
    spec_data: protoFileDataSchema.optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional(),
    is_published: joi_1.default.boolean().optional()
});
// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
        }
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map