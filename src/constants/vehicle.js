/**
 * Vehicle Constants and Thresholds
 */

export const TIRE_PRESSURE = {
  LIMIT_LOW: 2.0,
  LIMIT_HIGH: 3.0,
  CRITICAL_LOW: 1.8,
  UNIT: "Bar",
};

export const TEMPERATURE = {
  LIMIT_HIGH: 45,
  UNIT: "°C",
};

export const BATTERY = {
  LIMIT_LOW: 20,
  LIMIT_CRITICAL: 10,
};

export const GEARS = {
  PARK: "P",
  REVERSE: "R",
  NEUTRAL: "N",
  DRIVE: "D",
  SPORT: "S",
};

export const DEFAULT_LOCATION = {
  LATITUDE: 21.0285,
  LONGITUDE: 105.8542,
};

export const VEHICLE_STATUS_LABELS = {
  TIRES: "Lốp xe",
  DOORS: "Cửa & Khóa",
  WINDOWS: "Cửa kính",
  HANDBRAKE: "Phanh tay",
  SAFETY: "An toàn",
  SERVICE: "Bảo dưỡng",
  FIRMWARE: "Firmware",
  TBOX: "T-Box",
};

export default {
  TIRE_PRESSURE,
  TEMPERATURE,
  BATTERY,
  GEARS,
  DEFAULT_LOCATION,
  VEHICLE_STATUS_LABELS,
};
