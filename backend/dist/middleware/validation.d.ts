import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
export declare const createUserSchema: Joi.ObjectSchema<any>;
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const createSpecSchema: Joi.ObjectSchema<any>;
export declare const updateSpecSchema: Joi.ObjectSchema<any>;
export declare const validate: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.d.ts.map