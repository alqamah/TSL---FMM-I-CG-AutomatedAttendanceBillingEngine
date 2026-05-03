/*
08.30-17.30
06.00-14.00
14.00-22.00

Drivers Only
06.00-14.00+(3)=17.00
08.00-17.00+(2)=19.00
19.00+(3)=22.00-06.00
*/

// const DRIVERS = [
//     'RD0721287965',
//     'RD0918134974',
//     'VD0722561172',
//     'RW0305045827',
//     'RD1203000744',
//     'RW0807096365'
// ];


let employee_details = [
    { sp_no: "RW0911182377", name: "SUJIT KR. VISHWAKARMA", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "RD0721287965", name: "NALIN MAHATO", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "RD0918134974", name: "RUPESH KUMAR", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "VD0722561172", name: "LAXMAN BHADUK", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "RW0305045827", name: "RAJU KALINDI", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "RD1203000744", name: "NIPEN CH. SHUKUL", designation: "driver", skill: "highly skilled", allowedShifts: ['A', 'G', 'C'], inOtAllowed: true, outOtAllowed: true },
    { sp_no: "RW0807096365", name: "CHHOTU LOHRA", designation: "supervisor", skill: "highly skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0916154862", name: "SHIV SHANKAR", designation: "electrician", skill: "highly skilled", allowedShifts: ['W1', 'B'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0403000921", name: "MAN MOHAN", designation: "mechanic", skill: "highly skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0608113053", name: "RAJESH PRADHAN", designation: "rigger", skill: "highly skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1011186925", name: "ANIL VERMA", designation: "rigger", skill: "highly skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1019191001", name: "CHITRANJAN SHARMA", designation: "fitter", skill: "highly skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1110162302", name: "CHITRANJAN MAHATO", designation: "welder/gas cutter", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0907097796", name: "ASHOK ROY (Electrician)", designation: "electrician", skill: "skilled", allowedShifts: ['W1', 'B'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1103006020", name: "B N MAHAPATRO", designation: "attender", skill: "skilled", allowedShifts: ['A', 'B', 'C'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0611151520", name: "V RAJA RAO", designation: "helper", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1204027584", name: "BALWINDER SINGH", designation: "rigger", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "VW0123649596", name: "ABHISHEK BIRULI ( FITTER)", designation: "fitter", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "VW0123657591", name: "HINDU BESRA ( FITTER )", designation: "fitter", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1223956402", name: "KARAN KUMAR ( STORE)", designation: "helper", skill: "skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW1103005471", name: "NASIR ALI", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0512133959", name: "SUJIT KUMAR SINGH", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0218129961", name: "APURBA KR MAHATO", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "JW0724246971", name: "NAVEEN KUMAR", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0621276455", name: "SUBHANDU MANDAL", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0822573453", name: "RATAN MAHATO", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0105038642", name: "NANDLAL TIU", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RS0604000979", name: "RAKESH RK SINGH", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0723808557", name: "VISHAL HANSDA", designation: "helper", skill: "semi skilled", allowedShifts: ['W1'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0623791155", name: "TATA VENKAT RAO", designation: "attender", skill: "semi skilled", allowedShifts: ['A', 'B', 'C'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0204008111", name: "BASUDEO", designation: "attender", skill: "semi skilled", allowedShifts: ['A', 'B', 'C'], inOtAllowed: false, outOtAllowed: true },
    { sp_no: "RW0911183405", name: "NARAYAN RAO", designation: "attender", skill: "semi skilled", allowedShifts: ['A', 'B', 'C'], inOtAllowed: false, outOtAllowed: true }
];

let DEFAULT_SHIFT_DEFINITIONS = {
    'A': { shiftIn: '06:00', shiftOut: '14:00' },
    'B': { shiftIn: '14:00', shiftOut: '22:00' },
    'C': { shiftIn: '22:00', shiftOut: '06:00' },
    'W1': { shiftIn: '08:30', shiftOut: '17:30' },
    'G': { shiftIn: '08:00', shiftOut: '17:00' }
};


/*
//EMPLOYEE OBJ:

let employeeData = [
    {
        date: from Uploaded file
        sp_no: from Uploaded file
        name: from Uploaded file
        vendor_name: from Uploaded file
        workorder_no: from Uploaded file
        dept_name: from Uploaded file
        section: from Uploaded file
        skill: from persistent_data
        designation: from persistent_data   
        shiftsAllowed[]: from persistent_data
        shift: after assignShift()
        shiftIn: after assignShift()
        shiftOut: after assignShift()
        punchIn: from Uploaded file
        punchOut: from Uploaded file
        dutyIn: after calculateHours()
        dutyOut: after calculateHours()
        addLunch: from addLunch button/flag
        dutyHours: from calculateHours()
        otHours: from calculateHours()
        otAllowed: {in:boolean, out:boolean}
        totalHours: from calculateHours()        
    }
]
*/
