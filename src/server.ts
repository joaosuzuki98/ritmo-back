const { env } = require("./modules/shared/env") as {
	env: {
		SERVER_PORT: number
	}
}

const { app } = require("./app") as { app: import("express").Express }

app.listen(env.SERVER_PORT, () => {
	console.log(`API listening on port ${env.SERVER_PORT}`)
})
