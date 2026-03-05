const SHIFT_DEFINITIONS = {
    'A': { shiftIn: '06:00', shiftOut: '14:00' },
    'B': { shiftIn: '14:00', shiftOut: '22:00' },
    'C': { shiftIn: '22:00', shiftOut: '06:00' },
    'W1': { shiftIn: '08:30', shiftOut: '17:30' },
    'G': { shiftIn: '08:00', shiftOut: '17:00' }
};


/*
08.30-17.30
06.00-14.00
14.00-22.00

Drivers Only
06.00-14.00+(3)=17.00
08.00-17.00+(2)=19.00
19.00+(3)=22.00-06.00
*/

const DRIVERS = [
    'RD0721287965',
    'RD0918134974',
    'VD0722561172',
    'RW0305045827',
    'RD1203000744',
    'RW0807096365'
]; 