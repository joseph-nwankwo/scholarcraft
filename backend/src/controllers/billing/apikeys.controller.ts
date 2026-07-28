import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { apikeyService } from '../../services/billing/apikey.service'
import { AppError } from '../../utils/errors'

export const apikeysController = {
  list: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const keys = await apikeyService.listAPIKeys(institutionId)
    res.json({ success: true, data: keys })
  }) as RequestHandler,

  generate: asyncHandler(async (req, res) => {
    const { institutionId, userId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { name, scopes } = req.body
    const { rawKey, apiKey } = await apikeyService.generateAPIKey(institutionId, userId, name, scopes)
    res.status(201).json({
      success: true,
      data: apiKey,
      rawKey,
      message: 'Store this key securely — it will not be shown again.',
    })
  }) as RequestHandler,

  revoke: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const result = await apikeyService.revokeAPIKey(req.params.id as string, institutionId)
    res.json({ success: true, data: result })
  }) as RequestHandler,

  rotate: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { rawKey, apiKey } = await apikeyService.rotateAPIKey(req.params.id as string, institutionId)
    res.json({
      success: true,
      data: apiKey,
      rawKey,
      message: 'Store this key securely — it will not be shown again.',
    })
  }) as RequestHandler,
}
