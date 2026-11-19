const smtpPort = Number(process.env.SMTP_PORT) || 465;

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  frontendDist: process.env.FRONTEND_DIST || "",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || '"Planazo Soporte" <no-reply@planazo.com>',
  },
};
