import axios from "axios";
import { compare, hash } from "bcrypt";
import FormData from "form-data";
import passport from "passport";
import { singletons, authPromise, isRequestInProgress } from "./index";
import model from "./model";
import { Strategy as LocalStrategy } from "passport-local";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { Router } from "express";
import { sign } from "jsonwebtoken";

const SALT_ROUNDS = 12;

const authRequest = async (
  feedTypeName: string,
  id: string,
  secret: string,
  accessTokenUrl: string
) => {
  const formData = new FormData();
  formData.append("grant_type", "client_credentials");

  const response = await axios.post(accessTokenUrl, formData, {
    auth: { username: id, password: secret },
    headers: formData.getHeaders(),
  });

  const accessToken: string | undefined = response.data.access_token;
  if (!accessToken) throw Error("token fail");
  singletons[feedTypeName] = accessToken;
  // LOG
  console.log(`${feedTypeName} oauth completed`);
  return accessToken;
};

export const authSource = async (
  feedTypeName: string,
  id: string,
  secret: string,
  accessTokenUrl: string
) => {
  if (!authPromise[feedTypeName]) {
    // LOG
    console.log(`${feedTypeName} oauth started`);
    authPromise[feedTypeName] = authRequest(
      feedTypeName,
      id,
      secret,
      accessTokenUrl
    );
  }
  const accessToken = await authPromise[feedTypeName];
  // Make sure to delete the saved promise from the object when done.
  delete authPromise[feedTypeName];
  return accessToken;
};

// TODO replace this with express-rate-limit? Would need to either split up
// the /feeds/:feedName route or figure out how to call express-rate-limit outside of middleware,
// since we'd want to support different rate limit params per source type.

export const rateLimit = async (feedTypeName: string, limitMs: number) => {
  // Poll for when to next make request, using the limit.
  while (isRequestInProgress[feedTypeName])
    await new Promise((resolve) => setTimeout(resolve, limitMs));
  // When we do get a chance to make the request, block for everyone else for limit.
  isRequestInProgress[feedTypeName] = true;
  setTimeout(() => {
    isRequestInProgress[feedTypeName] = false;
  }, limitMs);
};

const insertNewAuthDoc = async (
  username: string,
  userId: string,
  password: string
) => {
  const hashed = await hash(password, SALT_ROUNDS);
  return await model.insertAuth(username, userId, hashed);
};

passport.use(
  "signup",
  new LocalStrategy(
    {
      session: false,
    },
    async (username, password, done) => {
      try {
        const newUser = await model.insertUser(username);
        if (!newUser) throw Error("user not created");
        const newAuth = await insertNewAuthDoc(username, newUser._id, password);
        if (!newAuth) throw Error("auth not created");
        done(null, newUser);
      } catch (e) {
        done(e, false);
      }
    }
  )
);
passport.use(
  "login",
  new LocalStrategy({ session: false }, async (username, password, done) => {
    try {
      const existingUser = await model.findUserByUsername(username);
      if (!existingUser) throw Error();
      let existingAuth = await model.findAuthByUserId(existingUser._id);
      if (!existingAuth) {
        // LOG
        console.log("changing password");

        // Reset password is currently done by having the user (1) access their server
        // and manually delete their auth doc, then (2) try to login in again with their new
        // password. We'll capture the new password here and create a new auth doc with it.
        existingAuth = await insertNewAuthDoc(
          username,
          existingUser._id,
          password
        );
      }
      if (!existingAuth || !(await compare(password, existingAuth.hashed)))
        throw Error();
      done(null, existingUser);
    } catch (e) {
      done(e, false);
    }
  })
);
passport.use(
  new JwtStrategy(
    {
      secretOrKey: process.env.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // TODO consider checking issuer and audience too.
    },
    async (payload, done) => {
      try {
        const user = await model.findUserById(payload.id);
        if (!user) done(null, false);
        else done(null, user, { clientId: payload.clientId });
      } catch (e) {
        done(e, false);
      }
    }
  )
);

const authRouter = Router();

// LOG
console.log(
  "Signups",
  process.env.ALLOW_SIGNUPS === "true" ? "enabled" : "disabled"
);

if (process.env.ALLOW_SIGNUPS === "true")
  authRouter.post(
    "/signup",
    passport.authenticate("signup", { session: false }),
    (req, res) => {
      res.json({});
    }
  );
else
  authRouter.post("/signup", (req, res) => {
    res.sendStatus(405);
  });

authRouter.post("/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user) => {
    if (err || !user) return next(Error("login failed"));
    req.logIn(user, { session: false }, (error) => {
      if (error) return next(error);
      const token = sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ user, token });
    });
  })(req, res, next);
});

export default authRouter;
