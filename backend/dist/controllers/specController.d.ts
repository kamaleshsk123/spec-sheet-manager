import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class SpecController {
    static createSpec(req: AuthRequest, res: Response): Promise<void>;
    static getSpecs(req: AuthRequest, res: Response): Promise<void>;
    static getSpec(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateSpec(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteSpec(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getSpecVersions(req: Request, res: Response): Promise<void>;
    static incrementDownloadCount(req: Request, res: Response): Promise<void>;
    static getDashboardStats(req: AuthRequest, res: Response): Promise<void>;
    static publishToGithub(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=specController.d.ts.map