import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricInfo = {
  available: boolean;
  name: string;
};

export async function getBiometricInfo(): Promise<BiometricInfo> {
  if (Platform.OS === 'web') {
    return { available: false, name: 'device biometrics' };
  }

  const [hardware, enrolled, types, securityLevel] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);

  const hasFaceRecognition = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasIrisRecognition = types.includes(LocalAuthentication.AuthenticationType.IRIS);
  const name = hasFaceRecognition
    ? Platform.OS === 'ios' ? 'Face ID' : 'face recognition'
    : hasFingerprint
      ? Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint'
      : hasIrisRecognition
        ? 'iris recognition'
        : 'biometrics';

  return {
    available: hardware
      && enrolled
      && types.length > 0
      && (Platform.OS !== 'android' || securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG),
    name,
  };
}

export function authenticateWithBiometrics(promptMessage: string, cancelLabel = 'Cancel') {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: true,
    ...(Platform.OS === 'android' ? { biometricsSecurityLevel: 'strong' as const } : {}),
  });
}