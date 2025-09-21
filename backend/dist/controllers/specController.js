"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecController = void 0;
const database_1 = __importDefault(require("../config/database"));
const octokit_1 = require("octokit");
// Helper function to generate .proto content from spec data
const generateProtoContent = (specData) => {
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
    const generateMessageContent = (message, indent) => {
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
class SpecController {
    static async createSpec(req, res) {
        try {
            const userId = req.user.id;
            const { title, version = '1.0.0', description, spec_data, tags = [], } = req.body;
            const result = await database_1.default.query(`INSERT INTO protobuf_specs (title, version, description, spec_data, created_by, tags) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`, [title, version, description, JSON.stringify(spec_data), userId, tags]);
            const spec = result.rows[0];
            // Create initial version
            await database_1.default.query(`INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)
         VALUES ($1, $2, $3, $4)`, [spec.id, version, JSON.stringify(spec_data), userId]);
            res.status(201).json({
                success: true,
                data: spec,
                message: 'Specification created successfully',
            });
        }
        catch (error) {
            console.error('Create spec error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async getSpecs(req, res) {
        try {
            const { page = 1, limit = 10, search, tags, created_by, is_published, sort_by = 'created_at', sort_order = 'desc', } = req.query;
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            // Build WHERE conditions
            if (search) {
                whereConditions.push(`to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', ${paramIndex})`);
                queryParams.push(search);
                paramIndex++;
            }
            if (tags && tags.length > 0) {
                whereConditions.push(`tags && ${paramIndex}`);
                queryParams.push(Array.isArray(tags) ? tags : [tags]);
                paramIndex++;
            }
            if (created_by) {
                whereConditions.push(`created_by = ${paramIndex}`);
                queryParams.push(created_by);
                paramIndex++;
            }
            if (is_published !== undefined) {
                whereConditions.push(`is_published = ${paramIndex}`);
                queryParams.push(is_published);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const orderClause = `ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM protobuf_specs ps
        LEFT JOIN users u ON ps.created_by = u.id
        ${whereClause}
      `;
            const countResult = await database_1.default.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);
            // Get specs with pagination
            const specsQuery = `
  SELECT 
    ps.*,
    u.name as created_by_name,
    u.email as created_by_email
  FROM protobuf_specs ps
  LEFT JOIN users u ON ps.created_by = u.id
  ${whereClause}
  ${orderClause}
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;
            queryParams.push(limit, offset);
            const specsResult = await database_1.default.query(specsQuery, queryParams);
            const response = {
                data: specsResult.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
            res.json({
                success: true,
                data: response,
            });
        }
        catch (error) {
            console.error('Get specs error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async getSpec(req, res) {
        try {
            const { id } = req.params;
            const result = await database_1.default.query(`SELECT 
          ps.*,
          u.name as created_by_name,
          u.email as created_by_email
         FROM protobuf_specs ps
         LEFT JOIN users u ON ps.created_by = u.id
         WHERE ps.id = $1`, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Specification not found',
                });
            }
            res.json({
                success: true,
                data: result.rows[0],
            });
        }
        catch (error) {
            console.error('Get spec error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async updateSpec(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;
            // Check if spec exists and user owns it
            const existingSpec = await database_1.default.query('SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2', [id, userId]);
            if (existingSpec.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Specification not found or access denied',
                });
            }
            // Build update query dynamically
            const updateFields = [];
            const queryParams = [];
            let paramIndex = 1;
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    if (key === 'spec_data') {
                        updateFields.push(`${key} = ${paramIndex}`);
                        queryParams.push(JSON.stringify(value));
                    }
                    else {
                        updateFields.push(`${key} = ${paramIndex}`);
                        queryParams.push(value);
                    }
                    paramIndex++;
                }
            });
            updateFields.push(`updated_at = NOW()`);
            queryParams.push(id);
            const updateQuery = `
        UPDATE protobuf_specs 
        SET ${updateFields.join(', ')}
        WHERE id = ${paramIndex}
        RETURNING *
      `;
            const result = await database_1.default.query(updateQuery, queryParams);
            // If version or spec_data changed, create new version
            if (updateData.version || updateData.spec_data) {
                const spec = result.rows[0];
                await database_1.default.query(`INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (spec_id, version_number) DO NOTHING`, [spec.id, spec.version, JSON.stringify(spec.spec_data), userId]);
            }
            res.json({
                success: true,
                data: result.rows[0],
                message: 'Specification updated successfully',
            });
        }
        catch (error) {
            console.error('Update spec error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async deleteSpec(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const result = await database_1.default.query('DELETE FROM protobuf_specs WHERE id = $1 AND created_by = $2 RETURNING id', [id, userId]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Specification not found or access denied',
                });
            }
            res.json({
                success: true,
                message: 'Specification deleted successfully',
            });
        }
        catch (error) {
            console.error('Delete spec error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async getSpecVersions(req, res) {
        try {
            const { id } = req.params;
            const result = await database_1.default.query(`SELECT 
          sv.*,
          u.name as created_by_name
         FROM spec_versions sv
         LEFT JOIN users u ON sv.created_by = u.id
         WHERE sv.spec_id = $1
         ORDER BY sv.created_at DESC`, [id]);
            res.json({
                success: true,
                data: result.rows,
            });
        }
        catch (error) {
            console.error('Get spec versions error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async incrementDownloadCount(req, res) {
        try {
            const { id } = req.params;
            await database_1.default.query('UPDATE protobuf_specs SET download_count = download_count + 1 WHERE id = $1', [id]);
            res.json({
                success: true,
                message: 'Download count updated',
            });
        }
        catch (error) {
            console.error('Increment download count error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async getDashboardStats(req, res) {
        try {
            const userId = req.user.id;
            // Get user's specs count
            const specsCount = await database_1.default.query('SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1', [userId]);
            // Get published specs count
            const publishedCount = await database_1.default.query('SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1 AND is_published = true', [userId]);
            // Get total downloads
            const totalDownloads = await database_1.default.query('SELECT SUM(download_count) as total FROM protobuf_specs WHERE created_by = $1', [userId]);
            // Get recent specs
            const recentSpecs = await database_1.default.query(`SELECT id, title, version, created_at, download_count, is_published
         FROM protobuf_specs 
         WHERE created_by = $1 
         ORDER BY created_at DESC 
         LIMIT 5`, [userId]);
            res.json({
                success: true,
                data: {
                    totalSpecs: parseInt(specsCount.rows[0].total),
                    publishedSpecs: parseInt(publishedCount.rows[0].total),
                    totalDownloads: parseInt(totalDownloads.rows[0].total || '0'),
                    recentSpecs: recentSpecs.rows,
                },
            });
        }
        catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    static async publishToGithub(req, res) {
        try {
            const { id: specId } = req.params;
            const userId = req.user.id;
            const { repoName, description, isPrivate } = req.body;
            // 1. Fetch user and spec data
            const userResult = await database_1.default.query('SELECT github_access_token, github_username FROM users WHERE id = $1', [userId]);
            const specResult = await database_1.default.query('SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2', [specId, userId]);
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
            const octokit = new octokit_1.Octokit({ auth: user.github_access_token });
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
            res.status(201).json({
                success: true,
                message: 'Successfully published to GitHub!',
                data: { url: repo.data.html_url },
            });
        }
        catch (error) {
            console.error('GitHub publish error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to publish to GitHub.',
            });
        }
    }
}
exports.SpecController = SpecController;
//# sourceMappingURL=specController.js.map