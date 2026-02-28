const computeAgeFromDob = dob => {
    if(!dob) return null;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear()- 1970)
}



module.exports = {computeAgeFromDob}