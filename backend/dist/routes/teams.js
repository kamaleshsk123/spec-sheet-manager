"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// @route   POST api/teams
// @desc    Create a new team
// @access  Private
router.post('/', auth_1.authenticateToken, teamController_1.createTeam);
// @route   GET api/teams
// @desc    Get all teams for the current user
// @access  Private
router.get('/', auth_1.authenticateToken, teamController_1.getTeams);
// @route   GET api/teams/:teamId/members
// @desc    Get all members of a team
// @access  Private
router.get('/:teamId/members', auth_1.authenticateToken, teamController_1.getTeamMembers);
// @route   POST api/teams/:teamId/members
// @desc    Invite a user to a team
// @access  Private
router.post('/:teamId/members', auth_1.authenticateToken, teamController_1.inviteMember);
exports.default = router;
//# sourceMappingURL=teams.js.map