import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// User validation schemas
export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Protobuf spec validation schemas
const fieldSchema = Joi.object({
  type: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
  name: Joi.string().required(),
  number: Joi.number().integer().min(1).required(),
  repeated: Joi.boolean().optional(),
  optional: Joi.boolean().optional(),
});

const enumValueSchema = Joi.object({
  name: Joi.string().required(),
  number: Joi.number().integer().min(0).required(),
});

const enumSchema = Joi.object({
  name: Joi.string().required(),
  values: Joi.array().items(enumValueSchema).min(1).required(),
});

const serviceMethodSchema = Joi.object({
  name: Joi.string().required(),
  inputType: Joi.string().required(),
  outputType: Joi.string().required(),
  streaming: Joi.object({
    input: Joi.boolean().optional(),
    output: Joi.boolean().optional(),
  }).optional(),
});

const serviceSchema = Joi.object({
  name: Joi.string().required(),
  methods: Joi.array().items(serviceMethodSchema).required(),
});

const messageSchema: Joi.ObjectSchema = Joi.object({
  name: Joi.string().required(),
  fields: Joi.array().items(fieldSchema).required(),
  nestedMessages: Joi.array().items(Joi.link('#messageSchema')).optional(),
  nestedEnums: Joi.array().items(enumSchema).optional(),
}).id('messageSchema');

const protoFileDataSchema = Joi.object({
  syntax: Joi.string().valid('proto2', 'proto3').required(),
  package: Joi.string().allow('').optional(),
  imports: Joi.array().items(Joi.string()).default([]),
  messages: Joi.array().items(messageSchema).default([]),
  enums: Joi.array().items(enumSchema).default([]),
  services: Joi.array().items(serviceSchema).default([]),
});

export const createSpecSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  version: Joi.string().max(50).optional(),
  description: Joi.string().max(1000).optional(),
  spec_data: protoFileDataSchema.required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  team_id: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .allow(null)
    .optional(),
});

export const updateSpecSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  version: Joi.string().max(50).optional(),
  description: Joi.string().max(1000).optional(),
  spec_data: protoFileDataSchema.optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  is_published: Joi.boolean().optional(),
  github_repo_url: Joi.string().uri().allow(null).optional(),
  github_repo_name: Joi.string().max(255).allow(null).optional(),
  team_id: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .allow(null)
    .optional(),
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
