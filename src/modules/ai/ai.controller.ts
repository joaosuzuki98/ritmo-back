import type { Request, Response } from "express"

import { chatRequestSchema } from "./ai.schemas.js"
import { aiService } from "./ai.service.js"

const chat = async (request: Request, response: Response) => {
	const input = chatRequestSchema.parse(request.body)
	const result = await aiService.chat(input)
	response.json(result)
}

export { chat }
