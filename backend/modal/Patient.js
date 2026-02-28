const mongoose  = require("mongoose");
const { computeAgeFromDob } = require("../utils/date");
const emergencyContactSchema = new mongoose.Schema({
    name: {type:String, required:true},
    phone: {type:String, required:true},
    relationship: {type:String,required:true},
},{_id:false})

const medicalHistorySchema = new mongoose.Schema({
    allergies: {type: String, default: ''},
    currentMedications: {type:String, default:''},
    chronicConditions: {type:String, default:''},
},{_id:false})

const pateintSchema = new mongoose.Schema({
    name: {type:String, required:true},
    email : {type:String,required:true,unique:true},
    password: {type:String},
    googleId: {type:String,unique:true,sparse:true},
    profileImage: {type:String, default:''},

    phone : {type:String},
    dob: {type:Date},
   age: {type:Number},
   gender: {type:String , enum: ['male', 'female', 'other']},
   bloodGroup: {type:String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },


   emergencyContact: emergencyContactSchema,
   medicalHistory: medicalHistorySchema,


isVerified: {type:Boolean, default:false},
isActive: {type:Boolean, default:true},
},{timestamps:true});


pateintSchema.pre('save', function(next){
    if(this.dob && this.isModified('dob')){
        this.age = computeAgeFromDob(this.dob);
    }
    next ();
})


module.exports = mongoose.model('Patient', pateintSchema);