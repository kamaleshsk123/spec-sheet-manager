import { Router } from 'express';
import { createTeam, getTeams, inviteMember, getTeamMembers, removeMember, deleteTeam } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// @route   POST api/teams
// @desc    Create a new team
// @access  Private
router.post('/', authenticateToken, createTeam);

// @route   GET api/teams
// @desc    Get all teams for the current user
// @access  Private
router.get('/', authenticateToken, getTeams);

// @route   DELETE api/teams/:teamId
// @desc    Delete a team
// @access  Private
router.delete('/:teamId', authenticateToken, deleteTeam);

// @route   GET api/teams/:teamId/members
// @desc    Get all members of a team
// @access  Private
router.get('/:teamId/members', authenticateToken, getTeamMembers);

// @route   POST api/teams/:teamId/members
// @desc    Invite a user to a team
// @access  Private
router.post('/:teamId/members', authenticateToken, inviteMember);

// @route   DELETE api/teams/:teamId/members/:memberId
// @desc    Remove a user from a team
// @access  Private
router.delete('/:teamId/members/:memberId', authenticateToken, removeMember);

export default router;