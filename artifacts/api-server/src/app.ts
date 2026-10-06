import express, { type Express, type Request } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({
  verify(req, _res, buffer) {
    (req as Request & { rawJsonBody?: Buffer }).rawJsonBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

export default app;
