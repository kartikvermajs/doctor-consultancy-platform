const express = require("express");
const Patient = require("../modal/Patient");
const { authenticate, requireRole } = require("../middleware/auth");
const { body } = require("express-validator");
const { computeAgeFromDob } = require("../utils/date");
const validate = require("../middleware/validate");


const router = express.Router();

//Get the profile of patient
router.get(
  "/me",
  authenticate,
  requireRole("patient"), async (req, res) => {
    const doc = await Patient.findById(req.user._id).select(
      "-password -googleId"
    );
    res.ok(doc, "Profile fetched");
  }
);

//update patient profile
router.put("/onboarding/update", authenticate, requireRole("patient"), [
  body("name").optional().notEmpty(),
  body("phone").optional().isString(),
  body("dob").optional().isISO8601(),
  body("gender").optional().isIn(['male', 'female', 'other']),
  body("bloodGroup").optional().isString(),

  body("emergencyContact").optional().isObject(),
  body("emergencyContact.name").optional().isString().notEmpty(),
  body("emergencyContact.phone").optional().isString().notEmpty(),
  body("emergencyContact.relationship").optional().isString().notEmpty(),

  body("medicalHistory").optional().isObject(),
  body("medicalHistory.allergies").optional().isString().notEmpty(),
  body("medicalHistory.currentMedications").optional().isString().notEmpty(),
  body("medicalHistory.chronicConditions").optional().isString().notEmpty(),
],validate ,
   async(req,res) => {
    try {
         const updated = {...req.body};

         if(updated.dob){
            updated.age = computeAgeFromDob(updated.dob)
         }
         delete updated.password;
         updated.isVerified = true; //Mark profile as verified on update
         const doc = await Patient.findByIdAndUpdate(req.user._id,updated, {new:true}).select('-password -googleId');
         res.ok(doc, 'Profile updated')
    } catch (error) {
        res.serverError("updated failed", [error.message])
    }
   }
 );


 module.exports = router;