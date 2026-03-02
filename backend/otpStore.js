// In-memory OTP → roomId map
// Populated via the 'register-otp' socket event when a sender sets up a share.
// Does NOT require MongoDB — works for all share types (file, text, guest users).
export const otpRoomMap = new Map();
