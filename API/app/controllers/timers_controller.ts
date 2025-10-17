import type { HttpContext } from '@adonisjs/core/http'
import TimerService from '#services/timer_service'
import { timerStartValidator } from '#validators/timer_start'
import { timerStopValidator } from '#validators/timer_stop'

export default class TimersController {
  private service = new TimerService()

  // POST /timer/start
  public async start({ auth, request, response }: HttpContext) {
    const user = await auth.authenticate()
    const { mode, durationSec, subjectId } = await request.validateUsing(timerStartValidator)

    const result = await this.service.startSession(user.id, { mode, durationSec, subjectId })

    if ('error' in result) {
      if (result.error === 'SUBJECT_REQUIRED') {
        return response.badRequest({ message: 'subjectId is required for STUDY mode' })
      }
      if (result.error === 'SUBJECT_NOT_OWNED') {
        return response.forbidden({ message: 'Subject not found or not owned by user' })
      }
      if (result.error === 'ALREADY_RUNNING') {
        return response.badRequest({ message: 'A session is already running', sessionId: result.sessionId })
      }
      return response.badRequest({ message: 'Unable to start session' })
    }

    return response.ok({
      sessionId: result.session.id,
      serverNow: result.serverNow.toISO(),
      plannedEndAt: result.plannedEndAt.toISO(),
      mode: result.session.mode,
      expectedDurationSec: result.session.expectedDurationSec,
      subjectId: result.session.subjectId,
    })
  }

  // POST /timer/stop
  public async stop({ auth, request, response }: HttpContext) {
    const user = await auth.authenticate()
    const { sessionId } = await request.validateUsing(timerStopValidator)

    const result = await this.service.stopSession(user.id, sessionId)

    if ('error' in result) {
      if (result.error === 'NOT_OWNED_OR_NOT_FOUND') {
        return response.forbidden({ message: 'Session not found or not owned by user' })
      }
      if (result.error === 'NOT_RUNNING') {
        return response.badRequest({ message: 'Session is not running' })
      }
      return response.badRequest({ message: 'Unable to stop session' })
    }

    return response.ok({
      message: 'Session stopped successfully',
      sessionId: result.session.id,
      mode: result.session.mode,
      startedAt: result.session.startedAt.toISO(),
      endedAt: result.session.endedAt?.toISO(),
      actualSeconds: result.actualSeconds,
    })
  }

  // GET /me/sessions
  public async mine({ auth }: HttpContext) {
    const user = await auth.authenticate()
    return this.service.listMine(user.id)
  }
}

