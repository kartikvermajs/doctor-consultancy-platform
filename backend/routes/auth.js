const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const Doctor = require('../modal/Doctor')
const Patient = require('../modal/Patient')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const router = express.Router();


const signToken = (id,type) => 
    jwt.sign({id,type}, process.env.JWT_SECRET, {expiresIn: '7d'});


router.post('/doctor/register',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({min:6}),
    ],
    validate,
    async (req,res) => {
        try {
            const exists = await Doctor.findOne({email: req.body.email});
            if(exists) return res.badRequest("Doctor alredy exists");
            const hashed = await bcrypt.hash(req.body.password,12);
            const doc = await Doctor.create({...req.body, password:hashed});
            const token = signToken(doc._id, 'doctor');
            res.created({token, user: {id:doc._id, type:'doctor'}},'Doctor registered')
        } catch (error) {
            res.serverError('Registration failed', [error.message])
        }
    }
 )


 router.post('/doctor/login',
    [
        body('email').isEmail(),
        body('password').isLength({min:6}),
    ],
    validate,
    async (req,res) => {
        try {
            const doc = await Doctor.findOne({email: req.body.email});
            if(!doc ||  !doc.password) return res.unauthorized("Invalid credentials");
            const match = await bcrypt.compare(req.body.password, doc.password);
            if(!match ) return res.unauthorized("Invalid credentials");
            const token = signToken(doc._id, 'doctor');
            res.created({token, user: {id:doc._id, type:'doctor'}},'Login successful')
        } catch (error) {
            res.serverError('Login failed', [error.message])
        }
    }
 )


 router.post('/patient/register',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({min:6}),
    ],
    validate,
    async (req,res) => {
        try {
            const exists = await Patient.findOne({email: req.body.email});
            if(exists) return res.badRequest("Patient alredy exists");
            const hashed = await bcrypt.hash(req.body.password,12);
            const patient = await Patient.create({...req.body, password:hashed});
            const token = signToken(patient._id, 'patient');
            res.created({token, user: {id:patient._id, type:'patient'}},'Patient registered')
        } catch (error) {
            res.serverError('Registration failed', [error.message])
        }
    }
 )


 router.post('/patient/login',
    [
        body('email').isEmail(),
        body('password').isLength({min:6}),
    ],
    validate,
    async (req,res) => {
        try {
            const patient = await Patient.findOne({email: req.body.email});
            if(!patient ||  !patient.password) return res.unauthorized("Invalid credentials");
            const match = await bcrypt.compare(req.body.password, patient.password);
            if(!match ) return res.unauthorized("Invalid credentials");
            const token = signToken(patient._id, 'patient');
            res.created({token, user: {id:patient._id, type:'patient'}},'Login successful')
        } catch (error) {
            res.serverError('Login failed', [error.message])
        }
    }
 )



 //Google Outh Start form here


 router.get('/google', (req,res,next) => {
    const userType = req.query.type || 'patient';

    passport.authenticate('google', {
        scope:['profile', 'email'],
        state:userType,
        prompt:'select_account'
    })(req,res,next)
 })



 router.get('/google/callback', 
    passport.authenticate('google', {
        session:false,
        failureRedirect: "/auth/failure"
    }),

    async(req,res) => {
        try {
             const {user,type} = req.user;
             const token = signToken(user._id,type);


             //Redirect to frontend with token
             const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
             const redirectUrl = `${frontendUrl}/auth/success?token=${token}&type=${type}&user=${encodeURIComponent(JSON.stringify({
                id: user._id,
                name: user.name,
                email:user.email,
                profileImage: user.profileImage,
             }))}`;

             res.redirect(redirectUrl)
        } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(e.message)}`)
        }
    }
 )


 //Auth failure
 router.get('/failure', (req,res) => res.badRequest('Google authentication Failed'))


 module.exports = router;