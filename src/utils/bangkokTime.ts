/**
 * Strict Asia/Bangkok (UTC+7 / ICT) Time Engine
 * Ensures 100% time accuracy, daily rollover at 06:00:00 AM Bangkok time,
 * completely immune to client device timezone drift or server container timezone offsets.
 */

export interface BangkokDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, 2=Tuesday, etc.
  formattedTime: string; // "HH:mm:ss"
  formattedDate: string; // "DD/MM/YYYY"
  fullBangkokString: string; // "วันจันทร์ 2 พฤศจิกายน 2569 เวลา 06:10:00 น."
  operationalDate: Date; // Date object pointing to the active operational day
  operationalDateKey: string; // "YYYY-MM-DD" of operational cycle
  isAfter0600: boolean;
  remainingToNext0600: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
}

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/**
 * Parses current instant strictly in Asia/Bangkok (UTC+7)
 */
export function getBangkokTime(referenceDate: Date = new Date()): BangkokDateTime {
  // Format parts in Asia/Bangkok timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hours = parseInt(partMap.hour, 10);
  if (hours === 24) hours = 0; // en-US hour12: false sometimes returns 24 for midnight
  const minutes = parseInt(partMap.minute, 10);
  const seconds = parseInt(partMap.second, 10);

  // Compute Bangkok Date object
  // Create a synthetic UTC date to avoid local browser timezone interference
  const bkkDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const dayOfWeek = bkkDate.getUTCDay();

  // Operational Cycle Cutoff: 06:00:00 AM ICT
  // Before 06:00 (00:00 - 05:59:59) belongs to yesterday's evening matches (settlement window)
  // At 06:00:00 AM, it rolls over to today's new daily pick
  const isAfter0600 = hours >= 6;
  const operationalDate = new Date(Date.UTC(year, month - 1, day));
  if (!isAfter0600) {
    operationalDate.setUTCDate(operationalDate.getUTCDate() - 1);
  }

  const opYear = operationalDate.getUTCFullYear();
  const opMonth = operationalDate.getUTCMonth() + 1;
  const opDay = operationalDate.getUTCDate();
  const operationalDateKey = `${opYear}-${String(opMonth).padStart(2, '0')}-${String(opDay).padStart(2, '0')}`;

  // Calculate remaining time until next 06:00:00 AM in Bangkok
  // Current seconds from midnight Bangkok time:
  const currentSecondsInDay = hours * 3600 + minutes * 60 + seconds;
  const targetSecondsInDay = 6 * 3600; // 06:00:00 AM

  let secondsUntilNext0600 = 0;
  if (currentSecondsInDay < targetSecondsInDay) {
    // Has not reached 06:00 AM today yet
    secondsUntilNext0600 = targetSecondsInDay - currentSecondsInDay;
  } else {
    // Already past 06:00 AM today, next is tomorrow 06:00 AM
    secondsUntilNext0600 = (86400 - currentSecondsInDay) + targetSecondsInDay;
  }

  const remHours = Math.floor(secondsUntilNext0600 / 3600);
  const remMinutes = Math.floor((secondsUntilNext0600 % 3600) / 60);
  const remSeconds = secondsUntilNext0600 % 60;

  const thaiBuddhistYear = year + 543;
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${thaiBuddhistYear}`;
  const fullBangkokString = `วัน${THAI_DAYS[dayOfWeek]}ที่ ${day} ${THAI_MONTHS_FULL[month - 1]} ${thaiBuddhistYear} เวลา ${formattedTime} น. (ICT / UTC+7)`;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dayOfWeek,
    formattedTime,
    formattedDate,
    fullBangkokString,
    operationalDate,
    operationalDateKey,
    isAfter0600,
    remainingToNext0600: {
      hours: remHours,
      minutes: remMinutes,
      seconds: remSeconds,
      totalSeconds: secondsUntilNext0600,
    },
  };
}
