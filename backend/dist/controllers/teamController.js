"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = exports.inviteMember = exports.getTeams = exports.createTeam = void 0;
const database_1 = __importDefault(require("../config/database"));
// Create a new team
const createTeam = async (req, res) => {
    const { name } = req.body;
    const ownerId = req.user.id; // From auth middleware
    if (!name) {
        return res.status(400).json({ success: false, error: 'Team name is required' });
    }
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Create the team
        const teamResult = await client.query('INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING *', [name, ownerId]);
        const newTeam = teamResult.rows[0];
        // Add the owner as a member with the 'owner' role
        await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)', [newTeam.id, ownerId, 'owner']);
        await client.query('COMMIT');
        res.status(201).json({ success: true, data: newTeam });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating team:', error);
        res.status(500).json({ success: false, error: 'Server error while creating team' });
    }
    finally {
        client.release();
    }
};
exports.createTeam = createTeam;
// Get all teams for a user
const getTeams = async (req, res) => {
    const userId = req.user.id;
    try {
        const teamsResult = await database_1.default.query('SELECT t.* FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = $1', [userId]);
        res.json({ success: true, data: teamsResult.rows });
    }
    catch (error) {
        console.error('Error getting teams:', error);
        res.status(500).json({ success: false, error: 'Server error while getting teams' });
    }
};
exports.getTeams = getTeams;
// Invite a member to a team
const inviteMember = async (req, res) => {
    const { teamId } = req.params;
    const { email } = req.body;
    const inviterId = req.user.id;
    if (!email) {
        return res.status(400).json({ success: false, error: 'User email is required' });
    }
    const client = await database_1.default.connect();
    try {
        // 1. Check if the inviter is the owner of the team
        const teamResult = await client.query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        if (teamResult.rows[0].owner_id !== inviterId) {
            return res.status(403).json({ success: false, error: 'Only the team owner can invite members' });
        }
        // 2. Find the user to invite by email
        const userToInviteResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userToInviteResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User with that email not found' });
        }
        const userToInviteId = userToInviteResult.rows[0].id;
        // 3. Add the user to the team_members table
        await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING', [teamId, userToInviteId, 'member']);
        res.status(200).json({ success: true, message: 'User invited to the team successfully' });
    }
    catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ success: false, error: 'Server error while inviting member' });
    }
    finally {
        client.release();
    }
};
exports.inviteMember = inviteMember;
// Get all members of a specific team
const getTeamMembers = async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;
    try {
        // First, check if the user is a member of the team they're trying to view
        const memberCheck = await database_1.default.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
        if (memberCheck.rowCount === 0) {
            return res.status(403).json({ success: false, error: 'Access denied. You are not a member of this team.' });
        }
        // Fetch all members for that team
        const membersResult = await database_1.default.query('SELECT u.id, u.name, u.email, tm.role FROM users u JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = $1 ORDER BY tm.role, u.name', [teamId]);
        res.json({ success: true, data: membersResult.rows });
    }
    catch (error) {
        console.error('Error getting team members:', error);
        res.status(500).json({ success: false, error: 'Server error while getting team members' });
    }
};
exports.getTeamMembers = getTeamMembers;
//# sourceMappingURL=teamController.js.map