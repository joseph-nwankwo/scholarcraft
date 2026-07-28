import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { workspaceController } from '../controllers/workspace/workspace.controller'
import { conversationController } from '../controllers/messaging/conversation.controller'
import { messageController } from '../controllers/messaging/message.controller'
import { notificationController } from '../controllers/notification/notification.controller'
import { presenceController } from '../controllers/presence/presence.controller'
import { activityController } from '../controllers/activity/activity.controller'
import { calendarController } from '../controllers/calendar/calendar.controller'

const router = Router()
router.use(authenticate)

// ── Workspaces ─────────────────────────────────────────────────────
router.post('/workspaces', workspaceController.create)
router.get('/workspaces', workspaceController.list)
router.get('/workspaces/:id', workspaceController.get)
router.get('/workspaces/:id/dashboard', workspaceController.getDashboard)
router.patch('/workspaces/:id', workspaceController.update)
router.delete('/workspaces/:id', workspaceController.delete)
router.get('/workspaces/:id/members', workspaceController.getMembers)
router.post('/workspaces/:id/members', workspaceController.addMember)
router.delete('/workspaces/:id/members/:userId', workspaceController.removeMember)
router.patch('/workspaces/:id/members/:userId/role', workspaceController.updateMemberRole)

// ── Conversations ──────────────────────────────────────────────────
router.post('/conversations/direct', conversationController.getOrCreateDirect)
router.post('/conversations/group', conversationController.createGroup)
router.get('/conversations', conversationController.list)
router.get('/conversations/:id', conversationController.get)
router.post('/conversations/:id/read', conversationController.markRead)
router.patch('/conversations/:id/mute', conversationController.mute)
router.patch('/conversations/:id/archive', conversationController.archive)
router.post('/conversations/:id/members', conversationController.addMembers)

// ── Messages ───────────────────────────────────────────────────────
router.post('/messages', messageController.send)
router.get('/messages/:conversationId', messageController.getMessages)
router.patch('/messages/:id', messageController.edit)
router.delete('/messages/:id', messageController.delete)
router.post('/messages/:id/react', messageController.react)
router.post('/messages/:id/pin', messageController.pin)
router.get('/messages/search', messageController.search)

// ── Notifications ──────────────────────────────────────────────────
router.get('/notifications', notificationController.list)
router.get('/notifications/count', notificationController.unreadCount)
router.patch('/notifications/read-all', notificationController.markAllRead)
router.get('/notifications/mentions', notificationController.getMentions)
router.patch('/notifications/:id/read', notificationController.markRead)
router.patch('/notifications/:id/archive', notificationController.archive)
router.patch('/notifications/:id/pin', notificationController.pin)
router.delete('/notifications/:id', notificationController.delete)
router.patch('/notifications/mentions/:id/read', notificationController.markMentionRead)

// ── Presence ───────────────────────────────────────────────────────
router.put('/presence', presenceController.setPresence)
router.get('/presence/:userId', presenceController.getPresence)
router.post('/presence/bulk', presenceController.getBulkPresence)

// ── Activity Feed ──────────────────────────────────────────────────
router.get('/activity', activityController.getInstitutionFeed)
router.get('/activity/workspace/:workspaceId', activityController.getWorkspaceFeed)
router.get('/activity/user/:userId?', activityController.getUserFeed)

// ── Calendar ───────────────────────────────────────────────────────
router.post('/calendar', calendarController.create)
router.get('/calendar', calendarController.list)
router.get('/calendar/upcoming', calendarController.getUpcoming)
router.get('/calendar/:id', calendarController.get)
router.patch('/calendar/:id', calendarController.update)
router.delete('/calendar/:id', calendarController.delete)

export default router
