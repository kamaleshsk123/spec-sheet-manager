import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Create a new team
export const createTeam = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const ownerId = req.user!.id; // From auth middleware

  if (!name) {
    return res.status(400).json({ success: false, error: 'Team name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the team
    const teamResult = await client.query(
      'INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, ownerId]
    );
    const newTeam = teamResult.rows[0];

    // Add the owner as a member with the 'owner' role
    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [newTeam.id, ownerId, 'owner']
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating team:', error);
    res.status(500).json({ success: false, error: 'Server error while creating team' });
  } finally {
    client.release();
  }
};

// Get all teams for a user
export const getTeams = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const teamsResult = await pool.query(
      'SELECT t.* FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = $1',
      [userId]
    );
    res.json({ success: true, data: teamsResult.rows });
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({ success: false, error: 'Server error while getting teams' });
  }
};

// Invite a member to a team
export const inviteMember = async (req: AuthRequest, res: Response) => {
    const { teamId } = req.params;
    const { email } = req.body;
    const inviterId = req.user!.id;

    if (!email) {
        return res.status(400).json({ success: false, error: 'User email is required' });
    }

    const client = await pool.connect();
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
        await client.query(
            'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING',
            [teamId, userToInviteId, 'member']
        );

        res.status(200).json({ success: true, message: 'User invited to the team successfully' });

    } catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ success: false, error: 'Server error while inviting member' });
    } finally {
        client.release();
    }
};

// Get all members of a specific team
export const getTeamMembers = async (req: AuthRequest, res: Response) => {
    const { teamId } = req.params;
    const userId = req.user!.id;

    try {
        // First, check if the user is a member of the team they're trying to view
        const memberCheck = await pool.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
        if (memberCheck.rowCount === 0) {
            return res.status(403).json({ success: false, error: 'Access denied. You are not a member of this team.' });
        }

        // Fetch all members for that team
        const membersResult = await pool.query(
            'SELECT u.id, u.name, u.email, tm.role FROM users u JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = $1 ORDER BY tm.role, u.name',
            [teamId]
        );

        res.json({ success: true, data: membersResult.rows });
    } catch (error) {
        console.error('Error getting team members:', error);
        res.status(500).json({ success: false, error: 'Server error while getting team members' });
    }
};

// Remove a member from a team
export const removeMember = async (req: AuthRequest, res: Response) => {
  const { teamId, memberId } = req.params;
  const requesterId = req.user!.id;

  if (!memberId) {
    return res.status(400).json({ success: false, error: 'Member ID is required' });
  }

  const client = await pool.connect();
  try {
    // 1. Check if the requester is the owner of the team
    const teamResult = await client.query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
    if (teamResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    const teamOwnerId = teamResult.rows[0].owner_id;
    if (teamOwnerId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Only the team owner can remove members' });
    }

    // 2. Prevent the owner from removing themselves
    if (memberId === teamOwnerId) {
      return res.status(400).json({ success: false, error: 'The team owner cannot be removed' });
    }

    // 3. Remove the member from the team_members table
    const deleteResult = await client.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, memberId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Member not found in this team' });
    }

    res.status(200).json({ success: true, message: 'Member removed from the team successfully' });

  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, error: 'Server error while removing member' });
  } finally {
    client.release();
  }
};

// Delete a team
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.params;
  const requesterId = req.user!.id;

  const client = await pool.connect();
  try {
    // 1. Check if the requester is the owner of the team
    const teamResult = await client.query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
    if (teamResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    const teamOwnerId = teamResult.rows[0].owner_id;
    if (teamOwnerId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Only the team owner can delete the team' });
    }

    // Delete the team
    // ON DELETE CASCADE will handle team_members
    // ON DELETE SET NULL will handle protobuf_specs
    await client.query('DELETE FROM teams WHERE id = $1', [teamId]);

    res.status(200).json({ success: true, message: 'Team deleted successfully' });

  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ success: false, error: 'Server error while deleting team' });
  } finally {
    client.release();
  }
};