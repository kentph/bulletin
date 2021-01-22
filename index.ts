import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import pino from "express-pino-logger";
import passport from "passport";
import path from "path";
import authenticationRoutes from "./auth";
import authedRouterV1 from "./routesV1";
import model from "./model";
import rateLimit from "express-rate-limit";

export const singletons: { [site: string]: any } = {};
export const authPromise: { [site: string]: Promise<string> } = {};
export const isRequestInProgress: { [site: string]: boolean } = {};

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Don't allow access from local url when in production.
if (process.env.NODE_ENV !== "production") {
  app.use(pino());
  app.use(
    cors({
      origin: `${process.env.LOCAL_URL}:${
        process.env.NODE_ENV === "test" ? "4000" : "3000"
      }`,
    })
  );
}
app.use(passport.initialize());

// Support reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)
// for rate limiting.
// NOTE: remove if app directly faces internet, though this isn't recommended.
app.set("trust proxy", 1);

app.use(
  "/api/v1/auth",
  // Will rate limit auth routes by IP. Defaults to 5 requests per minute, and returns 429 otherwise.
  rateLimit({
    message: "Too many auth requests, please try again later.",
  }),
  authenticationRoutes
);

app.use(
  "/api/v1",
  passport.authenticate("jwt", { session: false }),
  authedRouterV1
);

const clientBuildDir =
  process.env.NODE_ENV === "production" ? "../client/build" : "./client/build";

// Serve static files.
app.use(express.static(path.normalize(path.join(__dirname, clientBuildDir))));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, clientBuildDir, "index.html"));
});

// Run latest migrations every time the server is started.
model.migrateToLatest().then(() => {
  // Heroku exposes port on PORT env var.
  const port =
    process.env.NODE_ENV === "test" ? 4001 : process.env.PORT || 3001;
  // Only start listening to requests after running any migrations.
  app.listen(port, async () => {
    // LOG
    console.log(`Express server is running on port ${port}`);
  });
});
