import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CreateSpecRequest,
  UpdateSpecRequest,
  ProtobufSpec,
  ApiResponse,
  PaginatedResponse,
  SpecQueryParams,
  SpecVersion,
  ProtoFileData,
} from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { Octokit } from 'octokit';

// Helper function to generate .proto content from spec data
const generateProtoContent = (specData: ProtoFileData): string => {
  if (!specData) {
    return '// No content available';
  }

  let protoContent = `syntax = "${specData.syntax || 'proto3'}";\n\n`;

  if (specData.package) {
    protoContent += `package ${specData.package};\n\n`;
  }

  if (specData.imports && specData.imports.length > 0) {
    for (const importPath of specData.imports) {
      protoContent += `import "${importPath}";\n`;
    }
    protoContent += '\n';
  }

  const generateMessageContent = (message: any, indent: number): string => {
    const spaces = '  '.repeat(indent);
    let content = `${spaces}message ${message.name} {\n`;

    if (message.nestedEnums) {
      for (const nestedEnum of message.nestedEnums) {
        content += `${spaces}  enum ${nestedEnum.name} {\n`;
        for (const value of nestedEnum.values) {
          content += `${spaces}    ${value.name} = ${value.number};\n`;
        }
        content += `${spaces}  }\n\n`;
      }
    }

    if (message.nestedMessages) {
      for (const nestedMessage of message.nestedMessages) {
        content += generateMessageContent(nestedMessage, indent + 1);
      }
    }

    if (message.fields) {
      for (const field of message.fields) {
        const repeated = field.repeated ? 'repeated ' : '';
        const optional = field.optional ? 'optional ' : '';
        content += `${spaces}  ${repeated}${optional}${field.type} ${field.name} = ${field.number};\n`;
      }
    }

    content += `${spaces}}\n\n`;
    return content;
  };

  if (specData.enums && specData.enums.length > 0) {
    for (const enumItem of specData.enums) {
      protoContent += `enum ${enumItem.name} {\n`;
      if (enumItem.values) {
        for (const value of enumItem.values) {
          protoContent += `  ${value.name} = ${value.number};\n`;
        }
      }
      protoContent += '}\n\n';
    }
  }

  if (specData.messages && specData.messages.length > 0) {
    for (const message of specData.messages) {
      protoContent += generateMessageContent(message, 0);
    }
  }

  if (specData.services && specData.services.length > 0) {
    for (const service of specData.services) {
      protoContent += `service ${service.name} {\n`;
      if (service.methods) {
        for (const method of service.methods) {
          const inputStream = method.streaming?.input ? 'stream ' : '';
          const outputStream = method.streaming?.output ? 'stream ' : '';
          protoContent += `  rpc ${method.name}(${inputStream}${method.inputType}) returns (${outputStream}${method.outputType});\n`;
        }
      }
      protoContent += '}\n\n';
    }
  }

  return protoContent;
};

export class SpecController {
  static async createSpec(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        title,
        version = '1.0.0',
        description,
        spec_data,
        tags = [],
      }: CreateSpecRequest = req.body;

      const result = await pool.query(
        `INSERT INTO protobuf_specs (title, version, description, spec_data, created_by, tags) \n         VALUES ($1, $2, $3, $4, $5, $6) \n         RETURNING *`,
        [title, version, description, JSON.stringify(spec_data), userId, tags]
      );

      const spec = result.rows[0];

      // Create initial version
      await pool.query(
        `INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)\n         VALUES ($1, $2, $3, $4)`,
        [spec.id, version, JSON.stringify(spec.spec_data), userId]
      );

      res.status(201).json({
        success: true,
        data: spec,
        message: 'Specification created successfully',
      } as ApiResponse<ProtobufSpec>);
    } catch (error) {
      console.error('Create spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getSpecs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        page = 1,
        limit = 10,
        search,
        tags,
        is_published,
        sort_by = 'created_at',
        sort_order = 'desc',
      }: SpecQueryParams = req.query as any;

      const offset = (page - 1) * Number(limit);
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build where clause based on authentication status
      let whereClause = '';
      if (userId) {
        // If authenticated, filter by the logged-in user
        queryParams.push(userId);
        whereClause = `WHERE ps.created_by = $${paramIndex++}`;
      } else {
        // If not authenticated, only show published specs
        whereClause = 'WHERE ps.is_published = true';
      }

      if (search) {
        whereClause += ` AND to_tsvector('english', ps.title || ' ' || COALESCE(ps.description, '')) @@ plainto_tsquery('english', $${paramIndex++})`;
        queryParams.push(search);
      }
      if (tags && tags.length > 0) {
        whereClause += ` AND ps.tags && $${paramIndex++}`;
        queryParams.push(Array.isArray(tags) ? tags : [tags]);
      }
      if (is_published !== undefined && userId) {
        // Only allow filtering by published status if user is authenticated
        whereClause += ` AND ps.is_published = $${paramIndex++}`;
        queryParams.push(is_published);
      }

      const orderClause = `ORDER BY ps.${sort_by} ${sort_order.toUpperCase()}`;

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM protobuf_specs ps ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get specs with pagination
      const specsQuery = `\n        SELECT \n          ps.*,\n          u.name as created_by_name,\n          u.email as created_by_email\n        FROM protobuf_specs ps\n        LEFT JOIN users u ON ps.created_by = u.id\n        ${whereClause}\n        ${orderClause}\n        LIMIT $${paramIndex++} OFFSET $${paramIndex++}\n      `;

      queryParams.push(Number(limit), offset);
      const specsResult = await pool.query(specsQuery, queryParams);

      const response: PaginatedResponse<ProtobufSpec> = {
        data: specsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };

      res.json({
        success: true,
        data: response,
      } as ApiResponse<PaginatedResponse<ProtobufSpec>>);
    } catch (error) {
      console.error('Get specs error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getSpec(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT \n          ps.*,\n          u.name as created_by_name,\n          u.email as created_by_email\n         FROM protobuf_specs ps\n         LEFT JOIN users u ON ps.created_by = u.id\n         WHERE ps.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found',
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: result.rows[0],
      } as ApiResponse<ProtobufSpec>);
    } catch (error) {
      console.error('Get spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async updateSpec(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData: UpdateSpecRequest = req.body;

      // Check if spec exists and user owns it
      const existingSpec = await pool.query(
        'SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2',
        [id, userId]
      );

      if (existingSpec.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found or access denied',
        } as ApiResponse);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        // Include field if it's not undefined, or if it's a GitHub field (to preserve null values)
        if (value !== undefined || key === 'github_repo_url' || key === 'github_repo_name') {
          console.log(`Including field ${key} with value:`, value);
          if (key === 'spec_data') {
            updateFields.push(`${key} = ${paramIndex}`);
            queryParams.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = ${paramIndex}`);
            queryParams.push(value);
          }
          paramIndex++;
        } else {
          console.log(`Skipping field ${key} with value:`, value);
        }
      });

      updateFields.push(`updated_at = NOW()`);
      queryParams.push(id);

      const updateQuery = `\n        UPDATE protobuf_specs \n        SET ${updateFields.join(
        ', '
      )}\n        WHERE id = ${paramIndex}\n        RETURNING *\n      `;

      const result = await pool.query(updateQuery, queryParams);

      // If version or spec_data changed, create new version
      if (updateData.version || updateData.spec_data) {
        const spec = result.rows[0];
        await pool.query(
          `INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)\n           VALUES ($1, $2, $3, $4)\n           ON CONFLICT (spec_id, version_number) DO NOTHING`,
          [spec.id, spec.version, JSON.stringify(spec.spec_data), userId]
        );
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Specification updated successfully',
      } as ApiResponse<ProtobufSpec>);
    } catch (error) {
      console.error('Update spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async deleteSpec(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await pool.query(
        'DELETE FROM protobuf_specs WHERE id = $1 AND created_by = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found or access denied',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Specification deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getSpecVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT \n          sv.*,\n          u.name as created_by_name\n         FROM spec_versions sv\n         LEFT JOIN users u ON sv.created_by = u.id\n         WHERE sv.spec_id = $1\n         ORDER BY sv.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: result.rows,
      } as ApiResponse<SpecVersion[]>);
    } catch (error) {
      console.error('Get spec versions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async incrementDownloadCount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await pool.query(
        'UPDATE protobuf_specs SET download_count = download_count + 1 WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Download count updated',
      } as ApiResponse);
    } catch (error) {
      console.error('Increment download count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get user's specs count
      const specsCount = await pool.query(
        'SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1',
        [userId]
      );

      // Get published specs count
      const publishedCount = await pool.query(
        'SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1 AND is_published = true',
        [userId]
      );

      // Get total downloads
      const totalDownloads = await pool.query(
        'SELECT SUM(download_count) as total FROM protobuf_specs WHERE created_by = $1',
        [userId]
      );

      // Get recent specs
      const recentSpecs = await pool.query(
        `SELECT id, title, version, created_at, download_count, is_published\n         FROM protobuf_specs \n         WHERE created_by = $1 \n         ORDER BY created_at DESC \n         LIMIT 5`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          totalSpecs: parseInt(specsCount.rows[0].total),
          publishedSpecs: parseInt(publishedCount.rows[0].total),
          totalDownloads: parseInt(totalDownloads.rows[0].total || '0'),
          recentSpecs: recentSpecs.rows,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async publishToGithub(req: AuthRequest, res: Response) {
    try {
      const { id: specId } = req.params;
      const userId = req.user!.id;
      const { repoName, description, isPrivate } = req.body;

      // 1. Fetch user and spec data
      const userResult = await pool.query(
        'SELECT github_access_token, github_username FROM users WHERE id = $1',
        [userId]
      );
      const specResult = await pool.query(
        'SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2',
        [specId, userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (specResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Spec not found or access denied' });
      }

      const user = userResult.rows[0];
      const spec = specResult.rows[0];

      if (!user.github_access_token) {
        return res
          .status(400)
          .json({ success: false, error: 'GitHub account not connected or access token missing.' });
      }

      // 2. Initialize Octokit
      const octokit = new Octokit({ auth: user.github_access_token });

      // 3. Create GitHub repository
      const repo = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: description,
        private: isPrivate,
      });

      // 4. Generate .proto file content
      const protoContent = generateProtoContent(spec.spec_data);

      // 5. Commit the file to the new repository
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: user.github_username,
        repo: repoName,
        path: `${spec.title.replace(/\s+/g, '_')}.proto`,
        message: `feat: Initial commit of ${spec.title} v${spec.version}`,
        content: Buffer.from(protoContent).toString('base64'),
      });

      // 6. Update the spec with GitHub repository information
      await pool.query(
        'UPDATE protobuf_specs SET github_repo_url = $1, github_repo_name = $2, updated_at = NOW() WHERE id = $3',
        [repo.data.html_url, repoName, specId]
      );

      res.status(201).json({
        success: true,
        message: 'Successfully published to GitHub!',
        data: { url: repo.data.html_url },
      });
    } catch (error: any) {
      console.error('GitHub publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async pushToBranch(req: AuthRequest, res: Response) {
    try {
      const { id: specId } = req.params;
      const userId = req.user!.id;
      const { branch = 'main', commitMessage } = req.body;

      // 1. Fetch user and spec data
      const userResult = await pool.query(
        'SELECT github_access_token, github_username FROM users WHERE id = $1',
        [userId]
      );
      const specResult = await pool.query(
        'SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2',
        [specId, userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (specResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Spec not found or access denied' });
      }

      const user = userResult.rows[0];
      const spec = specResult.rows[0];

      // Check if spec has been published to GitHub
      if (!spec.github_repo_url || !spec.github_repo_name) {
        return res.status(400).json({
          success: false,
          error: 'Spec must be published to GitHub first before pushing to branch.',
        });
      }

      if (!user.github_access_token) {
        return res
          .status(400)
          .json({ success: false, error: 'GitHub account not connected or access token missing.' });
      }

      // 2. Initialize Octokit
      const octokit = new Octokit({ auth: user.github_access_token });

      // 3. Generate .proto file content
      const protoContent = generateProtoContent(spec.spec_data);

      // 4. Get the current file content to check if it exists
      let currentFile;
      try {
        currentFile = await octokit.rest.repos.getContent({
          owner: user.github_username,
          repo: spec.github_repo_name,
          path: `${spec.title.replace(/\s+/g, '_')}.proto`,
          ref: branch,
        });
      } catch (error: any) {
        // File doesn't exist, that's okay
        currentFile = null;
      }

      // 5. Create or update the file
      const message = commitMessage || `feat: Update ${spec.title} v${spec.version}`;
      const sha = currentFile?.data?.sha;

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: user.github_username,
        repo: spec.github_repo_name,
        path: `${spec.title.replace(/\s+/g, '_')}.proto`,
        message: message,
        content: Buffer.from(protoContent).toString('base64'),
        sha: sha, // Include SHA if updating existing file
        branch: branch,
      });

      res.status(200).json({
        success: true,
        message: 'Successfully pushed to GitHub branch!',
        data: {
          repo: spec.github_repo_name,
          branch: branch,
          owner: user.github_username,
          url: spec.github_repo_url,
        },
      });
    } catch (error: any) {
      console.error('GitHub push to branch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
