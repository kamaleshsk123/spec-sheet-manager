import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class MessageTypeController {
    static getMessageTypes(req: Request, res: Response): Promise<void>;
    static createMessageType(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateMessageType(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteMessageType(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=messageTypeController.d.ts.map