import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class MessageEnvelopeController {
    static getMessageEnvelopes(req: AuthRequest, res: Response): Promise<void>;
    static createMessageEnvelope(req: AuthRequest, res: Response): Promise<void>;
    static updateMessageEnvelope(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteMessageEnvelope(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=messageEnvelopeController.d.ts.map