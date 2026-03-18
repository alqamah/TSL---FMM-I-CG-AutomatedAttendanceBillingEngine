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

// const EMPLOYEE_SKILLS = {
//     'VW0123649596': 'High',
//     'RW1011186925': 'High',
//     'RW1019191001': 'High',
//     'RW0911182377': 'High',
//     'VW0123657591': 'High',
//     'RW0305045827': 'High',
//     'RW0403000921': 'High',
//     'RD0918134974': 'High',
//     'RW0807096365': 'High',
//     'RW0608113053': 'High',
//     'RD1203000744': 'High',
//     'VD0722561172': 'High',
//     'RW0916154862': 'High',
//     'RD0721287965': 'High',
//     'RW0218129961': 'Low',
//     'RW0105038642': 'Low',
//     'RW0911183405': 'Low',
//     'RW1103005471': 'Low',
//     'JW0724246971': 'Low',
//     'RS0604000979': 'Low',
//     'RW0822573453': 'Low',
//     'RW0621276455': 'Low',
//     'RW0512133959': 'Low',
//     'RW0623791155': 'Low',
//     'RW0723808557': 'Low',
//     'RW0907097796': 'Medium',
//     'RW1103006020': 'Medium',
//     'RW0204008111': 'Medium',
//     'RW1110162302': 'Medium',
//     'RW1223956402': 'Medium',
//     'RW0611151520': 'Medium'
// };


const employee_details = [
    { sp_no: "VW0123649596", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1011186925", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1019191001", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0911182377", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "VW0123657591", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0305045827", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "RW0403000921", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RD0918134974", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "RW0807096365", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "RW0608113053", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RD1203000744", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "VD0722561172", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "RW0916154862", designation: "helper", skill: "high", allowedShifts: ['W1','A','B'] },
    { sp_no: "RD0721287965", designation: "driver", skill: "high", allowedShifts: ['A','G','C'] },
    { sp_no: "RW0218129961", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0105038642", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0911183405", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1103005471", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "JW0724246971", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RS0604000979", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0822573453", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0621276455", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0512133959", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0623791155", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0723808557", designation: "helper", skill: "low", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0907097796", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1103006020", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0204008111", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1110162302", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW1223956402", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] },
    { sp_no: "RW0611151520", designation: "helper", skill: "medium", allowedShifts: ['W1','A','B'] }
];

const SHIFT_DEFINITIONS = {
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
        totalHours: from calculateHours()        
    }
]
*/