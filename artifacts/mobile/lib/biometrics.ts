import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricInfo = {
  available: boolean;
  name: string;
  reason?: string;
};

export async function getBiometricInfo(): Promise<BiometricInfo> {
  if (Platform.OS === 'web') {
    return {
      available: false,
      name: 'device biometrics',
      reason: 'Biometric sign-in is available in the installed iOS or Android app, not in the browser.',
    };
  }

  try {
    const [hardware, enrolled, types, securityLevel] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    const hasFaceRecognition = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasIrisRecognition = types.includes(LocalAuthentication.AuthenticationType.IRIS);
    const hasStrongAndroidBiometrics = Platform.OS === 'android'
      && securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
    const name = hasStrongAndroidBiometrics && hasFingerprint
      ? 'fingerprint'
      : hasFaceRecognition
      ? Platform.OS === 'ios' ? 'Face ID' : 'face recognition'
      : hasFingerprint
        ? Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint'
        : hasIrisRecognition
          ? 'iris recognition'
          : 'biometrics';

    if (Platform.OS === 'ios' && isRunningInExpoGo() && name === 'Face ID') {
      return {
        available: false,
        name,
        reason: 'Face ID needs the installed OG Exports app with its Face ID permission. It cannot be enabled in Expo Go.',
      };
    }
    if (!hardware || types.length === 0) {
      return { available: false, name, reason: 'This device does not provide biometric hardware supported by the app.' };
    }
    if (!enrolled) {
      return { available: false, name, reason: `Set up ${name} in your device settings before enabling biometric sign-in.` };
    }
    if (Platform.OS === 'android' && securityLevel !== LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      return {
        available: false,
        name,
        reason: 'Android reports that this biometric does not meet the strong security level required to unlock your saved account session. Set up a strong biometric, such as an eligible fingerprint, in device settings.',
      };
    }

    return { available: true, name };
  } catch {
    return {
      available: false,
      name: 'biometrics',
      reason: 'The app could not check this device’s biometric capability. Close and reopen the installed mobile app, then try again.',
    };
  }
}

export function authenticateWithBiometrics(promptMessage: string, cancelLabel = 'Cancel') {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: true,
    ...(Platform.OS === 'android' ? { biometricsSecurityLevel: 'strong' as const } : {}),
  });
}