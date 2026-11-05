import nodemailer from "nodemailer"

import { env } from "../shared/env.js"

export const isPasswordResetEmailConfigured = () =>
	Boolean(env.SMTP_URL && env.MAIL_FROM)

export const sendPasswordResetCode = async (email: string, code: string) => {
	if (!env.SMTP_URL || !env.MAIL_FROM) {
		throw new Error("SMTP settings are not configured.")
	}

	const transporter = nodemailer.createTransport(env.SMTP_URL)
	await transporter.sendMail({
		from: env.MAIL_FROM,
		to: email,
		subject: "Seu código para redefinir a senha do Ritmo",
		text: `Use o código ${code} para redefinir sua senha. Ele expira em 10 minutos. Se você não solicitou a redefinição, ignore este email.`,
	})
}
