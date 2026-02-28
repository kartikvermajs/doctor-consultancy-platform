const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Patient = require("../modal/Patient");
const Doctor = require("../modal/Doctor");

require("dotenv").config();

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },

    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userType = req.query.state || "patient";

        const { emails, displayName, photos } = profile;
        const email = emails?.[0]?.value;
        const photo = photos?.[0]?.value;

        if (userType === "doctor") {
          let user = await Doctor.findOne({ email });
          if (!user) {
            user = await Doctor.create({
              googleId: profile.id,
              email,
              name: displayName,
              profileImage: photo,
              isVerified: true,
            });
          } else {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.profileImage = photo;
              await user.save();
            }
          }

          return done(null, { user, type: "doctor" });
        } else {
          let user = await Patient.findOne({ email });
          if (!user) {
            user = await Patient.create({
              googleId: profile.id,
              email,
              name: displayName,
              profileImage: photo,
              isVerified: true,
            });
          } else {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.profileImage = photo;
              await user.save();
            }
          }

          return done(null, { user, type: "patient" });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);


module.exports = passport;
