import React from 'react';
import {
  Pressable as NativePressable,
  Text as NativeText,
  TextInput as NativeTextInput,
  type PressableProps,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { useOptionalAppPreferences } from '@/context/AppPreferencesContext';
import { getUiLanguage, translateUi } from '@/lib/strings';

function localizedChildren(children: React.ReactNode, language: 'en' | 'ur' | 'ar'): React.ReactNode {
  if (typeof children === 'string') return translateUi(children, language);
  if (Array.isArray(children)) return children.map((child, index) => <React.Fragment key={index}>{localizedChildren(child, language)}</React.Fragment>);
  return children;
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
      style={[{ writingDirection: isRTL ? 'rtl' : 'ltr' }, style]}
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
      style={[{ writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }, style]}
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
