import React from 'react';
import {
  Pressable as NativePressable,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type StyleProp,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { useOptionalAppPreferences } from '@/context/AppPreferencesContext';
import { getUiLanguage, translateUi } from '@/lib/strings';

function localizedChildren(children: React.ReactNode, language: 'en' | 'ur' | 'ar'): React.ReactNode {
  if (typeof children === 'string') return translateUi(children, language);
  if (Array.isArray(children)) return children.map((child, index) => <React.Fragment key={index}>{localizedChildren(child, language)}</React.Fragment>);
  return children;
}

function localizedTypography(style: StyleProp<TextStyle>, direction: 'ltr' | 'rtl'): StyleProp<TextStyle> {
  const flattened = StyleSheet.flatten(style);
  if (!flattened) return { writingDirection: direction, fontFamily: 'Inter_400Regular' };

  if (typeof flattened.fontFamily === 'string' && flattened.fontFamily.length > 0) {
    return [{ writingDirection: direction }, flattened];
  }

  const requestedWeight = flattened.fontWeight;
  const numericWeight = requestedWeight === 'bold'
    ? 700
    : requestedWeight === 'normal'
      ? 400
      : Number(requestedWeight ?? 400);
  const fontFamily = numericWeight >= 600
    ? 'Inter_600SemiBold'
    : numericWeight >= 500
      ? 'Inter_500Medium'
      : 'Inter_400Regular';
  const resolvedStyle: TextStyle = { ...flattened };
  delete resolvedStyle.fontWeight;
  delete resolvedStyle.fontFamily;

  return [{ writingDirection: direction, fontFamily }, resolvedStyle];
}

export function LocalizedText(props: TextProps) {
  const preferences = useOptionalAppPreferences();
  const language = preferences?.preferences.language ?? getUiLanguage();
  const isRTL = preferences?.isRTL ?? false;
  const { children, style, accessibilityLabel, ...rest } = props;
  return (
    <NativeText
      {...rest}
      accessibilityLabel={accessibilityLabel ? translateUi(accessibilityLabel, language) : accessibilityLabel}
      style={localizedTypography(style, isRTL ? 'rtl' : 'ltr')}
    >
      {localizedChildren(children, language)}
    </NativeText>
  );
}

export function LocalizedTextInput(props: TextInputProps) {
  const preferences = useOptionalAppPreferences();
  const language = preferences?.preferences.language ?? getUiLanguage();
  const isRTL = preferences?.isRTL ?? false;
  const { placeholder, accessibilityLabel, style, ...rest } = props;
  return (
    <NativeTextInput
      {...rest}
      placeholder={placeholder ? translateUi(placeholder, language) : placeholder}
      accessibilityLabel={accessibilityLabel ? translateUi(accessibilityLabel, language) : accessibilityLabel}
      style={[
        { textAlign: isRTL ? 'right' : 'left' },
        localizedTypography(style, isRTL ? 'rtl' : 'ltr'),
      ]}
    />
  );
}

export function LocalizedPressable(props: PressableProps) {
  const preferences = useOptionalAppPreferences();
  const language = preferences?.preferences.language ?? getUiLanguage();
  const { accessibilityLabel, accessibilityHint, ...rest } = props;
  return (
    <NativePressable
      {...rest}
      accessibilityLabel={accessibilityLabel ? translateUi(accessibilityLabel, language) : accessibilityLabel}
      accessibilityHint={accessibilityHint ? translateUi(accessibilityHint, language) : accessibilityHint}
    />
  );
}
