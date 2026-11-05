import { app } from "./app.js"
import { env } from "./modules/shared/env.js"

app.listen(env.SERVER_PORT, () => {
	console.log(`API listening on port ${env.SERVER_PORT}`)
})
