import { app } from "./app.js"
import { env } from "./modules/shared/env.js"
import { logger } from "./modules/shared/logger.js"

app.listen(env.SERVER_PORT, () => {
	logger.info(
		{ event: "server.started", host: env.SERVER_HOST, port: env.SERVER_PORT },
		"API server listening",
	)
})
