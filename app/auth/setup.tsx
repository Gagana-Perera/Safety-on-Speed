// This is the /auth/setup route.
// It re-exports the Guardian Setup screen so that the OTP flow
// (which redirects to /auth/setup after signup) works correctly.
export { default } from "./addguardians";
